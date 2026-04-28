import { FrameError } from './auth';
import { readImageSize } from './image-metadata';
import type { CosGateway, CosImageObject, CosObjectSummary, WorkerConfig } from './types';

const SIGN_VALID_SECONDS = 3600;

function encodeCos(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function toHex(data: ArrayBuffer): string {
  return [...new Uint8Array(data)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return toHex(digest);
}

async function hmacSha1Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return toHex(signature);
}

async function buildCosAuthorization(config: WorkerConfig, method: string, pathname: string, headers: Map<string, string>, query: URLSearchParams, now: Date): Promise<string> {
  const start = Math.floor(now.getTime() / 1000);
  const end = start + SIGN_VALID_SECONDS;
  const keyTime = `${start};${end}`;
  const signKey = await hmacSha1Hex(config.cosSecretKey, keyTime);
  const headerEntries = [...headers.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const headerList = headerEntries.map(([key]) => key).join(';');
  const httpHeaders = headerEntries.map(([key, value]) => `${encodeCos(key)}=${encodeCos(value)}`).join('&');
  const queryEntries = [...query.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const paramList = queryEntries.map(([key]) => key.toLowerCase()).join(';');
  const httpParameters = queryEntries.map(([key, value]) => `${encodeCos(key.toLowerCase())}=${encodeCos(value)}`).join('&');
  const httpString = `${method.toLowerCase()}
${pathname}
${httpParameters}
${httpHeaders}
`;
  const stringToSign = `sha1
${keyTime}
${await sha1Hex(httpString)}
`;
  const signature = await hmacSha1Hex(signKey, stringToSign);
  return `q-sign-algorithm=sha1&q-ak=${config.cosSecretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=${headerList}&q-url-param-list=${paramList}&q-signature=${signature}`;
}

function decodeXml(value: string): string {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function parseListXml(xml: string): { objects: CosObjectSummary[]; nextContinuationToken?: string } {
  const objects = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map((match) => {
    const block = match[1];
    const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1] ?? '';
    const lastModified = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1];
    const sizeRaw = block.match(/<Size>(\d+)<\/Size>/)?.[1];
    return { key: decodeXml(key), updatedAt: lastModified, size: sizeRaw ? Number(sizeRaw) : undefined };
  }).filter((item) => item.key);
  const nextContinuationToken = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1];
  return { objects, nextContinuationToken: nextContinuationToken ? decodeXml(nextContinuationToken) : undefined };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    throw new FrameError('REQUEST_FAILED', error instanceof Error ? error.message : 'COS request failed');
  } finally {
    clearTimeout(timer);
  }
}

async function cosRequest(config: WorkerConfig, method: string, url: URL, contentType = ''): Promise<Response> {
  const date = new Date();
  const headers = new Map<string, string>([['date', date.toUTCString()], ['host', url.host]]);
  if (contentType) headers.set('content-type', contentType);
  const authorization = await buildCosAuthorization(config, method, url.pathname, headers, url.searchParams, date);
  return fetchWithTimeout(url.toString(), {
    method,
    headers: {
      Authorization: authorization,
      Date: headers.get('date')!,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    },
  }, config.requestTimeoutMs);
}

export class TencentCosGateway implements CosGateway {
  constructor(private readonly config: WorkerConfig) {}

  async objectExists(key: string) {
    const url = new URL(`${this.config.cosBaseUrl.replace(/\/+$/, '')}/${key}`);
    const response = await cosRequest(this.config, 'HEAD', url);
    if (response.status === 404) return false;
    if (!response.ok) throw new FrameError('REQUEST_FAILED', `COS HEAD failed with status ${response.status}`);
    return true;
  }

  async listImages(prefix: string): Promise<CosImageObject[]> {
    const objects: CosObjectSummary[] = [];
    let continuationToken: string | undefined;
    do {
      const url = new URL(this.config.cosBaseUrl.replace(/\/+$/, '') + '/');
      url.searchParams.set('list-type', '2');
      url.searchParams.set('prefix', prefix.endsWith('/') ? prefix : `${prefix}/`);
      url.searchParams.set('max-keys', '1000');
      if (continuationToken) url.searchParams.set('continuation-token', continuationToken);
      const response = await cosRequest(this.config, 'GET', url);
      if (!response.ok) {
        throw new FrameError('REQUEST_FAILED', `COS list failed with status ${response.status}`);
      }
      const parsed = parseListXml(await response.text());
      objects.push(...parsed.objects);
      continuationToken = parsed.nextContinuationToken;
    } while (continuationToken);

    const images = await Promise.all(objects.filter((item) => /\.(png|jpe?g|webp)$/i.test(item.key)).map(async (item) => {
      const url = new URL(`${this.config.cosBaseUrl.replace(/\/+$/, '')}/${item.key}`);
      const response = await cosRequest(this.config, 'GET', url);
      if (!response.ok) throw new FrameError('REQUEST_FAILED', `Image read failed with status ${response.status}`);
      const metadata = readImageSize(await response.arrayBuffer());
      return {
        key: item.key,
        updatedAt: item.updatedAt ?? new Date(0).toISOString(),
        width: metadata.width,
        height: metadata.height,
        url: url.toString(),
      };
    }));

    return images;
  }
}

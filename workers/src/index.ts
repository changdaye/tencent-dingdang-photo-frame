import { FrameError, assertAuthorized } from './auth';
import { assertCosConfigured, parseConfig } from './config';
import { TencentCosGateway } from './cos';
import { resolveLatestFrame } from './frame-service';
import type { Env, FrameRequestBody, FrameResponse } from './types';
import { signImagePath, verifyImageSignature } from './url-signing';

function json(body: FrameResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function badRequest(message: string) {
  return json({ ok: false, code: 'BAD_REQUEST', message }, 400);
}

function buildImageUrl(request: Request, username: string, key: string, updatedAt: string, signature: string) {
  const url = new URL(request.url);
  url.pathname = '/image';
  url.search = '';
  url.searchParams.set('u', username);
  url.searchParams.set('k', key);
  url.searchParams.set('t', updatedAt);
  url.searchParams.set('sig', signature);
  return url.toString();
}

async function handleFrameRequest(request: Request, env: Env): Promise<Response> {
  let body: FrameRequestBody;
  try {
    body = (await request.json()) as FrameRequestBody;
  } catch {
    return badRequest('Request body must be valid JSON');
  }

  const username = body.username?.trim();
  const password = body.password?.trim();
  if (!username || !password) {
    return badRequest('username and password are required');
  }

  const config = parseConfig(env);
  assertCosConfigured(config);
  const cos = new TencentCosGateway(config);
  await assertAuthorized(username, password, cos, config.passwordFileSuffix);
  const frame = await resolveLatestFrame(username, cos);
  const sig = await signImagePath(config, username, frame.key, frame.updatedAt);
  return json({ ok: true, imageUrl: buildImageUrl(request, username, frame.key, frame.updatedAt, sig), updatedAt: frame.updatedAt });
}

async function handleImageRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const username = url.searchParams.get('u')?.trim();
  const key = url.searchParams.get('k')?.trim();
  const updatedAt = url.searchParams.get('t')?.trim();
  const sig = url.searchParams.get('sig')?.trim();
  if (!username || !key || !updatedAt || !sig) {
    return badRequest('missing image parameters');
  }

  const config = parseConfig(env);
  assertCosConfigured(config);
  const isValid = await verifyImageSignature(config, username, key, updatedAt, sig);
  if (!isValid) {
    return json({ ok: false, code: 'AUTH_FAILED', message: 'invalid image signature' }, 401);
  }

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const cos = new TencentCosGateway(config);
  const imageResponse = await cos.fetchObject(key);
  if (!imageResponse.ok) {
    throw new FrameError('REQUEST_FAILED', `COS image fetch failed with status ${imageResponse.status}`);
  }

  const headers = new Headers(imageResponse.headers);
  headers.set('cache-control', 'public, max-age=86400, s-maxage=86400');
  headers.set('x-frame-origin', 'cf-worker-proxy');
  const response = new Response(imageResponse.body, { status: imageResponse.status, headers });
  await cache.put(cacheKey, response.clone());
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/frame') {
        if (request.method !== 'POST') {
          return json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST /frame' }, 405);
        }
        return await handleFrameRequest(request, env);
      }

      if (url.pathname === '/image') {
        if (request.method !== 'GET') {
          return json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use GET /image' }, 405);
        }
        return await handleImageRequest(request, env);
      }

      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
      }

      return new Response('Not found', { status: 404 });
    } catch (error) {
      if (error instanceof FrameError) {
        const status = error.code === 'AUTH_FAILED' ? 401 : error.code === 'NO_IMAGE' ? 404 : 502;
        return json({ ok: false, code: error.code, message: error.message }, status);
      }
      return json({ ok: false, code: 'INVALID_RESPONSE', message: error instanceof Error ? error.message : 'Unexpected server error' }, 500);
    }
  },
};

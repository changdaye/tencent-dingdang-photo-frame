import { FrameError } from './auth';
import type { CosGateway, CosImageObject, Env } from './types';
import { readImageSize } from './image-metadata';

function xmlText(node: Element, tagName: string) {
  return node.getElementsByTagName(tagName)[0]?.textContent?.trim() ?? '';
}

export class HttpCosGateway implements CosGateway {
  constructor(private readonly env: Env) {}

  async objectExists(key: string) {
    const response = await fetch(`${this.env.COS_BUCKET_BASE_URL}/${key}`, { method: 'HEAD' });
    if (response.status === 404) return false;
    if (!response.ok) throw new FrameError('REQUEST_FAILED', `COS HEAD failed with status ${response.status}`);
    return true;
  }

  async listImages(prefix: string): Promise<CosImageObject[]> {
    const response = await fetch(`${this.env.COS_BUCKET_BASE_URL}/?prefix=${encodeURIComponent(prefix)}`);
    if (!response.ok) {
      throw new FrameError('REQUEST_FAILED', `COS list failed with status ${response.status}`);
    }

    const xml = await response.text();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const contents = Array.from(doc.getElementsByTagName('Contents'));

    const images = await Promise.all(
      contents
        .map((content) => ({
          key: xmlText(content, 'Key'),
          updatedAt: xmlText(content, 'LastModified'),
        }))
        .filter((item) => /\.(png|jpe?g|webp)$/i.test(item.key))
        .map(async (item) => {
          const url = `${this.env.COS_BUCKET_BASE_URL}/${item.key}`;
          const sizeResponse = await fetch(url, {
            headers: { Range: 'bytes=0-65535' },
          });
          if (!sizeResponse.ok && sizeResponse.status !== 206) {
            throw new FrameError('REQUEST_FAILED', `Image metadata fetch failed for ${item.key}`);
          }
          const metadata = readImageSize(await sizeResponse.arrayBuffer());
          return {
            key: item.key,
            updatedAt: item.updatedAt,
            width: metadata.width,
            height: metadata.height,
            url,
          };
        }),
    );

    return images;
  }
}

import { FrameError } from './auth';
import type { CosGateway, CosImageObject } from './types';

export function isEligibleImage(image: Pick<CosImageObject, 'width' | 'height'>) {
  return image.width > 1280 && image.height > 800;
}

export function pickLatestEligibleImage(objects: CosImageObject[]) {
  return [...objects]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .find((object) => isEligibleImage(object));
}

export async function resolveLatestFrame(username: string, cos: CosGateway) {
  const image = pickLatestEligibleImage(await cos.listImages(`${username}/`));
  if (!image) {
    throw new FrameError('NO_IMAGE', 'No eligible image found');
  }

  return {
    ok: true as const,
    imageUrl: image.url,
    updatedAt: image.updatedAt,
  };
}

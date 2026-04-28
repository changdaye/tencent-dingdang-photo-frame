import { describe, expect, it } from 'vitest';
import { isEligibleImage, pickLatestEligibleImage } from '../src/frame-service';

describe('frame selection', () => {
  it('applies the strict resolution threshold', () => {
    expect(isEligibleImage({ width: 1281, height: 801 })).toBe(true);
    expect(isEligibleImage({ width: 1280, height: 801 })).toBe(false);
    expect(isEligibleImage({ width: 1281, height: 800 })).toBe(false);
  });

  it('skips newer but undersized images and returns the newest eligible image', () => {
    const objects = [
      { key: 'user/a.jpg', updatedAt: '2026-04-28T10:00:00Z', width: 1200, height: 700, url: 'a' },
      { key: 'user/b.jpg', updatedAt: '2026-04-28T09:00:00Z', width: 1600, height: 900, url: 'b' },
    ];
    const result = pickLatestEligibleImage(objects);
    expect(result?.key).toBe('user/b.jpg');
  });
});

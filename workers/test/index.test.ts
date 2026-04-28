import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index';

const env = {
  TENCENT_COS_SECRET_ID: 'sid',
  TENCENT_COS_SECRET_KEY: 'skey',
  TENCENT_COS_BUCKET: 'bucket',
  TENCENT_COS_REGION: 'na-ashburn',
  TENCENT_COS_BASE_URL: 'https://bucket.cos.na-ashburn.myqcloud.com',
  PASSWORD_FILE_SUFFIX: '.txt',
};

describe('worker routes', () => {
  it('serves the browser homepage', async () => {
    const response = await worker.fetch(new Request('https://frame.example.workers.dev/'), env);
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).toContain('叮当电子相框');
    expect(text).toContain('/frame');
  });

  it('rejects unsupported methods on /frame', async () => {
    const request = new Request('https://example.com/frame', { method: 'GET' });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(405);
  });

  it('returns 400 for missing username or password', async () => {
    const request = new Request('https://example.com/frame', {
      method: 'POST',
      body: JSON.stringify({ username: '' }),
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(400);
  });

  it('returns AUTH_FAILED when password marker is missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
    const request = new Request('https://example.com/frame', {
      method: 'POST',
      body: JSON.stringify({ username: 'phone', password: 'phone123' }),
    });
    const response = await worker.fetch(request, env);
    const body = await response.json() as any;
    expect(response.status).toBe(401);
    expect(body).toMatchObject({ ok: false, code: 'AUTH_FAILED' });
    fetchSpy.mockRestore();
  });

  it('returns a cloudflare image URL instead of the COS origin URL', async () => {
    const png = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,5,120,0,0,3,132,8,2,0,0,0]);
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(`<?xml version="1.0"?><ListBucketResult><Contents><Key>phone/a.png</Key><LastModified>2026-04-28T03:18:21.000Z</LastModified><Size>29</Size></Contents></ListBucketResult>`, { status: 200 }))
      .mockResolvedValueOnce(new Response(png, { status: 200 }));
    const request = new Request('https://frame.example.workers.dev/frame', {
      method: 'POST',
      body: JSON.stringify({ username: 'phone', password: 'phone123' }),
    });
    const response = await worker.fetch(request, env);
    const body = await response.json() as any;
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.imageUrl).toContain('https://frame.example.workers.dev/image?');
    expect(body.imageUrl).not.toContain('myqcloud.com');
    fetchSpy.mockRestore();
  });
});

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

describe('POST /frame', () => {
  it('rejects unsupported methods', async () => {
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
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body).toMatchObject({ ok: false, code: 'AUTH_FAILED' });
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index';

const env = {
  COS_BUCKET_BASE_URL: 'https://example-bucket.cos.example.com',
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
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 404 }));
    const request = new Request('https://example.com/frame', {
      method: 'POST',
      body: JSON.stringify({ username: 'album-a', password: 'secret' }),
    });
    const response = await worker.fetch(request, env);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body).toMatchObject({ ok: false, code: 'AUTH_FAILED' });
    fetchSpy.mockRestore();
  });
});

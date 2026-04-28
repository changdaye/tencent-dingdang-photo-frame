import { FrameError, assertAuthorized } from './auth';
import { HttpCosGateway } from './cos';
import { resolveLatestFrame } from './frame-service';
import type { Env, FrameRequestBody, FrameResponse } from './types';

function json(body: FrameResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function badRequest(message: string) {
  return json({ ok: false, code: 'BAD_REQUEST', message }, 400);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST /frame' }, 405);
    }

    let body: FrameRequestBody;
    try {
      body = (await request.json()) as FrameRequestBody;
    } catch {
      return badRequest('Request body must be valid JSON');
    }

    if (!body.username?.trim() || !body.password?.trim()) {
      return badRequest('username and password are required');
    }

    try {
      const cos = new HttpCosGateway(env);
      await assertAuthorized(body.username.trim(), body.password.trim(), cos, env.PASSWORD_FILE_SUFFIX ?? '.txt');
      return json(await resolveLatestFrame(body.username.trim(), cos));
    } catch (error) {
      if (error instanceof FrameError) {
        const status = error.code === 'AUTH_FAILED' ? 401 : error.code === 'NO_IMAGE' ? 404 : 502;
        return json({ ok: false, code: error.code, message: error.message }, status);
      }
      return json({ ok: false, code: 'INVALID_RESPONSE', message: 'Unexpected server error' }, 500);
    }
  },
};

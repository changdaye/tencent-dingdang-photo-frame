import { FrameError, assertAuthorized } from './auth';
import { assertCosConfigured, parseConfig } from './config';
import { TencentCosGateway } from './cos';
import { resolveLatestFrame } from './frame-service';
import type { Env, FrameRequestBody, FrameResponse } from './types';
import { signImagePath, verifyImageSignature } from './url-signing';

const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;
const DEFAULT_USERNAME = 'phone';

function json(body: FrameResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
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

function renderHomePage(request: Request) {
  const baseUrl = new URL(request.url).origin;
  return html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Dingdang Frame</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif; background: #000; color: #fff; }
    .app { min-height: 100vh; display: flex; flex-direction: column; }
    .login { margin: auto; width: min(92vw, 720px); padding: 32px; background: rgba(20,20,20,.92); border-radius: 24px; box-shadow: 0 18px 60px rgba(0,0,0,.35); }
    h1 { margin: 0 0 12px; font-size: 42px; }
    .hint { margin: 0 0 24px; color: #b8b8b8; font-size: 20px; line-height: 1.5; }
    label { display:block; margin: 18px 0 10px; font-size: 20px; color:#ddd; }
    input { width: 100%; padding: 18px 20px; border-radius: 16px; border: 1px solid #444; font-size: 24px; color: #fff; background:#111; }
    .actions { display:flex; gap:16px; margin-top: 28px; flex-wrap:wrap; }
    button { border:0; border-radius: 18px; padding: 18px 26px; font-size: 22px; font-weight: 600; cursor: pointer; }
    .primary { background:#4f8cff; color:#fff; }
    .secondary { background:#2a2a2a; color:#fff; }
    .frame { position: fixed; inset:0; display:none; background:#000; }
    .frame.active { display:block; }
    .frame img { width:100%; height:100%; object-fit:cover; background:#000; }
    .overlay { position: fixed; left:24px; right:24px; bottom:24px; display:flex; justify-content:space-between; gap:12px; align-items:end; color:#fff; text-shadow: 0 2px 10px rgba(0,0,0,.8); pointer-events:none; }
    .overlay .card { pointer-events:auto; background: rgba(0,0,0,.45); backdrop-filter: blur(10px); border-radius: 18px; padding: 16px 18px; }
    .status { font-size:18px; color:#d5d5d5; }
    .error { color:#ffb3b3; }
    .tools { display:flex; gap:10px; }
    .tools button { font-size:18px; padding: 12px 18px; }
    .hidden { display:none !important; }
  </style>
</head>
<body>
  <div class="app">
    <section id="login" class="login">
      <h1>叮当电子相框</h1>
      <p class="hint">直接在浏览器里使用。地址固定为当前 Cloudflare 域名，只需要输入用户名和密码即可。</p>
      <label for="username">用户名</label>
      <input id="username" autocomplete="username" placeholder="例如：${DEFAULT_USERNAME}" value="${DEFAULT_USERNAME}">
      <label for="password">密码</label>
      <input id="password" type="password" autocomplete="current-password" placeholder="请输入密码">
      <div class="actions">
        <button class="primary" id="startBtn">开始显示</button>
        <button class="secondary" id="clearBtn">清除保存</button>
      </div>
      <p id="formMessage" class="hint hidden"></p>
    </section>

    <section id="frame" class="frame">
      <img id="frameImage" alt="相框图片">
      <div class="overlay">
        <div class="card">
          <div id="status" class="status">等待加载…</div>
          <div id="updatedAt" class="status"></div>
        </div>
        <div class="tools card">
          <button class="secondary" id="refreshBtn">立即刷新</button>
          <button class="secondary" id="settingsBtn">返回设置</button>
          <button class="primary" id="fullscreenBtn">全屏</button>
        </div>
      </div>
    </section>
  </div>

  <script>
    const STORAGE_KEY = 'dingdang-frame-web-config';
    const FRAME_ENDPOINT = ${JSON.stringify(baseUrl + '/frame')};
    const REFRESH_INTERVAL_MS = ${REFRESH_INTERVAL_MS};
    const loginEl = document.getElementById('login');
    const frameEl = document.getElementById('frame');
    const usernameEl = document.getElementById('username');
    const passwordEl = document.getElementById('password');
    const frameImageEl = document.getElementById('frameImage');
    const statusEl = document.getElementById('status');
    const updatedAtEl = document.getElementById('updatedAt');
    const formMessageEl = document.getElementById('formMessage');
    let refreshTimer = null;
    let currentConfig = null;

    function setFormMessage(message, isError = false) {
      formMessageEl.textContent = message;
      formMessageEl.classList.toggle('hidden', !message);
      formMessageEl.classList.toggle('error', Boolean(message && isError));
    }

    function saveConfig(config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }

    function loadConfig() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      } catch {
        return null;
      }
    }

    function clearConfig() {
      localStorage.removeItem(STORAGE_KEY);
    }

    function showSettings() {
      frameEl.classList.remove('active');
      loginEl.classList.remove('hidden');
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    }

    function showFrame() {
      loginEl.classList.add('hidden');
      frameEl.classList.add('active');
    }

    async function fetchFrame(config) {
      const response = await fetch(FRAME_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(config),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) {
        throw new Error(body.message || '请求失败');
      }
      return body;
    }

    function scheduleRefresh() {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => refreshNow(false), REFRESH_INTERVAL_MS);
    }

    async function refreshNow(manual = true) {
      if (!currentConfig) return;
      try {
        statusEl.textContent = manual ? '正在刷新图片…' : '正在按计划刷新图片…';
        statusEl.classList.remove('error');
        const result = await fetchFrame(currentConfig);
        frameImageEl.src = result.imageUrl + '&_=' + encodeURIComponent(result.updatedAt);
        updatedAtEl.textContent = '最近图片时间：' + new Date(result.updatedAt).toLocaleString();
        statusEl.textContent = manual ? '刷新成功' : '显示中（自动刷新已启用）';
        scheduleRefresh();
      } catch (error) {
        statusEl.textContent = '加载失败：' + (error instanceof Error ? error.message : '未知错误');
        statusEl.classList.add('error');
        scheduleRefresh();
      }
    }

    document.getElementById('startBtn').addEventListener('click', async () => {
      const username = usernameEl.value.trim();
      const password = passwordEl.value.trim();
      if (!username || !password) {
        setFormMessage('请输入用户名和密码。', true);
        return;
      }
      currentConfig = { username, password };
      saveConfig(currentConfig);
      setFormMessage('');
      showFrame();
      await refreshNow(true);
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      clearConfig();
      usernameEl.value = ${JSON.stringify(DEFAULT_USERNAME)};
      passwordEl.value = '';
      setFormMessage('已清除本地保存。');
    });

    document.getElementById('refreshBtn').addEventListener('click', () => refreshNow(true));
    document.getElementById('settingsBtn').addEventListener('click', showSettings);
    document.getElementById('fullscreenBtn').addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        statusEl.textContent = '当前浏览器不支持全屏切换';
        statusEl.classList.add('error');
      }
    });

    const saved = loadConfig();
    if (saved?.username && saved?.password) {
      usernameEl.value = saved.username;
      passwordEl.value = saved.password;
      currentConfig = saved;
      showFrame();
      refreshNow(false);
    }
  </script>
</body>
</html>`);
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
  headers.delete('content-disposition');
  const response = new Response(imageResponse.body, { status: imageResponse.status, headers });
  await cache.put(cacheKey, response.clone());
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return renderHomePage(request);
      }

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

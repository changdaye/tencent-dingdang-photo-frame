# Tencent Dingdang Photo Frame

Turn a flashed Tencent Dingdang device into a browser-first photo appliance.

## Current recommended path

The Dingdang firmware currently blocks reliable APK installation and ADB workflows, so the primary delivery path is the **Volcengine server edition** under `server/` plus the deployment helpers under `deploy/volcengine/`.

Open this URL on the device browser:

- `http://115.191.25.146:18082?name=phone`

Behavior:

- pure full-screen frame page
- startup cache warm-up
- background refresh every 2 hours
- request path reads only cached image results
- `name=<value>` means `username = value` and `password = value`

## Repository layout

- `server/` — current browser-first Python server used for the Volcengine deployment
- `deploy/volcengine/` — helper files for deploying the server edition
- `workers/` — earlier Cloudflare Worker implementation, still kept for reference / future reuse
- `app/` — Android client prototype, currently not the recommended delivery path
- `docs/` — design and planning artifacts

## Development status

- browser-first Volcengine server path is the active delivery lane
- Cloudflare Worker version remains in the repo for reference
- Android client scaffold remains in the repo for future device-native work

## Quick start for local server work

```bash
export TENCENT_COS_SECRET_ID=...
export TENCENT_COS_SECRET_KEY=...
export TENCENT_COS_BUCKET=cloudflare-static-1252612849
export TENCENT_COS_REGION=na-ashburn
export TENCENT_COS_BASE_URL=https://cloudflare-static-1252612849.cos.na-ashburn.myqcloud.com
export PUBLIC_BASE_URL=http://127.0.0.1:18082
export DEFAULT_NAMES=phone
python3 server/app.py
```

## Verification shortcuts

### Server

```bash
python3 -m py_compile server/app.py
curl http://127.0.0.1:18082/health
```

### Worker

```bash
cd workers
npm install
npm test
npm run typecheck
```

### Android

```bash
./gradlew testDebugUnitTest
```

## License

MIT

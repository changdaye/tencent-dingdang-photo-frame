# Tencent Dingdang Photo Frame

Turn a flashed Tencent Dingdang device into a browser-first photo appliance.

## Components

- `app/`: Android TV-style client APK (kept for future device-native use)
- `workers/`: Cloudflare Worker for authentication, latest-image selection, and browser UI
- `docs/`: design and planning artifacts

## Current status

- Approved product spec and implementation plan are checked in
- Cloudflare Worker is deployed on the Apple account and now serves both the API and the browser-first photo frame UI
- Local Worker validation has been exercised against the existing Tencent COS setup with the sample `phone / phone123` folder + password marker
- Android application scaffold and core source files are implemented, but the recommended first-pass delivery is the browser flow because the device browser works while the firmware blocks normal APK install / ADB workflows

## Browser-first usage

Open this URL in the Dingdang device browser:

- `https://tencent-dingdang-photo-frame-apple.5frhvfq5s2.workers.dev`

Then:

- enter the username
- enter the password
- start the frame
- the page will auto-refresh every 2 hours
- the image is still served from the Cloudflare domain rather than exposing the raw Tencent COS URL

## Local development

### Worker

```bash
cd workers
npm install
npm test
npx tsc --noEmit
```

### Android

Prerequisites:

- Java 17+
- Android SDK with API 35 platform

Then run:

```bash
./gradlew testDebugUnitTest
```

## Live Cloudflare endpoint

- Default Worker URL: `https://tencent-dingdang-photo-frame-apple.5frhvfq5s2.workers.dev`

## Repository structure

- `docs/superpowers/specs/2026-04-28-tencent-dingdang-photo-frame-design.md`
- `docs/superpowers/plans/2026-04-28-tencent-dingdang-photo-frame.md`

## License

MIT

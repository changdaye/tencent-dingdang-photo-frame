# Tencent Dingdang Photo Frame

Turn a flashed Tencent Dingdang device into a boot-to-frame Android photo appliance.

## Components

- `app/`: Android TV-style client APK
- `workers/`: Cloudflare Worker for authentication and latest-image selection
- `docs/`: design and planning artifacts

## Current status

- Approved product spec and implementation plan are checked in
- Cloudflare Worker scaffold and tests are implemented
- Android application scaffold and core source files are implemented
- Local Worker validation has been exercised against the existing Tencent COS setup with the sample `phone / phone123` folder + password marker
- Android unit tests run locally with Java 17 and Android SDK command-line tools

## Intended behavior

- First-run local configuration on the device
- Persistent storage of Worker URL, username, and password
- Boot auto-start
- Full-screen image display with crop-to-fill behavior
- Automatic refresh every 2 hours
- Error page for auth, fetch, or no-image failures

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

## Repository structure

- `docs/superpowers/specs/2026-04-28-tencent-dingdang-photo-frame-design.md`
- `docs/superpowers/plans/2026-04-28-tencent-dingdang-photo-frame.md`

## License

MIT

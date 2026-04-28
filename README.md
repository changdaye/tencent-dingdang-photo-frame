# Tencent Dingdang Photo Frame

Turn a flashed Tencent Dingdang device into a boot-to-frame Android photo appliance.

## Project status

This repository currently contains the approved product design and the implementation plan. Code scaffolding will follow in the next phase.

## Planned components

- `app/`: Android TV-style client APK
- `workers/`: Cloudflare Worker for authentication and latest-image selection
- `docs/`: design and planning artifacts

## Current documents

- Spec: `docs/superpowers/specs/2026-04-28-tencent-dingdang-photo-frame-design.md`
- Plan: `docs/superpowers/plans/2026-04-28-tencent-dingdang-photo-frame.md`

## Intended behavior

- First-run local configuration on the device
- Persistent storage of Worker URL, username, and password
- Boot auto-start
- Full-screen image display with crop-to-fill behavior
- Automatic refresh every 2 hours
- Error page for auth, fetch, or no-image failures

## License

MIT

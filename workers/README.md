# Cloudflare Worker

This Worker validates a username/password pair against Tencent COS and returns the latest eligible image URL.

## Environment variables

- `TENCENT_COS_SECRET_ID`
- `TENCENT_COS_SECRET_KEY`
- `TENCENT_COS_BUCKET`
- `TENCENT_COS_REGION`
- `TENCENT_COS_BASE_URL` (optional if bucket + region are present)
- `PASSWORD_FILE_SUFFIX` (optional, defaults to `.txt`)
- `REQUEST_TIMEOUT_MS` (optional, defaults to `20000`)

## Password marker lookup

The Worker currently accepts either of these COS marker layouts:

1. `<username>/<password>.txt`
2. `<password>.txt`

The first match authorizes access to the `<username>/` image folder.


## Public image delivery

The app never needs to see the raw Tencent COS URL. `POST /frame` now returns a signed Cloudflare `GET /image?...` URL, and the Worker fetches the COS object, serves the bytes from the Cloudflare domain, and caches the response at the edge.


## Deploy to the Apple account target

When Apple-account Cloudflare credentials are available locally, deploy with:

```bash
npm run deploy:apple
```

This uses the Wrangler environment `13212266802-apple` and publishes the Worker name `tencent-dingdang-photo-frame-apple`.

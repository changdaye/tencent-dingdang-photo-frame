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

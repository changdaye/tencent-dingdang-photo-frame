# Volcengine server edition

This directory contains a plain Python HTTP server version of the Dingdang browser photo frame for a regular Linux server.

## What it does

- serves a browser-first photo frame page from your server IP
- checks Tencent COS for the configured `name` values
- filters for the latest eligible image (width > 1280 and height > 800)
- writes the selected result into a local cache file on startup and every 2 hours after that
- serves requests from the cache instead of filtering synchronously on every page load
- supports direct browser entry with `?name=<value>` and treats `password = name`

## Required environment variables

- `TENCENT_COS_SECRET_ID`
- `TENCENT_COS_SECRET_KEY`

Recommended / optional:

- `TENCENT_COS_BUCKET` (default `cloudflare-static-1252612849`)
- `TENCENT_COS_REGION` (default `na-ashburn`)
- `TENCENT_COS_BASE_URL` (default derived from bucket + region)
- `PASSWORD_FILE_SUFFIX` (default `.txt`)
- `REQUEST_TIMEOUT_MS` (default `20000`)
- `PORT` (default `18082`)
- `BIND_HOST` (default `0.0.0.0`)
- `PUBLIC_BASE_URL` (for example `http://115.191.25.146:18082`)
- `DEFAULT_NAMES` (comma-separated names to precompute at startup, default `phone`)
- `CACHE_DIR` (default `/root/dingdang-frame-cache`)

## Run locally

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

## Browser usage

Open:

```
http://<server-ip>:18082?name=phone
```

The server treats `username = phone` and `password = phone`, loads the cached image URL, and renders a pure full-screen frame page.

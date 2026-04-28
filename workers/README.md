# Cloudflare Worker

This Worker validates a username/password pair against Tencent COS conventions and returns the latest eligible image URL.

## Expected environment variables

- `COS_BUCKET_BASE_URL`: Public base URL of the COS bucket, for example `https://bucket-name.cos.ap-guangzhou.myqcloud.com`
- `PASSWORD_FILE_SUFFIX` (optional): Password marker suffix, defaults to `.txt`

## Current assumptions

- The bucket can respond to `HEAD /<username>/<password>.txt` for auth-marker existence checks
- The bucket can list objects with `GET /?prefix=<username>/`
- Images are directly readable from the returned object URLs

If the production bucket requires signed listing requests, replace `HttpCosGateway` with a signed adapter while keeping the same `CosGateway` interface.

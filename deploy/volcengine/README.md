# Volcengine deployment helpers

This directory is only the deployment helper surface for the current server-first Dingdang photo frame path.

## Source of truth

- runtime implementation: `server/app.py`
- runtime behavior docs: `server/README.md`

## Files here

- `run.sh` — helper to start the Python server with `.env`
- `stop.sh` — helper to stop the Python server
- `app.py` — deployable copy of `server/app.py` for server upload workflows

## Current production-style URL shape

```text
http://<server-ip>:18082?name=phone
```

## Note

If behavior changes, update `server/app.py` first and then refresh the deploy copy in this directory.

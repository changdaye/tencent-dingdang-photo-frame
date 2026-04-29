#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
set -a
source .env
set +a
nohup python3 app.py > server.log 2>&1 &
echo $! > server.pid
echo "started pid $(cat server.pid)"

#!/usr/bin/env bash
# [DX-DEMO1, DX-CON1] Start the whole toy demo on the Mac in one command: the stack in the lab VM on the toy working copy
# (pinned-read options on), the SSH forwards, and the console server on 127.0.0.1:28580 in the background.
# Pass --reset to start from the untouched toy original, with the example Review type and a few reviews prepared.
#   bash demo/toy/up.sh [--reset]      then open http://127.0.0.1:28580/
#   bash demo/toy/down.sh              stops all of it
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo"
logs=$HOME/Claude/Projects/triplex-db-2/demo-toy/logs
mkdir -p "$logs"
bash demo/server-up.sh --toy "$@" 2>&1 | grep -E '^\[demo\]|^DEMO|rror|pinned'
bash demo/connect.sh --toy
pkill -f "examples/demo-mcp/src/page.ts 28580" 2>/dev/null || true
nohup node examples/demo-mcp/src/page.ts 28580 > "$logs/console.log" 2>&1 &
echo $! > "$logs/console.pid"
for _ in $(seq 20); do curl -fsS -o /dev/null http://127.0.0.1:28580/api/health 2>/dev/null && break; sleep 0.5; done
# A fresh toy (--reset) gets the one worked example a visitor first sees: the Review type and a few reviews.
if [[ " $* " == *" --reset "* ]]; then node examples/demo-mcp/src/seed-example.ts; fi
echo "Console: http://127.0.0.1:28580/   (catalogue: http://127.0.0.1:28580/api/catalogue)"

#!/usr/bin/env bash
# [DX-DEMO1] Start the whole toy demo on the Mac in one command: the stack in the lab VM on the toy working copy, the SSH
# forwards, and the dashboard server in the background. Pass --reset to start from the untouched toy original.
#   bash demo/toy/up.sh [--reset]      then open http://127.0.0.1:28580/
#   bash demo/toy/down.sh              stops all of it
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo"
logs=$HOME/Claude/Projects/triplex-db-2/demo-toy/logs
mkdir -p "$logs"
bash demo/server-up.sh --toy "$@" 2>&1 | grep -E '^\[demo\]|^DEMO|rror'
bash demo/connect.sh --toy
pkill -f "examples/demo-mcp/src/page.ts 28580" 2>/dev/null || true
nohup node examples/demo-mcp/src/page.ts 28580 > "$logs/dashboard.log" 2>&1 &
echo $! > "$logs/dashboard.pid"
for _ in $(seq 20); do curl -fsS -o /dev/null http://127.0.0.1:28580/ 2>/dev/null && break; sleep 0.5; done
echo "Dashboard: http://127.0.0.1:28580/   (subject inspector: http://127.0.0.1:28580/inspector.html)"

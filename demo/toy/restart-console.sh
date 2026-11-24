#!/usr/bin/env bash
# [DX-CON1] Restart only the console server on 127.0.0.1:28580 (after a code change), keeping the toy stack and forwards.
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo"
logs=$HOME/Claude/Projects/triplex-db-2/demo-toy/logs
mkdir -p "$logs"
pid=$logs/console.pid
if [[ -s $pid ]]; then kill "$(cat "$pid")" 2>/dev/null || true; fi
pkill -f "examples/demo-mcp/src/page.ts 28580" 2>/dev/null || true
sleep 0.5
nohup node examples/demo-mcp/src/page.ts 28580 > "$logs/console.log" 2>&1 &
echo $! > "$pid"
for _ in $(seq 20); do curl -fsS -o /dev/null http://127.0.0.1:28580/api/health 2>/dev/null && break; sleep 0.5; done
echo "Console restarted: http://127.0.0.1:28580/"

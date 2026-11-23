#!/usr/bin/env bash
# [DX-DEMO1] Stop the toy demo on the Mac: the dashboard server, the SSH forwards, and the stack in the lab VM (PostgreSQL
# shut down cleanly; the working copy is kept for the next up.sh; add --delete-work to drop it).
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo"
pid=$HOME/Claude/Projects/triplex-db-2/demo-toy/logs/dashboard.pid
if [[ -s $pid ]]; then kill "$(cat "$pid")" 2>/dev/null || true; rm -f "$pid"; fi
pkill -f "examples/demo-mcp/src/page.ts 28580" 2>/dev/null || true
bash demo/disconnect.sh --toy
bash demo/server-down.sh --toy "$@"

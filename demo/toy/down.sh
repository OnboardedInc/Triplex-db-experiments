#!/usr/bin/env bash
# [DX-DEMO1, DX-CON1] Stop the toy demo on the Mac: the console server, the SSH forwards, and the stack in the lab VM (PostgreSQL
# shut down cleanly; the working copy is kept for the next up.sh; add --delete-work to drop it).
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo"
# [DX-INT3] DEMO_TOY_NAME / DEMO_TOY_PORTS stop the second toy of that name (see up.sh); unset, the one toy as before.
port=28580
if [[ -n ${DEMO_TOY_NAME:-} ]]; then
  read -r _ _ port <<< "${DEMO_TOY_PORTS:?}"; [[ $port =~ ^[0-9]+$ && $port != 28580 ]] || exit 2
  export TRIPLEX_DEMO_STATE=$HOME/.triplex-demo/connection-$DEMO_TOY_NAME.json
fi
pid=$HOME/Claude/Projects/triplex-db-2/demo-toy${DEMO_TOY_NAME:+-$DEMO_TOY_NAME}/logs/console.pid
if [[ -s $pid ]]; then kill "$(cat "$pid")" 2>/dev/null || true; rm -f "$pid"; fi
pkill -f "examples/demo-mcp/src/page.ts $port" 2>/dev/null || true
bash demo/disconnect.sh --toy
bash demo/server-down.sh --toy "$@"

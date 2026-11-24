#!/usr/bin/env bash
# [DX-DEMO1, DX-CON1] Start the whole toy demo on the Mac in one command: the stack in the lab VM on the toy working copy
# (pinned-read options on), the SSH forwards, and the console server on 127.0.0.1:28580 in the background.
# Pass --reset to start from the untouched toy original, with the example Review type and a few reviews prepared.
#   bash demo/toy/up.sh [--reset]      then open http://127.0.0.1:28580/
#   bash demo/toy/down.sh              stops all of it
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo"
# [DX-INT3] A second toy beside this one: DEMO_TOY_NAME=<name> DEMO_TOY_PORTS="<write> <read> <console>" (its own working
# copy, state file ~/.triplex-demo/connection-<name>.json and console port; never 28580). Unset: exactly as before.
port=28580
if [[ -n ${DEMO_TOY_NAME:-} ]]; then
  read -r _ _ port <<< "${DEMO_TOY_PORTS:?}"; [[ $port =~ ^[0-9]+$ && $port != 28580 ]] || exit 2
  export TRIPLEX_DEMO_STATE=$HOME/.triplex-demo/connection-$DEMO_TOY_NAME.json
fi
logs=$HOME/Claude/Projects/triplex-db-2/demo-toy${DEMO_TOY_NAME:+-$DEMO_TOY_NAME}/logs
mkdir -p "$logs"
bash demo/server-up.sh --toy "$@" 2>&1 | grep -E '^\[demo\]|^DEMO|rror|pinned'
bash demo/connect.sh --toy
pkill -f "examples/demo-mcp/src/page.ts $port" 2>/dev/null || true
nohup node examples/demo-mcp/src/page.ts $port > "$logs/console.log" 2>&1 &
echo $! > "$logs/console.pid"
for _ in $(seq 20); do curl -fsS -o /dev/null http://127.0.0.1:$port/api/health 2>/dev/null && break; sleep 0.5; done
# A fresh toy (--reset) gets the one worked example a visitor first sees: the Review type and a few reviews.
if [[ " $* " == *" --reset "* ]]; then node examples/demo-mcp/src/seed-example.ts; fi
# [DX-XQ10] With DEMO_CROSS_INDEX=1 (the profile then turns the index on): declare a small set of the demo data's
# attributes and backfill them, so the console's fast answer is visible. Already declared: nothing is written.
if [[ ${DEMO_CROSS_INDEX:-0} == 1 ]]; then node examples/demo-mcp/src/declare-index.ts demo/console/index-declaration.json; fi
echo "Console: http://127.0.0.1:$port/   (catalogue: http://127.0.0.1:$port/api/catalogue)"

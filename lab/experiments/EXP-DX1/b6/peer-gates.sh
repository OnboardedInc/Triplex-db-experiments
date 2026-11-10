#!/usr/bin/env bash
set -euo pipefail
prefix=${1:?prefix}
for layout in legacy lean; do
 export DATOMIC_TEST_LAYOUT=$layout
 node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/record-time-peer.test.ts
 node lab/experiments/EXP-DX1/b6/pause-peer.mjs "$prefix" & pauser=$!
 trap 'kill "$pauser" 2>/dev/null || true; wait "$pauser" 2>/dev/null || true' EXIT
 node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/record-time-peer.test.ts
 kill "$pauser"; wait "$pauser" || true
 trap - EXIT
done

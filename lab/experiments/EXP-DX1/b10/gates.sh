#!/usr/bin/env bash
set -euo pipefail
prefix=${1:?}; mode=${2:-all}
config=lab/experiments/EXP-DX1/b5/vitest.config.ts
if [[ $mode == native ]]; then
 B8_RECENT_TESTS=1 bash lab/experiments/EXP-DX1/b10/native-tests.sh "$prefix"
 exit
fi
if [[ $mode == strict ]]; then
 node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config "$config" packages/datomic/test/strict-order.test.ts
 exit
fi
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B10
node lab/experiments/EXP-DX1/b7/gate-proxy.mjs 8526 8527 "$root/$prefix-ready.json" "$root/$prefix-proxy.json" & proxy=$!
trap 'kill "$proxy" 2>/dev/null || true; wait "$proxy" || true' EXIT
for ((i=0;i<100;i++)); do [[ -s "$root/$prefix-ready.json" ]] && break; sleep 0.1; done
export DATOMIC_GATEWAY_URL=http://127.0.0.1:8536 DATOMIC_URL=http://127.0.0.1:8536 DATOMIC_READ_URLS=http://127.0.0.1:8537
pids=()
if [[ $mode == diff ]]; then
 for start in 0 100 200; do
 DX_B5_SCENARIOS=100 DX_B5_SCENARIO_START=$start node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config "$config" packages/datomic/test/layout-differential.test.ts & pids+=("$!")
 done
else
 for layout in legacy lean; do
 DATOMIC_TEST_LAYOUT=$layout node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config "$config" packages/datomic --exclude '**/layout-differential.test.ts' --exclude '**/strict-order.test.ts' & pids+=("$!")
 done
fi
status=0
for pid in "${pids[@]}"; do wait "$pid" || status=1; done
exit "$status"

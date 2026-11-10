#!/usr/bin/env bash
# [DX-B7] Why: cover the entire unchanged RNG stream in bounded windows, with physical connections capped globally.
# Rejected: independent seeds, a reduced denominator, or a 300-case process extending past the lease.
set -euo pipefail
prefix=${1:?prefix}
[[ $prefix =~ ^tx2-dxb7-[a-z0-9-]+$ ]] || exit 2
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7
node lab/experiments/EXP-DX1/b7/gate-proxy.mjs 8516 8517 "$root/$prefix-proxy-ready.json" "$root/$prefix-proxy.json" & proxy=$!
cleanup(){ kill "$proxy" 2>/dev/null || true; wait "$proxy" || true; }
trap cleanup EXIT
for ((i=0;i<100;i++)); do [[ -s "$root/$prefix-proxy-ready.json" ]] && break; sleep 0.1; done
[[ -s "$root/$prefix-proxy-ready.json" ]]
export DATOMIC_GATEWAY_URL=http://127.0.0.1:8536 DATOMIC_URL=http://127.0.0.1:8536 DATOMIC_READ_URLS=http://127.0.0.1:8537 DATOMIC_TEST_LAYOUT=legacy
pids=()
for first in 0 100 200; do
  DX_B5_SCENARIO_START=$first DX_B5_SCENARIOS=100 node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/layout-differential.test.ts > "$root/$prefix-diff-$first.log" 2>&1 &
  pids+=("$!")
done
status=0
for i in 0 1 2; do
  code=0; wait "${pids[$i]}" || code=$?
  printf '%s\n' "$code" > "$root/$prefix-diff-$((i*100)).exit-code"
  [[ $code == 0 ]] || status=1
done
exit "$status"

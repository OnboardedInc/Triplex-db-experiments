#!/usr/bin/env bash
# [DX-B8] Why: overlap independent scopes within one lease while limiting Mac-to-VM sockets to 64.
# Rejected: lowering logical test concurrency or dropping scenarios.
set -euo pipefail
prefix=${1:?prefix}; mode=${2:?full|diff}
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9
node lab/experiments/EXP-DX1/b7/gate-proxy.mjs 8526 8527 "$root/$prefix-proxy-ready.json" "$root/$prefix-proxy.json" & proxy=$!
cleanup(){ kill "$proxy" 2>/dev/null || true; wait "$proxy" || true; }
trap cleanup EXIT
for ((i=0;i<100;i++)); do [[ -s "$root/$prefix-proxy-ready.json" ]] && break; sleep 0.1; done
[[ -s "$root/$prefix-proxy-ready.json" ]]
export DATOMIC_GATEWAY_URL=http://127.0.0.1:8536 DATOMIC_URL=http://127.0.0.1:8536 DATOMIC_READ_URLS=http://127.0.0.1:8537
pids=()
if [[ $mode == full ]]; then
 for layout in legacy lean; do
  DATOMIC_TEST_LAYOUT=$layout node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/reach.test.ts packages/datomic/test/record-time-peer.test.ts packages/datomic/test/concurrent-commits.test.ts packages/datomic/test/clock-order.test.ts > "$root/$prefix-$layout.log" 2>&1 & pids+=("$!")
 done
elif [[ $mode == diff ]]; then
 for first in 0 100 200; do
  DX_B5_SCENARIO_START=$first DX_B5_SCENARIOS=100 node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/layout-differential.test.ts > "$root/$prefix-diff-$first.log" 2>&1 & pids+=("$!")
 done
else exit 2; fi
status=0
for i in "${!pids[@]}"; do code=0; wait "${pids[$i]}" || code=$?; echo "$code" > "$root/$prefix-$mode-$i.exit-code"; [[ $code == 0 ]] || status=1; done
if [[ $mode == diff && $status == 0 ]]; then
 node --input-type=module - "$root/$prefix-cache-stats.json" <<'JS'
import fs from 'node:fs';import assert from 'node:assert/strict';
const r=await fetch(process.env.DATOMIC_URL+'/v2/admin/scan-stats');assert.ok(r.ok);const s=await r.json();fs.writeFileSync(process.argv[2],JSON.stringify(s));const c=s.entityCache;assert.equal(c.verify,true);assert.ok(c.hits>0);assert.ok(c.verified>=c.hits+(c.revisionHits??0));assert.equal(c.verificationErrors,0);assert.ok(c.bytes<=c.budgetBytes);
JS
fi
exit "$status"

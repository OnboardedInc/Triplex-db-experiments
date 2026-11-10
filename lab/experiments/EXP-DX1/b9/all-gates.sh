#!/usr/bin/env bash
# [DX-B9] Why: independent fresh scopes share a bounded proxy; all original files and all RNG shards run.
# Rejected: shrinking the corpus or treating one aggregate exit as proof of each suite.
set -euo pipefail
prefix=${1:?prefix}
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9
bash lab/experiments/EXP-DX1/b9/native-tests.sh "$prefix" > "$root/$prefix-native.log" 2>&1
node lab/experiments/EXP-DX1/b7/gate-proxy.mjs 8526 8527 "$root/$prefix-proxy-ready.json" "$root/$prefix-proxy.json" & proxy=$!
cleanup(){ kill "$proxy" 2>/dev/null || true; wait "$proxy" || true; }
trap cleanup EXIT
for ((i=0;i<100;i++)); do [[ -s "$root/$prefix-proxy-ready.json" ]] && break; sleep 0.1; done
[[ -s "$root/$prefix-proxy-ready.json" ]]
export DATOMIC_GATEWAY_URL=http://127.0.0.1:8536 DATOMIC_URL=http://127.0.0.1:8536 DATOMIC_READ_URLS=http://127.0.0.1:8537
pids=(); names=()
bash lab/experiments/EXP-DX1/b9/suite.sh base > "$root/$prefix-base.log" 2>&1 & pids+=("$!"); names+=(base)
for layout in legacy lean; do
 DATOMIC_TEST_LAYOUT=$layout node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/reach.test.ts packages/datomic/test/record-time-peer.test.ts packages/datomic/test/concurrent-commits.test.ts packages/datomic/test/clock-order.test.ts > "$root/$prefix-$layout.log" 2>&1 & pids+=("$!"); names+=("$layout")
done
for first in 0 100 200; do
 DX_B5_SCENARIO_START=$first DX_B5_SCENARIOS=100 node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/layout-differential.test.ts > "$root/$prefix-diff-$first.log" 2>&1 & pids+=("$!"); names+=("diff-$first")
done
status=0
for i in "${!pids[@]}"; do code=0; wait "${pids[$i]}" || code=$?; echo "$code" > "$root/$prefix-${names[$i]}.exit-code"; [[ $code == 0 ]] || status=1; done
[[ $status == 0 ]] || exit "$status"
node --input-type=module - "$root/$prefix-cache-stats.json" <<'JS'
import fs from 'node:fs';import assert from 'node:assert/strict';
const r=await fetch(process.env.DATOMIC_URL+'/v2/admin/scan-stats');assert.ok(r.ok);const s=await r.json();fs.writeFileSync(process.argv[2],JSON.stringify(s));const c=s.entityCache;assert.equal(c.verify,true);assert.ok(c.hits>0);assert.ok(c.verified>=c.hits+c.revisionHits+c.recentHits);assert.equal(c.recentVerified,c.recentHits);assert.equal(c.verificationErrors,0);assert.ok(c.bytes<=c.budgetBytes);assert.ok(c.recentBytes<=c.recentBudgetBytes);
JS

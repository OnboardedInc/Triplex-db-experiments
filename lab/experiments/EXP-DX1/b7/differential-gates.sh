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
if [[ $status == 0 ]]; then
  node --input-type=module - "$root/$prefix-diff-stats.json" <<'JS'
import fs from 'node:fs';import assert from 'node:assert/strict';
const response=await fetch(process.env.DATOMIC_URL+'/v2/admin/scan-stats');assert.ok(response.ok);
const stats=await response.json();fs.writeFileSync(process.argv[2],JSON.stringify(stats));
if(process.env.B7_EXPECT_VERIFY==='true'){
 const c=stats.entityCache;assert.equal(c.verify,true);assert.ok(c.hits>0);assert.ok(c.verified>=c.hits+(c.revisionHits??0));assert.equal(c.verificationErrors,0);assert.ok(c.bytes<=c.budgetBytes);
}
JS
fi
exit "$status"

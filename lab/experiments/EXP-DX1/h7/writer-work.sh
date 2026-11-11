#!/usr/bin/env bash
# [DX-H7] Why: use the same stack and placement for both writer arms, with independent 10k seeds.
# Rejected: reusing mutated subject states between arms (would change the offered predecessors).
set -euo pipefail
prefix=${DX_H7_PREFIX:?}
[[ $prefix == tx2-dxh7-* ]] || exit 2
repo=$PWD
export DX_TX_HEAP=3g DX_TX_MEMORY=4g DX_GW_WRITE_MEMORY=3g DX_GW_READ_MEMORY=3g DX_PG_MEMORY=2g
export DX_OBJECT_CACHE=1g DX_INDEX_THRESHOLD=256m DX_INDEX_MAX=1g
if [[ ${DX_H7_REUSE_STACK:-0} != 1 ]]; then
bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write 18497 --port-read 18498 --cpus-tx 0,1 --cpus-pg 0 --cpus-gw-write 1 --cpus-gw-read 2,3 --gw-java-opts '-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g' --pg-settings '-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB'
fi
# [DX-H7] Why: a late reader-gate handoff can still finish correctness checks within the task budget.
# Rejected: starting a measurement that cannot finish both arms before the deadline.
if [[ -f lab/experiments/EXP-DX1/h7/.reader-gated-ready ]] && [[ $(cat lab/experiments/EXP-DX1/h7/.reader-gated-ready) == gates-only ]]; then export DX_H7_WRITER_GATES=1; fi
echo "DX-H7 writer gates mode: ${DX_H7_WRITER_GATES:-0}"
if [[ ${DX_H7_WRITER_GATES:-0} != 0 ]]; then
  files=(packages/datomic/test/concurrent-commits.test.ts packages/datomic/test/commit-observation.test.ts packages/datomic/test/adapter.test.ts packages/datomic/test/cache-budget.test.ts packages/datomic/test/predecessor.test.ts)
  if [[ ${DX_H7_RECHECK_ONLY:-0} == 1 ]]; then files=(packages/datomic/test/predecessor.test.ts); fi
  DATOMIC_TEST_LAYOUT=lean DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:18497 TRIPLEX_DATOMIC_LAYOUT=lean ./node_modules/.bin/vitest run --silent=false --reporter=verbose "${files[@]}"
  if [[ ${DX_H7_WRITER_GATES:-0} == 1 ]]; then exit; fi
fi
docker volume create "$prefix-driver"
for stamps in 0 1; do
  echo "DX-H7 writer measurement stamps=$stamps subjects=10000"
  docker run --rm --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory 8g --memory-swap 8g \
    -v "$repo:$repo" -v "$prefix-driver:/driver" -w "$repo" \
    -e TRIPLEX_DATOMIC_LAYOUT=lean -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DX_H7_STAMPS=$stamps" \
    node:22.23.2-bookworm-slim node --experimental-strip-types lab/experiments/EXP-DX1/h7/writer-measure.mjs
done

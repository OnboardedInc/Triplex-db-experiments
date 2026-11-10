#!/usr/bin/env bash
# [DX-H7] Why: the lease wrapper bounds this complete process group, including seed and tests.
# Rejected: a shell-only alarm while a foreground docker command keeps running.
set -euo pipefail
prefix=${DX_H7_PREFIX:-tx2-dxh7-q1}
[[ $prefix == tx2-dxh7-* ]] || exit 2
repo=$PWD
export DX_TX_HEAP=3g DX_TX_MEMORY=4g DX_GW_WRITE_MEMORY=3g DX_GW_READ_MEMORY=3g DX_PG_MEMORY=2g
export DX_OBJECT_CACHE=1g DX_INDEX_THRESHOLD=256m DX_INDEX_MAX=1g
bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write 18497 --port-read 18498 --cpus-tx 0,1 --cpus-pg 0 --cpus-gw-write 1 --cpus-gw-read 2,3 --gw-java-opts '-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g' --pg-settings '-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB'
run_gates() {
  DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:18497 TRIPLEX_DATOMIC_LAYOUT=lean ./node_modules/.bin/vitest run packages/datomic/test/reach.test.ts packages/datomic/test/reach-repair.test.ts packages/datomic/test/cache-budget.test.ts packages/datomic/test/layout-differential.test.ts
}
# [DX-H7] Why: correctness suites need a complete fresh lease after the measured arms.
# Rejected: extending the measurement hold beyond its 20-minute limit.
if [[ ${DX_H7_GATES_ONLY:-0} == 1 ]]; then run_gates; exit; fi
docker volume create "$prefix-driver"
run_arm() {
  docker run --rm --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory 8g --memory-swap 8g \
    -v "$repo:$repo" -v "$prefix-driver:/driver" -w "$repo" \
    -e TRIPLEX_DATOMIC_LAYOUT=lean -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" \
    -e "DX_H7_ENTITY_BYTES=${DX_H7_ENTITY_BYTES:-134217728}" \
    node:22.23.2-bookworm-slim node --experimental-strip-types lab/experiments/EXP-DX1/h7/measure.ts "$1"
}
run_arm before
echo 'DX-H7 BEFORE COMPLETE; waiting for after-ready'
while [[ ! -f lab/experiments/EXP-DX1/h7/.after-ready ]]; do sleep 5; done
export DX_H7_ENTITY_BYTES=$(cat lab/experiments/EXP-DX1/h7/.after-ready)
./node_modules/.bin/turbo run build --filter=./packages/datomic...
run_arm after
run_gates

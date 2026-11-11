#!/usr/bin/env bash
# [DX-H7] Why: retry the unchanged differential corpus in parallel deterministic ranges.
# Rejected: replacing the RNG seed per range (changes the test corpus).
set -euo pipefail
prefix=${DX_H7_PREFIX:?}
[[ $prefix == tx2-dxh7-* ]] || exit 2
repo=$PWD
export DX_TX_HEAP=3g DX_TX_MEMORY=4g DX_GW_WRITE_MEMORY=3g DX_GW_READ_MEMORY=3g DX_PG_MEMORY=2g
export DX_OBJECT_CACHE=1g DX_INDEX_THRESHOLD=256m DX_INDEX_MAX=1g
if [[ ${DX_H7_REUSE_STACK:-0} != 1 ]]; then
bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write 18497 --port-read 18498 --cpus-tx 0,1 --cpus-pg 0 --cpus-gw-write 1 --cpus-gw-read 2,3 --gw-java-opts '-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g' --pg-settings '-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB'
fi

rm -f lab/experiments/EXP-DX1/h7/.reader-gated-ready
source_root=${DX_H7_GATES_SOURCE_ROOT:-$repo}
pids=()
# [DX-H7] Why: 300 serial cases timed out; range starts skip exactly the original RNG draws.
# Rejected: fewer cases, new seeds, or a hold exceeding 20 minutes.
for start in 0 100 200; do
  (
    cd "$source_root"
    DX_B5_SCENARIOS=100 DX_B5_SCENARIO_START=$start DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:18497 TRIPLEX_DATOMIC_LAYOUT=lean ./node_modules/.bin/vitest run --silent=false --reporter=verbose packages/datomic/test/layout-differential.test.ts
  ) & pids+=("$!")
done
rc=0
for pid in "${pids[@]}"; do wait "$pid" || rc=1; done
[[ $rc == 0 ]] || exit "$rc"
echo 'DX-H7 DIFFERENTIAL RANGES COMPLETE; awaiting gated commit'
if [[ -n ${DX_H7_AFTER_READER_WORK:-} ]]; then
  while [[ ! -f lab/experiments/EXP-DX1/h7/.reader-gated-ready ]]; do sleep 1; done
  DX_H7_REUSE_STACK=1 DX_H7_WRITER_GATES=both bash "$DX_H7_AFTER_READER_WORK"
fi

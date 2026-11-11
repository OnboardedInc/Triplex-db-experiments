#!/usr/bin/env bash
set -euo pipefail
prefix=${1:?}; mode=${2:-all}
config=lab/experiments/EXP-DX1/b5/vitest.config.ts
# [DX-B10] Why: a queued grant can prioritize the unrun required proof when the wall-clock budget is short.
# Rejected: repeat the already-completed Step 1 corpus while the required 10k/seed proofs remain unrun.
if [[ $mode == diff && -f lab/experiments/EXP-DX1/b10/.order-first ]]; then
 echo 'DX-B10 queued differential grant retargeted to ordering, seed, base and clock proofs'
 mode=order
fi
if [[ $mode == native ]]; then
 B8_RECENT_TESTS=1 bash lab/experiments/EXP-DX1/b10/native-tests.sh "$prefix"
 exit
fi
if [[ $mode == order ]]; then
 B8_RECENT_TESTS=1 bash lab/experiments/EXP-DX1/b10/native-tests.sh "$prefix"
 for layout in legacy lean; do
  DATOMIC_ROUTE_EVIDENCE_DIR="$DX_STACK_EVIDENCE/oracle-$prefix-$layout" DATOMIC_TEST_LAYOUT=$layout node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config "$config" packages/datomic/test/strict-order.test.ts
 done
 hold_started=${B10_HOLD_STARTED:-$(stat -f %m /Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json)}
 if (( $(date +%s) - hold_started < 240 )); then
  echo 'DX-B10 starting the single VM seed comparison after completed ordering proofs'
  B10_RESTART_NORMAL=1 bash lab/experiments/EXP-DX1/b10/seed-vm.sh "$prefix"
  bash lab/experiments/EXP-DX1/b10/gateways.sh "$prefix" 1
 else
  echo 'DX-B10 VM seed deferred to its own bounded hold'
 fi
 bash "$0" "$prefix-base" base
 bash "$0" "$prefix-clock" clock
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
  case $mode in
   base) DATOMIC_ROUTE_EVIDENCE_DIR="$DX_STACK_EVIDENCE/oracle-$prefix-$layout" DATOMIC_TEST_LAYOUT=$layout node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config "$config" packages/datomic --exclude '**/layout-differential.test.ts' --exclude '**/strict-order.test.ts' --exclude '**/reach.test.ts' --exclude '**/concurrent-commits.test.ts' --exclude '**/clock-order.test.ts' --exclude '**/record-time-peer.test.ts' &;;
   long) DATOMIC_ROUTE_EVIDENCE_DIR="$DX_STACK_EVIDENCE/oracle-$prefix-$layout" DATOMIC_TEST_LAYOUT=$layout node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config "$config" packages/datomic/test/reach.test.ts packages/datomic/test/concurrent-commits.test.ts &;;
   clock) DATOMIC_ROUTE_EVIDENCE_DIR="$DX_STACK_EVIDENCE/oracle-$prefix-$layout" DATOMIC_TEST_LAYOUT=$layout node_modules/.bin/vitest run --maxWorkers 1 --reporter verbose --config "$config" packages/datomic/test/clock-order.test.ts packages/datomic/test/record-time-peer.test.ts &;;
   *) echo 'Use base, long, clock, diff, native or order'; exit 2;;
  esac
  pids+=("$!")
 done
fi
status=0
for pid in "${pids[@]}"; do wait "$pid" || status=1; done
exit "$status"

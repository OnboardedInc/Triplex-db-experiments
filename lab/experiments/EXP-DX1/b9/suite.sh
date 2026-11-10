#!/usr/bin/env bash
set -euo pipefail
mode=${1:?base|reach|concurrent|peer|diff0|diff100|diff200}
config=lab/experiments/EXP-DX1/b5/vitest.config.ts
# [DX-B8] Why: preserve all 300 differential scenarios in the original RNG order within bounded windows.
# Rejected: shrinking the corpus to fit one lease.
if [[ $mode == diff* ]]; then
 start=${mode#diff}; [[ $start == 0 || $start == 100 || $start == 200 ]] || exit 2
 DX_B5_SCENARIOS=100 DX_B5_SCENARIO_START=$start node_modules/.bin/vitest run --reporter verbose --config "$config" packages/datomic/test/layout-differential.test.ts
 exit
fi
for layout in legacy lean; do
 export DATOMIC_TEST_LAYOUT=$layout
 export DATOMIC_ROUTE_EVIDENCE_DIR="/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9/oracle-$layout-$(date +%s)-$$"
 case $mode in
 base) node_modules/.bin/vitest run --reporter verbose --config "$config" packages/datomic --exclude '**/reach.test.ts' --exclude '**/concurrent-commits.test.ts' --exclude '**/clock-order.test.ts' --exclude '**/record-time-peer.test.ts' --exclude '**/layout-differential.test.ts';;
 reach) node_modules/.bin/vitest run --reporter verbose --config "$config" packages/datomic/test/reach.test.ts;;
 concurrent) node_modules/.bin/vitest run --reporter verbose --config "$config" packages/datomic/test/concurrent-commits.test.ts packages/datomic/test/clock-order.test.ts;;
 peer) node_modules/.bin/vitest run --reporter verbose --config "$config" packages/datomic/test/record-time-peer.test.ts;;
 *) exit 2;;
 esac
done

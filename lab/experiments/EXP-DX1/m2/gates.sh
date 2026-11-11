#!/usr/bin/env bash
# [DX-M2] Why: rerun the unchanged differential/order scenarios with opt-in hints. Rejected: blessing speculative success alone.
set -euo pipefail
config=lab/experiments/EXP-DX1/b5/vitest.config.ts
npm_config_store_dir=/Users/sam/projects/triplex-db-2/.pnpm-store
export npm_config_store_dir
mode=${1:-diff}
if [[ $mode == diff ]]; then
 pids=()
 for start in 0 100 200; do
  DX_B5_SCENARIOS=100 DX_B5_SCENARIO_START=$start pnpm exec vitest run --maxWorkers 1 --config "$config" packages/datomic/test/layout-differential.test.ts & pids+=("$!")
 done
 status=0
 for pid in "${pids[@]}"; do wait "$pid" || status=1; done
 exit "$status"
elif [[ $mode == order ]]; then
 for layout in lean legacy; do
  DATOMIC_TEST_LAYOUT=$layout pnpm exec vitest run --maxWorkers 1 --config "$config" packages/datomic/test/strict-order.test.ts
 done
else
 pnpm exec vitest run --maxWorkers 1 --config "$config" packages/datomic --exclude '**/layout-differential.test.ts' --exclude '**/strict-order.test.ts'
fi

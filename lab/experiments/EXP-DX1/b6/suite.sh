#!/usr/bin/env bash
set -euo pipefail
for layout in legacy lean; do
  export DATOMIC_TEST_LAYOUT=$layout
  node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic packages/core/test/transaction-fast.test.ts packages/core/test/kv/layers/KvTriples.reach-cut.test.ts --exclude '**/concurrent-commits.test.ts' --exclude '**/clock-order.test.ts' --exclude '**/layout-differential.test.ts' --exclude '**/reach.test.ts' --exclude '**/record-time-peer.test.ts'
done

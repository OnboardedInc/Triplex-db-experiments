#!/usr/bin/env bash
set -euo pipefail
# [DX-B6] Why: W0 tests import these public dist exports even when native tests are skipped.
# Rejected: excluding the file to hide a missing build prerequisite.
node_modules/.bin/turbo run build --filter=@triplex-build/triplex-qualification... --filter=@triplex-build/w0... --filter=@triplex-build/triplex-host... --filter=@triplex-build/triplex-xtdb... --filter=@triplex-build/triplex-qlever...
tag=${B6_CAPTURE_TAG:-suite-$(date +%s)-$$}
python3 lab/experiments/EXP-DX1/b6/capture.py "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6/$tag-test-source"
for layout in legacy lean; do
  export DATOMIC_TEST_LAYOUT=$layout
  export DATOMIC_ROUTE_EVIDENCE_DIR="/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6/oracle-$layout-$(date +%s)-$$"
  node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic packages/core/test/transaction-fast.test.ts packages/core/test/kv/layers/KvTriples.reach-cut.test.ts --exclude '**/concurrent-commits.test.ts' --exclude '**/clock-order.test.ts' --exclude '**/layout-differential.test.ts' --exclude '**/reach.test.ts' --exclude '**/record-time-peer.test.ts'
done

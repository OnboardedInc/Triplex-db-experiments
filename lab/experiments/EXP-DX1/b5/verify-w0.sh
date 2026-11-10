#!/usr/bin/env bash
# [DX-B5-L5] Why: exercise the actual H2 200-subject page comparison on a fresh CPU-5 stack.
# Rejected: the earlier small synthetic graph as evidence that a real page fits the route budget.
set -euo pipefail
prefix="tx2-dxb5-w0-$(date +%s)"
trap 'bash lab/experiments/EXP-DX1/b5/down.sh "$prefix" --volumes' EXIT
bash lab/experiments/EXP-DX1/b5/up.sh "$prefix"
for layout in lean legacy; do
  if [[ ${DX_B5_FULL_SUITES:-0} == 1 || ${DX_B5_FULL_SUITES:-0} == "$layout" ]]; then
    set +e
    DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8505 DATOMIC_TEST_LAYOUT="$layout" DATOMIC_ROUTE_EVIDENCE_DIR="/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5/compact-$layout-oracle" node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts --exclude '**/layout-differential.test.ts' --exclude '**/clock-order.test.ts' packages/datomic packages/core/test/transaction-fast.test.ts packages/core/test/kv/layers/KvTriples.reach-cut.test.ts > "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5/compact-full-$layout.log" 2>&1
    dxb5_suite_code=$?
    set -e
    printf '%s\n' "$dxb5_suite_code" > "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5/compact-full-$layout.exit-code"
  fi
  DATOMIC_URL=http://127.0.0.1:8505 DATOMIC_READ_URLS=http://127.0.0.1:8506 TRIPLEX_DATOMIC_LAYOUT="$layout" DXH2_TEST_DIR=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5 node --import tsx --test --test-name-pattern 'Datomic W0 reader equals' lab/experiments/EXP-DX1/b5/w0-reader.test.ts
done

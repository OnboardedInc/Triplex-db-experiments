#!/usr/bin/env bash
# [DX-B5] Why: fresh CPU-5 databases bound memory and isolate each physical-layout suite.
# Rejected: mixing a failed native prefix into a later run or hiding its nonzero exit status.
set -euo pipefail
layout=${1:?legacy or lean}
[[ $layout == legacy || $layout == lean ]] || exit 2
prefix="tx2-dxb5-final-$layout-$(date +%s)"
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5
cleanup() { bash lab/experiments/EXP-DX1/b5/down.sh "$prefix" --volumes; }
trap cleanup EXIT
bash lab/experiments/EXP-DX1/b5/up.sh "$prefix"
set +e
DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8505 DATOMIC_TEST_LAYOUT="$layout" DATOMIC_ROUTE_EVIDENCE_DIR="$root/final-$layout-oracle" node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts --exclude '**/layout-differential.test.ts' --exclude '**/clock-order.test.ts' packages/datomic packages/core/test/transaction-fast.test.ts packages/core/test/kv/layers/KvTriples.reach-cut.test.ts
status=$?
set -e
printf '%s\n' "$status" > "$root/final-$layout.exit-code"
exit "$status"

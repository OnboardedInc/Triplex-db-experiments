#!/usr/bin/env bash
# [DX-B5-L3] Why: fresh source-bound equivalence needs its own bounded-memory native stack.
# Rejected: reusing an interrupted stack or counting a historical gate as current execution.
set -euo pipefail
prefix="tx2-dxb5-differential-$(date +%s)"
guard=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5/functional-active
mkdir "$guard"
cleanup() { bash lab/experiments/EXP-DX1/b5/down.sh "$prefix" --volumes; rmdir "$guard"; }
trap cleanup EXIT
bash lab/experiments/EXP-DX1/b5/up.sh "$prefix"
DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8505 DX_B5_SCENARIOS="${DX_B5_SCENARIOS:-300}" node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b3/vitest.config.ts packages/datomic/test/layout-differential.test.ts

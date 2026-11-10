#!/usr/bin/env bash
# [DX-B7] Why: rerun unchanged equivalence assertions for each physical layout. Rejected: skipped native tests as a gate.
set -euo pipefail
export DATOMIC_GATEWAY_URL=$DATOMIC_URL
for layout in legacy lean; do
  export DATOMIC_TEST_LAYOUT=$layout
  node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts "$@"
done

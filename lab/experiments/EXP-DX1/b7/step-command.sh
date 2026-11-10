#!/usr/bin/env bash
# [DX-B7] Why: complete both layouts and the 300-scenario differential before a measured frozen-basis pull run.
# Rejected: treating unit-only skips or a partial scenario denominator as semantic acceptance.
set -euo pipefail
prefix=${1:?prefix}
bash lab/experiments/EXP-DX1/b7/test-layouts.sh \
  packages/datomic/test/reach.test.ts packages/datomic/test/reach-repair.test.ts \
  packages/datomic/test/journal-fast.test.ts packages/datomic/test/record-time-peer.test.ts \
  packages/datomic/test/concurrent-commits.test.ts packages/datomic/test/cache-budget.test.ts
DATOMIC_GATEWAY_URL=$DATOMIC_URL node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/layout-differential.test.ts
export DX_DRIVER_ENV='DATOMIC_INTEGRATION=1 TRIPLEX_DATOMIC_LAYOUT=lean'
# The stack publishes ports only for the bounded host gates. The performance helper requires no publication;
# remove port bindings by using a separate performance window instead of weakening that assertion.

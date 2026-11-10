#!/usr/bin/env bash
# [DX-N1] Why: one real commit/pull precedes the eight original lean suites on the same fresh stack.
# Rejected: health-only smoke success or silently reduced differential scenarios.
source "$(dirname "$0")/common.sh"
run=${1:?run directory}
cd "$REPO"
node --experimental-strip-types "$HERE/smoke.mjs"
export DX_B5_SCENARIOS=300 DX1_RESULTS=$run/driver/reach-results.json DX2_TRANSITION_RESULTS=$run/driver/transition-results.json
exec "$REPO/node_modules/.bin/vitest" run --reporter=default --reporter=json --outputFile "$run/driver/tests.json" --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/reach.test.ts packages/datomic/test/reach-repair.test.ts packages/datomic/test/journal-fast.test.ts packages/datomic/test/record-time-peer.test.ts packages/datomic/test/concurrent-commits.test.ts packages/datomic/test/adapter.test.ts packages/datomic/test/commit-observation.test.ts packages/datomic/test/layout-differential.test.ts

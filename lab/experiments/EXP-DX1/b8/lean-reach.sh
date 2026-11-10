#!/usr/bin/env bash
set -euo pipefail
export DATOMIC_TEST_LAYOUT=lean
node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/reach.test.ts

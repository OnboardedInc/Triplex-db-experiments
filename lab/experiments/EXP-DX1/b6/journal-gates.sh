#!/usr/bin/env bash
set -euo pipefail
for layout in legacy lean; do
 export DATOMIC_TEST_LAYOUT=$layout
 node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/adapter.test.ts -t 'rejects signed zero'
 node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/journal-fast.test.ts
 node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/layout-differential.test.ts -t 'filters untyped'
done

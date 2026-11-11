#!/usr/bin/env bash
# [DX-R1] Why: build and source checks precede offline replay in one admitted job.
# Rejected: measuring against a partially emitted package after a declaration failure.
set -euo pipefail
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec turbo run build --filter=@triplex-build/triplex-datomic --filter=@triplex-build/w0 --filter=@triplex-build/triplex-qualification --filter=@triplex-build/triplex-xtdb --filter=@triplex-build/triplex-qlever
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec tsc --noEmit -p packages/datomic/tsconfig.json
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec tsc --noEmit -p lab/experiments/EXP-DX1/r1/tsconfig.json
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec vitest run packages/datomic/test/replica*.test.ts lab/bench/lib/w0-replica.test.ts
node --expose-gc --experimental-strip-types lab/experiments/EXP-DX1/r1/offline.ts

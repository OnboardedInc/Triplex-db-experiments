#!/usr/bin/env bash
# [DX-R1] Why: finish package emission and checks before any owned container can import it.
# Rejected: rebuilding under an already running measurement stack.
set -euo pipefail
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store --filter @triplex-build/triplex-datomic build
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec tsc --noEmit -p lab/experiments/EXP-DX1/r1/tsconfig.json
pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec vitest run packages/datomic/test/replica*.test.ts lab/bench/lib/w0-replica.test.ts
exec bash lab/experiments/EXP-DX1/r1/window.sh "$@"

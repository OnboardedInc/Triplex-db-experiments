#!/usr/bin/env bash
set -euo pipefail
node lab/experiments/EXP-DX1/m1/sample.mjs &
sampler=$!
trap 'kill "$sampler" 2>/dev/null || true' EXIT
node --trace-gc --experimental-strip-types lab/experiments/EXP-DX1/m1/driver.ts --lane datomic --composition reach --profile smoke --reader-threads 3 --oracle-root /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/oracle --output runs/DX-H3-vm/ns-report.json --rung 10k --zero-readers --match-duration-s 200
if [[ ${M1_Q3:-0} == 1 ]]; then
  node --experimental-strip-types lab/experiments/EXP-DX1/m1/lone-commit.mjs
fi

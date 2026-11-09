#!/bin/sh
set -eu
node node_modules/tsx/dist/cli.mjs lab/bench/qlever-bulk-seed.ts --rung 10k --subjects 3950 --seed qg1-v1 --out runs/qg1-seed-3950
node lab/experiments/EXP-QG1-qlever-generations/prepare-base.mjs runs/qg1-seed-3950 /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QG1/base-10m-attempt2

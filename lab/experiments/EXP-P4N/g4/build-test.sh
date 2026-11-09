#!/bin/sh
# [EXP-P4N] Why: one heavy token for build, retain, and the QH1 vitest list (offline, no engines), logs beside the evidence.
# usage: build-test.sh <armName> <logdir>
cd /Users/sam/projects/triplex-db-2/.claude/worktrees/qh1
mkdir -p "$2"
./lab/experiments/EXP-P4N/g4/build-retain.sh "$1" > "$2/build.log" 2>&1; echo "build exit $?" >> "$2/index.txt"
export QH1_RESULT="$2/measurements.json"
node_modules/.bin/vitest run --config lab/verify/QH1/vitest.config.ts h1decode.test.ts validfrom.test.ts codec.test.ts domain.test.ts route.test.ts public.test.ts real.test.ts workercache.test.ts reach-cut.test.ts oreplay.test.ts > "$2/vitest.log" 2>&1; echo "vitest exit $?" >> "$2/index.txt"

#!/bin/sh
# [EXP-P4N] Why: round 1 gates for the kept build, each through heavy.mjs, exit codes recorded beside the logs; semantic verdicts are read
# from the logs by a person (see REPORT rule 9a audit). usage: gates.sh <armName> (replay reads the retained arm build)
R=/Users/sam/Claude/Projects/triplex-db-2/evidence/P4N-R1
G=$R/gates-$1
ARM=$1
cd /Users/sam/projects/triplex-db-2/.claude/worktrees/qh1
mkdir -p $G
H="node lab/bin/heavy.mjs --label P4N-R1-gates --"
export QH1_RESULT=$G/measurements.json
run() { name=$1; shift; echo "== $name" >> $G/index.txt; "$@" > $G/$name.log 2>&1; echo "$name exit $?" >> $G/index.txt; }
run qlever-typecheck $H sh -c "cd packages/qlever && ../../node_modules/.bin/tsc --noEmit"
run qh1-vitest $H node_modules/.bin/vitest run --config lab/verify/QH1/vitest.config.ts oreplay.test.ts codec.test.ts domain.test.ts route.test.ts public.test.ts real.test.ts h1decode.test.ts workercache.test.ts validfrom.test.ts
run mutants $H node lab/experiments/EXP-QH1/mutants.mjs
run replay $H node_modules/.bin/tsx lab/experiments/EXP-P4N/g4/replay4.ts $ARM $R/replay/$ARM.txt 100000 8
node lab/experiments/EXP-P4N/g4/replay-compare.mjs /Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R3/replay/ref-baseline.txt $R/replay/$ARM.txt > $R/replay/$ARM-compare.json 2>&1
echo "replay-compare exit $?" >> $G/index.txt
echo finished >> $G/index.txt

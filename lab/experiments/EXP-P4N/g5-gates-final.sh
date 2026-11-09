#!/bin/sh
# [EXP-P4N-R2] Why: gates of the kept build in one heavy token each: 100,000-pull replay (documents on, own current.db) against round 3's row-route
# reference, stale-document mutants, package suite, lint, pin audit. usage: g5-gates-final.sh <arm> <logdir>
ARM=$1; G=$2
R=/Users/sam/Claude/Projects/triplex-db-2/evidence/P4N-R2
cd /Users/sam/projects/triplex-db-2/.claude/worktrees/qh1
mkdir -p $G $R/replay
export QH1_RESULT=$G/measurements.json
run() { name=$1; shift; echo "== $name $(date -u +%FT%TZ)" >> $G/index.txt; "$@" > $G/$name.log 2>&1; echo "$name exit $?" >> $G/index.txt; }
export P4N_DOCS=1
run replay node_modules/.bin/tsx lab/experiments/EXP-P4N/g5/replay5.ts $ARM $R/replay/$ARM.txt 100000 8
node lab/experiments/EXP-P4N/g5/replay-compare.mjs /Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R3/replay/ref-baseline.txt $R/replay/$ARM.txt > $R/replay/$ARM-compare.json 2>&1
echo "replay-compare exit $?" >> $G/index.txt
unset P4N_DOCS
run mutants-qh1 node lab/experiments/EXP-QH1/mutants.mjs
run mutants-docs node lab/experiments/EXP-P4N/g5-docs-mutants.mjs
run qlever-suite env QLEVER_INTEGRATION=0 node_modules/.bin/vitest run --root packages/qlever --maxWorkers=1 --no-file-parallelism
echo finished >> $G/index.txt

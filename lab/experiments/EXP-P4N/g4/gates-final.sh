#!/bin/sh
# [EXP-P4N] Why: gates of the kept build in one heavy token (the pool is contended): replay, mutants, package suite, lint and format, pin audit,
# P2 guard. Exit codes go to index.txt; semantic verdicts are read from the logs (REPORT, rule 9a audit). usage: gates-final.sh <arm>
ARM=$1
R=/Users/sam/Claude/Projects/triplex-db-2/evidence/P4N-R1
G=$R/gates-final-$ARM
cd /Users/sam/projects/triplex-db-2/.claude/worktrees/qh1
mkdir -p $G $R/replay
export QH1_RESULT=$G/measurements.json
run() { name=$1; shift; echo "== $name $(date -u +%FT%TZ)" >> $G/index.txt; "$@" > $G/$name.log 2>&1; echo "$name exit $?" >> $G/index.txt; }
run replay node_modules/.bin/tsx lab/experiments/EXP-P4N/g4/replay4.ts $ARM $R/replay/$ARM.txt 100000 8
node lab/experiments/EXP-P4N/g4/replay-compare.mjs /Users/sam/Claude/Projects/triplex-db-2/evidence/QH1-R3/replay/ref-baseline.txt $R/replay/$ARM.txt > $R/replay/$ARM-compare.json 2>&1
echo "replay-compare exit $?" >> $G/index.txt
run mutants node lab/experiments/EXP-QH1/mutants.mjs
run qlever-suite env QLEVER_INTEGRATION=0 node_modules/.bin/vitest run --root packages/qlever --maxWorkers=1 --no-file-parallelism
run oxlint node_modules/.bin/oxlint --deny-warnings packages/qlever/src/broker lab/verify/QH1 lab/experiments/EXP-P4N
run oxfmt node_modules/.bin/oxfmt --check packages/qlever/src/broker/h1.ts packages/qlever/src/broker/log.ts packages/qlever/src/broker/BrokerStorageAdapter.ts lab/verify/QH1/validfrom.test.ts lab/verify/QH1/p2guard.test.ts lab/verify/QH1/p2guard-arms.ts lab/verify/QH1/h1decode.test.ts lab/experiments/EXP-P4N/g4
run pin-audit node lab/experiments/EXP-P4N/g4/pin-audit4.mjs
mkdir -p $G/p2
QH1_RESULT=$G/p2/m.json run p2guard node_modules/.bin/vitest run --config lab/verify/QH1/vitest.config.ts p2guard.test.ts
echo finished >> $G/index.txt

#!/bin/sh
# [EXP-P4N-R2] Why: the guards one heavy token each, one after another: P2 under Q104a in both modes (12 rounds x 1,000 commits per arm), the P1 long-read
# test, then the final gates (replay with documents, mutants, package suite). usage: g5-guards.sh
R=/Users/sam/Claude/Projects/triplex-db-2/evidence/P4N-R2
cd /Users/sam/projects/triplex-db-2/.claude/worktrees/qh1
C=lab/verify/QH1/vitest.config.ts
for m in fills worker; do
  mkdir -p $R/p2-$m
  QH1_RESULT=$R/p2-$m/m.json P4N_P2_MODE=$m node lab/bin/heavy.mjs --label P4N-R2-p2-$m -- node_modules/.bin/vitest run --config $C p2guard.test.ts > $R/p2-$m.log 2>&1
  echo "p2-$m exit $?" >> $R/guards.txt
done
mkdir -p $R/p1
QH1_RESULT=$R/p1/m.json node lab/bin/heavy.mjs --label P4N-R2-p1 -- node_modules/.bin/vitest run --config $C p1-longread.test.ts > $R/p1.log 2>&1
echo "p1 exit $?" >> $R/guards.txt
node lab/bin/heavy.mjs --label P4N-R2-gates-final -- lab/experiments/EXP-P4N/g5-gates-final.sh sdoc2 $R/gates-final-sdoc2 > $R/gates-final.log 2>&1
echo "gates-final exit $?" >> $R/guards.txt
echo finished >> $R/guards.txt

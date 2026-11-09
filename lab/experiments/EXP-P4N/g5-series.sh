#!/bin/sh
# [EXP-P4N-R2] Why: the remaining measurement series, each its own heavy token one after another (the pool is shared): S2 = reads-only at c=4,
# S3 = writer-on (a commit every 10th pull (TARGETS 2.1, 10 reads per write), half the reads on a 200-owner hot set) on its own store clone, S4 = the P5 activation sweep (every root once)
# with documents prefilled against the row path. usage: g5-series.sh
R=/Users/sam/Claude/Projects/triplex-db-2/evidence/P4N-R2
cd /Users/sam/projects/triplex-db-2/.claude/worktrees/qh1
A=lab/experiments/EXP-P4N/g5/abab5.mjs
node lab/bin/heavy.mjs --label P4N-R2-s2-c4 -- node $A $R/s2-c4 4 "final,sbe,sdoc2+docp,sdoc2+docp@2,sdoc2+docc" 5 1000 300 4 > $R/s2-c4.log 2>&1
P4N_STORE=$R/store-w node lab/bin/heavy.mjs --label P4N-R2-s3-writer -- node $A $R/s3-writer 5 "sbe+w,sbe+w@2,sdoc2+docp+w,sdoc2+docp+w@2" 5 1000 300 1 > $R/s3-writer.log 2>&1
node lab/bin/heavy.mjs --label P4N-R2-s4-sweep -- node $A $R/s4-sweep 3 "sbe+sweep,sdoc2+docp+sweep" 10 1000 300 1 > $R/s4-sweep.log 2>&1
echo finished > $R/series.done

#!/bin/sh
# [EXP-XN1] Why: preserve X1 priority, then complete X2 and X3 in a reproducible order.
# Rejected: running writer setup during an X1 measurement (adds engine CPU to the read case).
set -eu
base=lab/experiments/EXP-XN1/spike-s1
evidence=/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S1
until test -f "$evidence/read-immediate-d-16.json"; do sleep 5; done
node lab/bin/heavy.mjs --label XN-S1-settle -- node "$base/settle.mjs"
"$base/reads.sh" settled
for shape in two one; do
 node lab/bin/heavy.mjs --label XN-S1-correct-$shape -- node "$base/write.mjs" correct "$shape"
 node lab/bin/heavy.mjs --label XN-S1-closed-$shape -- node "$base/write.mjs" closed "$shape" fresh 1000
done
node lab/bin/heavy.mjs --label XN-S1-history -- node "$base/write.mjs" history two
for shape in two one; do
 node lab/bin/heavy.mjs --label XN-S1-aged-$shape -- node "$base/write.mjs" closed "$shape" aged 1000
 for rate in 15 55; do
  node lab/bin/heavy.mjs --label XN-S1-open-$shape-$rate -- node "$base/write.mjs" open "$shape" aged "$rate" 0
 done
done
node lab/bin/heavy.mjs --label XN-S1-coupling -- node "$base/write.mjs" open one aged 55 16

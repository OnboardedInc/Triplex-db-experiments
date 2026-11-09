#!/bin/sh
# [EXP-XN1] Why: directly measure R16's lean inline query pin, paired with current reads at the same global history.
# Rejected: treating BEGIN/query/COMMIT's overhead as intrinsic snapshot-token cost.
set -eu
base=lab/experiments/EXP-XN1/spike-s1
evidence=/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S1
until test -f "$evidence/open-one-aged-55-r16.json"; do sleep 5; done
for clients in 1 4 16; do
 for kind in a e; do
  node lab/bin/heavy.mjs --label XN-S1-inline-$kind-$clients -- node "$base/read.mjs" read supplemental "$kind" "$clients"
 done
done

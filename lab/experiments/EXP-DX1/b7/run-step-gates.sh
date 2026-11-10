#!/usr/bin/env bash
# [DX-B7] Why: every code step reruns both complete layouts and all 300 differential scenarios inside separate bounded leases.
# Rejected: omitting slow tests, counting timed-out scenarios, or extending an engine lease.
set -euo pipefail
step=${1:?step}; attempt=${2:-a}
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7
for layout in legacy lean; do
  prefix="tx2-dxb7-$step-$layout-$attempt"
  cp lab/experiments/EXP-DX1/b7/gates.sh "$root/$prefix-runner.sh"
  clj=0; [[ $layout != legacy ]] || clj=1
  B7_PROFILE=0 B7_HOST_GATES=1 B7_CLOJURE_GATES=$clj bash "$root/$prefix-runner.sh" "$prefix" \
    bash lab/experiments/EXP-DX1/b7/parallel-gates.sh "$prefix" "$layout" \
    packages/datomic/test/reach.test.ts packages/datomic/test/reach-repair.test.ts \
    packages/datomic/test/journal-fast.test.ts packages/datomic/test/record-time-peer.test.ts \
    packages/datomic/test/concurrent-commits.test.ts packages/datomic/test/cache-budget.test.ts > "$root/$prefix.log" 2>&1
done
prefix="tx2-dxb7-$step-diff-$attempt"
cp lab/experiments/EXP-DX1/b7/gates.sh "$root/$prefix-runner.sh"
B7_PROFILE=0 B7_HOST_GATES=1 B7_CACHE_VERIFY=${B7_DIFF_VERIFY:-false} B7_EXPECT_VERIFY=${B7_DIFF_VERIFY:-false} \
  bash "$root/$prefix-runner.sh" "$prefix" bash lab/experiments/EXP-DX1/b7/differential-gates.sh "$prefix" > "$root/$prefix.log" 2>&1

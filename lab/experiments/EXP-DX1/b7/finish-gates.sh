#!/usr/bin/env bash
# [DX-B7-S4] Why: finish the unchanged final source's lean and full differential gates after its performance lease.
# Rejected: reusing pre-memo verification or counting the failed helper preflight as a test run.
set -euo pipefail
attempt=${1:-c}
[[ $attempt =~ ^[a-z0-9-]+$ ]] || exit 2
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7
until [[ -f "$root/tx2-dxb7-step4-pull-c-cleanup.json" ]]; do sleep 5; done
python3 - "$root/tx2-dxb7-step4-pull-c-cleanup.json" <<'PY'
import json,sys
s=json.load(open(sys.argv[1]));assert s['inventoryEmpty'] and s['childExitCode']==0
PY
prefix=tx2-dxb7-step4-lean-$attempt
cp lab/experiments/EXP-DX1/b7/gates.sh "$root/$prefix-runner.sh"
B7_PROFILE=0 B7_HOST_GATES=1 bash "$root/$prefix-runner.sh" "$prefix" \
 bash lab/experiments/EXP-DX1/b7/parallel-gates.sh "$prefix" lean \
 packages/datomic/test/reach.test.ts packages/datomic/test/reach-repair.test.ts \
 packages/datomic/test/journal-fast.test.ts packages/datomic/test/record-time-peer.test.ts \
 packages/datomic/test/concurrent-commits.test.ts packages/datomic/test/cache-budget.test.ts > "$root/$prefix.log" 2>&1
prefix=tx2-dxb7-step4-diff-$attempt
cp lab/experiments/EXP-DX1/b7/gates.sh "$root/$prefix-runner.sh"
B7_PROFILE=0 B7_HOST_GATES=1 B7_CACHE_VERIFY=true B7_EXPECT_VERIFY=true \
 bash "$root/$prefix-runner.sh" "$prefix" bash lab/experiments/EXP-DX1/b7/differential-gates.sh "$prefix" > "$root/$prefix.log" 2>&1

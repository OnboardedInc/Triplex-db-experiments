#!/usr/bin/env bash
set -euo pipefail
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6
for first in 0 100 200; do
 name="differential-$first-c"
 sleep 5
 cp lab/experiments/EXP-DX1/b6/gates.sh "$root/$name-runner.sh"
 echo "Starting $name $(date -u)"
 status=0
 B6_HOST_GATES=1 bash "$root/$name-runner.sh" "tx2-dxb6-$name" env DX_B5_SCENARIO_START="$first" DX_B5_SCENARIOS=100 node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/layout-differential.test.ts > "$root/$name.log" 2>&1 || status=$?
 printf '%s\n' "$status" > "$root/$name.exit-code"
 [[ $status == 0 ]] || exit "$status"
 echo "Completed $name $(date -u)"
done

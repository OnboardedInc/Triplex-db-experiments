#!/usr/bin/env bash
set -euo pipefail
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6
run() {
  name=$1; shift
  cp lab/experiments/EXP-DX1/b6/gates.sh "$root/$name-runner.sh"
  echo "Starting $name $(date -u)"
  status=0
  B6_HOST_GATES=1 bash "$root/$name-runner.sh" "tx2-dxb6-$name" "$@" > "$root/$name.log" 2>&1 || status=$?
  printf '%s\n' "$status" > "$root/$name.exit-code"
  [[ $status == 0 ]] || return "$status"
  echo "Completed $name $(date -u)"
}
for layout in legacy lean; do
  run "concurrent-$layout-a" env DATOMIC_TEST_LAYOUT="$layout" node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/concurrent-commits.test.ts packages/datomic/test/clock-order.test.ts
  run "reach-$layout-a" env DATOMIC_TEST_LAYOUT="$layout" node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/reach.test.ts
done
run differential-a node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts packages/datomic/test/layout-differential.test.ts

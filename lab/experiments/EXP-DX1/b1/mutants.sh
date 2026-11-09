#!/bin/bash
# [EXP-DX1] Why: test sensitivity with isolated staged gateway changes, never committed mutants.
# Rejected: reporting mutation coverage without executing each changed gateway.
set -euo pipefail
root=$(git rev-parse --show-toplevel)
evidence=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B1
stage=$evidence/stage/gateway
restore() {
  cp -R "$root/packages/datomic/gateway/." "$stage/"
  docker --host unix:///Users/sam/.colima/triplex2/docker.sock restart tx2-dxb1-dev >/dev/null
}
trap restore EXIT
for mutant in valid retraction recorded; do
  cp -R "$root/packages/datomic/gateway/." "$stage/"
  python3 - "$stage" "$mutant" <<'PY'
import pathlib,sys
base=pathlib.Path(sys.argv[1])/'src/triplex/gateway'
mode=sys.argv[2]
p=base/('storage.clj' if mode=='retraction' else 'reach.clj')
s=p.read_text()
if mode=='valid':
    old='(when (and (<= from valid) (or (nil? to) (> (double to) valid)))'
    new='(when true'
elif mode=='retraction':
    old='(when text (.add out [:db/retract eid :triplex.entity/row text]))'
    new='(when false (.add out [:db/retract eid :triplex.entity/row text]))'
else:
    old='r (get basis "recordedAt")'
    new='r nil'
assert s.count(old)==1,(mode,s.count(old))
p.write_text(s.replace(old,new))
PY
  docker --host unix:///Users/sam/.colima/triplex2/docker.sock restart tx2-dxb1-dev >/dev/null
  ready=0
  for ((i=0;i<120;i++)); do
    if curl -sf http://127.0.0.1:8490/health >/dev/null; then ready=1; break; fi
    sleep 1
  done
  [[ "$ready" == 1 ]]
  set +e
  DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8490 node "$root/node_modules/vitest/vitest.mjs" run packages/datomic/test/reach.test.ts >"$evidence/mutant-$mutant.log" 2>&1
  code=$?
  set -e
  [[ "$code" != 0 ]]
  # Failure must be an actual answer mismatch, not failure to start or missing dependencies.
  rg -q 'AssertionError: expected' "$evidence/mutant-$mutant.log"
  printf '%s: rejected by equivalence (exit %s)\n' "$mutant" "$code"
done

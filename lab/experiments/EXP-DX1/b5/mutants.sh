#!/usr/bin/env bash
# [DX-B5-L3] Why: semantic mutants must fail content assertions after a healthy native stack starts.
# Rejected: counting setup, compilation, transport or timeout failures as mutation coverage.
set -euo pipefail
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5/mutants
mkdir -p "$root"
for mutant in marker valid irregular; do
  prefix="tx2-dxb5-mutant-$mutant-$(date +%s)"
  stage="$root/$prefix"
  mkdir -p "$stage"
  cp -R packages/datomic/gateway/. "$stage/"
  cp packages/datomic/src/codec-spec.json "$stage/codec-spec.json"
  python3 - "$stage/src/triplex/gateway" "$mutant" <<'PY'
import pathlib,sys
root=pathlib.Path(sys.argv[1]); mutant=sys.argv[2]
if mutant=='marker':
 p=root/'lean.clj'; old=':retracted_position (Long/parseLong marker start (+ start 16) 10)'; new=':retracted_position (value db (:tx retired) :triplex.tx/position)'
elif mutant=='valid':
 p=root/'storage.clj'; old='(visible? row basis history)'; new='(visible? row (dissoc basis "validAt") history)'
else:
 p=root/'reach.clj'; old='(when (and (= 1 (aget header 2))'; new='(when (and (not= 3 (aget header 1)) (= 1 (aget header 2))'
s=p.read_text(); assert old in s; p.write_text(s.replace(old,new,1))
PY
  cleanup() { bash lab/experiments/EXP-DX1/b5/down.sh "$prefix" --volumes; }
  trap cleanup EXIT
  bash lab/experiments/EXP-DX1/b5/up.sh "$prefix" --gateway-src "$stage" > "$stage/start.log" 2>&1
  set +e
  DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8505 DX_B5_SCENARIOS=1 node_modules/.bin/vitest run --config lab/experiments/EXP-DX1/b3/vitest.config.ts packages/datomic/test/layout-differential.test.ts > "$stage/test.log" 2>&1
  status=$?
  set -e
  printf '%s\n' "$status" > "$stage/exit-code"
  [[ $status != 0 ]]
  rg -q 'AssertionError|expected .* to' "$stage/test.log"
  if rg -q 'ECONNREFUSED|Cannot initialize|timed out|Syntax error' "$stage/test.log"; then echo "invalid mutation failure" >&2; exit 1; fi
  cleanup
  trap - EXIT
  echo "$mutant: content assertion rejected"
done

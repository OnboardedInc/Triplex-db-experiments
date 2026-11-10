#!/usr/bin/env bash
# [DX-B4-T1] Why: exact cursor/entity mistakes must fail content gates. Rejected: treating a gateway startup error as detection.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
stage=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B4/stage/tx2-dxb4-dev3/src/triplex/gateway/journal.clj
out=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B4/mutants-$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$out"
cp packages/datomic/gateway/src/triplex/gateway/journal.clj "$out/original.clj"
restore() { cp "$out/original.clj" "$stage"; docker restart tx2-dxb4-dev3-gw-w >/dev/null; }
trap restore EXIT
for mutant in cursor entity; do
  python3 - "$out/original.clj" "$stage" "$mutant" <<'PY'
from pathlib import Path
import sys
s=Path(sys.argv[1]).read_text()
if sys.argv[3]=='cursor': s=s.replace(':triplex.tx/position (inc after) nil', ':triplex.tx/position after nil')
else: s=s.replace('(d/datoms db :eavt e :triplex.entity/row))]', '(d/datoms db :eavt (:scope (reach/config name db)) :triplex.entity/row))]')
Path(sys.argv[2]).write_text(s)
PY
  docker restart tx2-dxb4-dev3-gw-w > "$out/$mutant-restart.log"
  ready=false
  for ((i=0;i<90;i++)); do
    if curl -fsS http://127.0.0.1:8501/health > /dev/null; then ready=true; break; fi
    sleep 1
  done
  [[ $ready == true ]] || exit 1
  set +e
  DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8501 node lab/bin/heavy.mjs --label "DX-B4-mutant-$mutant" -- node_modules/.bin/vitest run packages/datomic/test/journal-fast.test.ts -t deep-equals > "$out/$mutant.log" 2>&1
  code=$?
  set -e
  [[ $code != 0 ]] && rg -q 'AssertionError|Journal binding mismatch|Invalid reach row set' "$out/$mutant.log"
done
printf '%s\n' "$out"

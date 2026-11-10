#!/usr/bin/env bash
# [DX-B5] Why: final suites use the scope-preserving SDK, then explicit fresh content mutants.
# Rejected: certifying the earlier broad journal correction or overlapping two large native suites.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5
guard="$root/functional-active"
mkdir "$guard"
prefix="tx2-dxb5-source-final-$(date +%s)"
cleanup() {
  bash lab/experiments/EXP-DX1/b5/down.sh "$prefix" --volumes
  python3 - "$root" <<'PY'
import subprocess,pathlib,json,datetime,sys
root=pathlib.Path(sys.argv[1]); rows=[]
for cmd in [['docker','ps','-a','--filter','name=tx2-dxb5-','--format','{{.Names}}'],['docker','network','ls','--filter','name=tx2-dxb5-','--format','{{.Name}}'],['docker','volume','ls','--filter','name=tx2-dxb5-','--format','{{.Name}}']]:
 r=subprocess.run(cmd,capture_output=True,text=True);rows.append({'command':cmd,'code':r.returncode,'stdout':r.stdout,'stderr':r.stderr})
(root/'source-final-functional-inventory.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'inventories':rows},indent=2)+'\n')
if not all(r['code']==0 and not r['stdout'].strip() for r in rows):raise SystemExit('owned resources remain or readback failed')
(root/'functional-active').rmdir()
PY
}
trap cleanup EXIT
bash lab/experiments/EXP-DX1/b5/up.sh "$prefix"
DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8505 node_modules/.bin/vitest run --config lab/experiments/EXP-DX1/b3/vitest.config.ts packages/datomic/test/layout-differential.test.ts -t 'preserves legacy'
for layout in legacy lean; do
  set +e
  DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8505 DATOMIC_TEST_LAYOUT="$layout" DATOMIC_ROUTE_EVIDENCE_DIR="$root/source-final-$layout-oracle" node_modules/.bin/vitest run --reporter verbose --config lab/experiments/EXP-DX1/b5/vitest.config.ts --exclude '**/layout-differential.test.ts' packages/datomic packages/core/test/transaction-fast.test.ts packages/core/test/kv/layers/KvTriples.reach-cut.test.ts > "$root/source-final-$layout.log" 2>&1
  dxb5_code=$?
  set -e
  printf '%s\n' "$dxb5_code" > "$root/source-final-$layout.exit-code"
done
bash lab/experiments/EXP-DX1/b5/down.sh "$prefix" --volumes
bash lab/experiments/EXP-DX1/b5/mutants.sh

#!/usr/bin/env bash
# [DX-H5] Why: independent configurations can queue while preserving the required fresh equivalence prerequisite.
# Rejected: booting measurement stacks before the reader gate or treating missing gate output as success.
set -euo pipefail
workers=${1:?workers}; prefix=${2:?prefix}
[[ $workers == 1 || $workers == 4 || $workers == 8 ]] || exit 2
[[ $prefix =~ ^tx2-dxh5-[a-z0-9-]+$ ]] || exit 2
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5
while [[ ! -e $root/tx2-dxh5-equivalence1/driver/equivalence.json ]]; do
 if [[ -e $root/tx2-dxh5-equivalence1/exit.json ]]; then echo 'reader gate terminated without a verdict' >&2; exit 2; fi
 sleep 5
done
python3 - "$root/tx2-dxh5-equivalence1/driver/equivalence.json" <<'PY'
import json,sys,hashlib,pathlib
r=json.load(open(sys.argv[1])); assert r['status']=='MATCH' and len(r['comparisons'])==8
assert all(p['requests']==1 for p in r['comparisons'])
assert r.get('sources')
for p,h in r['sources'].items():assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h, 'reader gate source changed: '+p
PY
export DXH5_SEED_VOLUME=tx2-dxh5-seed-1000-pg-data
exec node lab/bin/heavy.mjs --label "DX-H5-sweep-$workers" -- bash lab/experiments/EXP-DX1/h5/attempt-v2.sh sweep "$prefix" --rung 1000 --scope dxh5-w0-1000-v1 --seed-receipt "$root/tx2-dxh5-seed1000b/driver/receipt.json" --workers "$workers" --live --baseline-s 60

#!/usr/bin/env bash
# [DX-H5] Why: a fresh cloned 10k measurement requires both transport equality and a sealed G0 seed.
# Rejected: selecting the fastest raw-goodput arm despite its 1.810 writer ratio; eight workers met both observed bounds.
set -euo pipefail
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5
while [[ ! -e $root/tx2-dxh5-seed10000a/exit.json ]]; do sleep 5; done
python3 - "$root" <<'PY'
import json,sys,pathlib,hashlib
r=pathlib.Path(sys.argv[1])
assert json.load(open(r/'tx2-dxh5-seed10000a/exit.json'))['exit']==0
seed=json.load(open(r/'tx2-dxh5-seed10000a/driver/receipt.json'))
assert seed['N']==10000 and seed['status']=='G0-PASS'
for folder,file,field,length in [('tx2-dxh5-history1','history-equivalence.json','phases',2),('tx2-dxh5-equivalence2','equivalence.json','comparisons',8)]:
 g=json.load(open(r/folder/'driver'/file)); assert g['status']=='MATCH' and len(g[field])==length
 for p,h in g['sources'].items(): assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h, 'gate source changed: '+p
assert seed['countMode']=='full-history-public-batch-256'
for p,h in seed['sources'].items():
 if p.startswith('lab/experiments/EXP-DX1/h5/'): assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h
PY
export DXH5_SEED_VOLUME=tx2-dxh5-seed-10000-pg-data
exec node lab/bin/heavy.mjs --label DX-H5-sweep10000b -- bash lab/experiments/EXP-DX1/h5/attempt-counts.sh sweep tx2-dxh5-w8-10000a --rung 10000 --scope dxh5-w0-10000-v1 --seed-receipt "$root/tx2-dxh5-seed10000a/driver/receipt.json" --workers 8 --live --baseline-s 60

#!/usr/bin/env bash
# [DX-H6] Why: derive observations only after cleanup and independently verify every durable evidence hash.
# Rejected: hashing logs while their attempt is running or treating a checksum/cleanup inventory as semantic PASS.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6
[[ -e $root/tx2-dxh6-sweep1000d/exit.json ]]
node lab/experiments/EXP-DX1/h6/analyze.mjs > "$root/analysis.log"
node lab/experiments/EXP-DX1/h6/seed-curve.mjs > "$root/seed-curve.log"
python3 - <<'PY'
import subprocess,json,pathlib,datetime
inventory={'classification':'OWNED-INVENTORY-NOT-SEMANTIC-ACCEPTANCE','observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
for key,args in {'containers':['ps','-a','--filter','name=tx2-dxh6-','--format','{{.Names}}'],'networks':['network','ls','--filter','name=tx2-dxh6-','--format','{{.Name}}'],'volumes':['volume','ls','--filter','name=tx2-dxh6-','--format','{{.Name}}']}.items():
 inventory[key]=subprocess.check_output(['docker',*args],text=True).splitlines()
pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/final-owned-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
assert not any(inventory[key] for key in ['containers','networks','volumes']),inventory
PY
node lab/experiments/EXP-DX1/h6/manifest.mjs > /tmp/dxh6-manifest-result.json
shasum -a 256 -c lab/experiments/EXP-DX1/h6/SHA256SUMS > /tmp/dxh6-manifest-verify.log

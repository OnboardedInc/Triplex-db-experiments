#!/usr/bin/env bash
# [DX-B8] Why: qualification and its commit must precede fresh final measurements; waiting consumes no heavy slot.
# Rejected: benchmarking an unqualified prototype or reusing a prior attempt's output paths.
set -euo pipefail
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8
release="$root/stepc-v6-release.json"
while [[ ! -s "$release" ]];do sleep 5;done
python3 - "$release" <<'PY'
import json,subprocess,sys,hashlib,pathlib
s=json.load(open(sys.argv[1]));assert s['commit']==subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
for name,digest in s['gatewayFiles'].items():assert hashlib.sha256((pathlib.Path('packages/datomic/gateway')/name).read_bytes()).hexdigest()==digest
PY
for arm in noawake awake;do
 awake=0;[[ $arm != awake ]]||awake=1
 prefix=tx2-dxb8-final-v6-$arm
 log="$root/final-v6-$arm.log";[[ ! -e "$log" ]]
 node lab/bin/heavy.mjs --label "DX-B8-final-v6-$arm" -- env B8_KEEP_AWAKE="$awake" B8_PROFILE=1 B8_GATEWAY_SRC="$root/step-c-v6/gateway" B8_DRIVER_ENV='B7_PHASES=[["random",4],["random",64],["random",256]] B7_WORKERS=4 B7_MIXED=1' bash lab/experiments/EXP-DX1/b8/measure-window.sh "$prefix" node --experimental-strip-types lab/experiments/EXP-DX1/b8/load.mjs > "$log" 2>&1
 python3 - "$root" "$prefix" <<'PY'
import pathlib,json,sys
r=pathlib.Path(sys.argv[1]);dirs=[p for p in r.glob(sys.argv[2]+'-*') if (p/'cleanup.json').exists()];assert len(dirs)==1
s=json.load(open(dirs[0]/'cleanup.json'));assert s['childExitCode']==0 and s['containersAndNetworksEmpty'] and s['heldSeconds']<=900
assert json.load(open(dirs[0]/'source-stability.json'))['unchanged']
PY
done
printf '{"completed":true,"kind":"final paired execution complete; no target verdict"}\n' > "$root/final-v6-pair-complete.json"
for arm in noawake awake;do
 awake=0;[[ $arm != awake ]]||awake=1
 prefix=tx2-dxb8-w0-v6-$arm
 log="$root/w0-v6-$arm.log";[[ ! -e "$log" ]]
 node lab/bin/heavy.mjs --label "DX-B8-w0-v6-$arm" -- env B8_KEEP_AWAKE="$awake" B8_GATEWAY_SRC="$root/step-c-v6/gateway" bash lab/experiments/EXP-DX1/b8/w0-window.sh "$prefix" node --experimental-strip-types lab/experiments/EXP-DX1/h5/observe.mjs --world w0 --lane datomic --composition reach --output runs/DX-H5-vm/receipt.json --rung 1000 --scope "dxb8-w0-v6-$arm" --g0-only > "$log" 2>&1
done
printf '{"completed":true,"kind":"W0 paired execution complete; fingerprint verification separate"}\n' > "$root/w0-v6-pair-complete.json"

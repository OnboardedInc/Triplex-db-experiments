#!/usr/bin/env bash
# [DX-S5] Why: execute the target-head readiness gate in the owned network with bounded fetches.
# Rejected: host ports and another daemon, which would not bind the observation to this slot.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
prefix=${1:?prefix}; db=${2:-}; minimum=${3:-0}; roles=${4:-w,r}
python3 - "$prefix" <<'PYLOCK'
import json,os,re,sys
p=sys.argv[1];s=json.load(open('/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json'))
assert s['id']=='DX-S5'
if s['kind'].startswith('seed-'):assert p=='tx2-dxs5-'+s['kind']
else:assert s['kind']=='evaluation' and re.fullmatch(r'tx2-dxs5-[a-z0-9-]+',p)
os.kill(s['pid'],0)
PYLOCK
docker run --rm --pull never --name "$prefix-copy" --network "$prefix-net" \
 -v "$PWD/lab/experiments/EXP-DX1/s5:/s5:ro" node:22.23.2-bookworm-slim \
 node /s5/wait-ready.mjs "$prefix" "$db" "$minimum" "$roles"

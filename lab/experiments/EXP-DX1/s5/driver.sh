#!/usr/bin/env bash
# [DX-S5] Why: provide an explicit resume command inside the existing owned hold. Rejected: creating a container outside the measurement lock.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
n=${1:?subjects}; end=${2:?end subjects}; mode=${3:-seed}
[[ $n == 1000 || $n == 10000 || $n == 100000 ]] || exit 2
prefix=tx2-dxs5-seed-$n; scope=dxs5-w0-$n-v1; repo=$PWD
python3 - "$n" <<'PYLOCK'
import json,os,sys
r=json.load(open('/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json'))
assert r['id']=='DX-S5' and r['kind']=='seed-'+sys.argv[1];os.kill(r['pid'],0)
PYLOCK
 docker run --rm --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory 11g --memory-swap 11g \
 -v "$repo:$repo:ro" -v "$prefix-tools:/state" -w "$repo" \
 -e "S5_REQUIRE_RECOVERED=${S5_REQUIRE_RECOVERED:-0}" -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" -e TRIPLEX_DATOMIC_LAYOUT=lean -e TX2_SWEEP_STRICT=1 \
 node:22.23.2-bookworm-slim node --experimental-strip-types lab/experiments/EXP-DX1/s5/seed.ts "$scope" "$n" "$end" "$mode"

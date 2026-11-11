#!/usr/bin/env bash
# [DX-S5] Why: provide an explicit resume command inside the existing owned hold. Rejected: creating a container outside the measurement lock.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
n=${1:?subjects}; end=${2:?end subjects}; mode=${3:-seed}
[[ $n == 1000 || $n == 10000 || $n == 100000 ]] || exit 2
[[ $mode == seed || $mode == verify ]] || exit 2
prefix=tx2-dxs5-seed-$n; scope=dxs5-w0-$n-v1; repo=$PWD
python3 - "$n" <<'PYLOCK'
import json,os,sys
r=json.load(open('/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json'))
assert r['id']=='DX-S5' and r['kind']=='seed-'+sys.argv[1];os.kill(r['pid'],0)
PYLOCK
# [DX-S5] Why: the idle read peer consumed nearly two cores following writes; park it until exact readback.
# Rejected: paying that cost throughout seeding or making any readback use a missing/stale peer.
if [[ $mode == seed ]]; then
 if [[ $(docker inspect --format '{{.State.Running}}' "$prefix-gw-r") == true ]]; then docker stop -t 3 "$prefix-gw-r"; fi
else
 docker start "$prefix-gw-r"
 docker run --rm --pull never --name "$prefix-copy" --network "$prefix-net" node:22.23.2-bookworm-slim node -e '
 let ok=false; for(let i=0;i<180;i++){try{const r=await fetch("http://"+process.argv[1]+":8080/health");if(r.ok){console.log(await r.text());ok=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}if(!ok)process.exit(1);' "$prefix-gw-r"
fi
# [DX-S5] Why: seed preparation uses one main CPU; leave separate cores for the writer peer.
# Rejected: a saturated one-core writer beside three mostly idle driver cores.
 docker run --rm --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus 6,7 --memory 11g --memory-swap 11g \
 -v "$repo:$repo:ro" -v "$prefix-tools:/state" -w "$repo" \
 -e "S5_REQUIRE_RECOVERED=${S5_REQUIRE_RECOVERED:-0}" -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" -e TRIPLEX_DATOMIC_LAYOUT=lean -e TX2_SWEEP_STRICT=1 \
 node:22.23.2-bookworm-slim node --experimental-strip-types lab/experiments/EXP-DX1/s5/seed.ts "$scope" "$n" "$end" "$mode"

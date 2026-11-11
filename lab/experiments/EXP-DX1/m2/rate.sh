#!/usr/bin/env bash
# [DX-M2] Why: B10's reference-world check qualifies each window-32 diagnostic independently.
# Rejected: comparing unverified seed ACK counters or claiming this 1k diagnostic is the 10k trace.
set -euo pipefail
prefix=${1:?owned prefix}
[[ $prefix =~ ^tx2-dxm2-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
docker volume create "$prefix-driver" >/dev/null
# Resolve only the exact owned transactor ID; the daemon mounts this guest path read-only.
txid=$(docker inspect --format '{{.Id}}' "$prefix-tx")
cgroup=$(docker run --rm --pull never --name "$prefix-cgroups" --cgroupns host -v /sys/fs/cgroup:/sys/fs/cgroup:ro node:22.23.2-bookworm-slim node -e '
const fs=require("fs"),id=process.argv[1];
function find(root,depth=0) { if(depth>5)return; for(const d of fs.readdirSync(root,{withFileTypes:true})) {if(!d.isDirectory())continue; const p=root+"/"+d.name;if(d.name.includes(id)&&fs.existsSync(p+"/cpu.stat"))return p;const r=find(p,depth+1);if(r)return r;}}
const path=find("/sys/fs/cgroup");if(!path)throw Error("owned transactor cgroup missing");console.log(path);' "$txid")
for arm in A1 B1 A2 B2; do
 enabled=false; [[ $arm == A* ]] || enabled=true
 echo "$arm preceding write-gateway GC"
 docker exec "$prefix-gw-w" sh -c 'for file in /tmp/gc.log*; do if [ -f "$file" ]; then echo "$file"; cat "$file"; fi; done'
 python3 lab/experiments/EXP-DX1/m2/restart-write.py "$prefix" "$enabled"
 echo "$arm CPU-before $(date -u +%FT%TZ)"
 docker exec "$prefix-tx" cat /sys/fs/cgroup/cpu.stat
 docker run --rm --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory 5g --memory-swap 5g \
  -v "$PWD:$PWD:ro" -w "$PWD" -v "$prefix-driver:/driver" -v "$cgroup:/tx-cpu:ro" \
  -e DATOMIC_URL="http://$prefix-gw-w:8080" -e DATOMIC_READ_URLS="http://$prefix-gw-r:8080" \
  -e TRIPLEX_DATOMIC_LAYOUT=lean -e TX2_W0_COUNT_CONCURRENCY=64 -e TX2_SWEEP_STRICT=1 \
  node:22.23.2-bookworm-slim node --experimental-strip-types lab/experiments/EXP-DX1/m2/rate.ts "$arm"
 echo "$arm CPU-after $(date -u +%FT%TZ)"
 docker exec "$prefix-tx" cat /sys/fs/cgroup/cpu.stat
done

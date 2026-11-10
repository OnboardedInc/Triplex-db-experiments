#!/usr/bin/env bash
# [DX-H3] Why: cleanup precedes measurement-lock release. Rejected: abandoned engines outside a lease.
set -euo pipefail
kind=${1:?functional|medium|real}; prefix=${2:?prefix}; shift 2
[[ $prefix =~ ^tx2-dxh3-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export DX_STACK_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3
out=$DX_STACK_EVIDENCE/$prefix; mkdir -p "$out"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false
cleanup() {
  rc=$?; trap - EXIT
  for role in gw-w gw-r tx pg; do docker logs --timestamps "$prefix-$role" > "$out/$role.log" 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes
  docker volume rm "$prefix-driver" > "$out/volume-cleanup.txt" 2>&1 || true
  docker ps -a --filter "name=$prefix" --format '{{.Names}}' > "$out/remaining-containers.txt"
  docker network ls --filter "name=$prefix" --format '{{.Name}}' > "$out/remaining-networks.txt"
  docker volume ls --filter "name=$prefix" --format '{{.Name}}' > "$out/remaining-volumes.txt"
  if [[ -s $out/remaining-containers.txt || -s $out/remaining-networks.txt || -s $out/remaining-volumes.txt ]]; then echo 'cleanup incomplete; retain lock' >&2; exit 1; fi
  if [[ $held == true ]]; then rm "$lock/owner.json"; rmdir "$lock"; fi
  exit "$rc"
}
# Retain initial resource observations before any owned container starts.
df -k . > "$out/disk-before.txt"
docker stats --no-stream --format '{{json .}}' > "$out/stats-before.jsonl"
python3 - "$out" <<'PY'
import json,re,sys,shutil
rows=[json.loads(l) for l in open(sys.argv[1]+'/stats-before.jsonl')]
units={'B':1,'KiB':1024,'MiB':1024**2,'GiB':1024**3}
used=0
for r in rows:
 m=re.search(r'([\d.]+)([KMG]?i?B)',r['MemUsage'].split('/')[0].strip()); used+=float(m[1])*units[m[2]]
assert 20*1024**3-used>=8*1024**3, 'less than 8 GiB VM memory free'
assert shutil.disk_usage('.').free>=5*1024**3, 'less than 5 GiB host disk free'
PY
if [[ $kind != functional ]]; then
  while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
  held=true; printf '{"id":"DX-H3","prefix":"%s","kind":"%s"}\n' "$prefix" "$kind" > "$lock/owner.json"
fi
trap cleanup EXIT
if [[ $kind == functional ]]; then
  export DX_TX_HEAP=1g DX_TX_MEMORY=1500m DX_GW_WRITE_HEAP=768m DX_GW_READ_HEAP=768m TX2_ENGINE_CPUS=1
  cpus=(--cpus-tx 6 --cpus-pg 6 --cpus-gw-write 6 --cpus-gw-read 6)
else
  export TX2_ENGINE_CPUS=5
  cpus=(--cpus-tx 0,1 --cpus-pg 0 --cpus-gw-write 2 --cpus-gw-read 3,4)
  if [[ $kind == real ]]; then
    export DX_TX_HEAP=4g DX_TX_MEMORY=5g DX_GW_WRITE_HEAP=2g DX_GW_WRITE_MEMORY=2500m DX_GW_READ_HEAP=3g DX_GW_READ_MEMORY=3500m DX_PG_MEMORY=2g DX_OBJECT_CACHE=1g DX_INDEX_THRESHOLD=256m DX_INDEX_MAX=1g
  fi
fi
bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --no-publish "${cpus[@]}" > "$out/up.log" 2>&1
bash lab/experiments/EXP-DX1/stack/run-in-vm.sh "$prefix" -- node lab/experiments/EXP-DX1/h3/observe.mjs \
 --lane datomic --composition reach --profile smoke --reader-threads 2 --oracle-root "$DX_STACK_EVIDENCE/oracle" --output runs/DX-H3-vm/ns-report.json "$@" > "$out/driver.log" 2>&1

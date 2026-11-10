#!/usr/bin/env bash
set -euo pipefail
prefix=${1:?prefix}; shift
[[ $prefix =~ ^tx2-dxb8-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
mkdir -p "$root"
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
started=$(date +%s)
attempt="$root/$prefix-$started"
mkdir -p "$attempt"
cp -R lab/experiments/EXP-DX1/b8 "$attempt/runner"
printf '{"id":"DX-B8","pid":%d,"startedAtSeconds":%d}\n' $$ "$started" > "$lock/owner.json"
cleanup() {
 rc=$?; trap - EXIT; kill "$watchdog" 2>/dev/null || true
 docker rm -f "$prefix-driver" "$prefix-health" "$prefix-cgroups" "$prefix-extract" "$prefix-selftest" >/dev/null 2>&1 || true
 for role in pg tx gw-w gw-r; do docker logs --timestamps "$prefix-$role" > "$attempt/$role.log" 2>&1 || true; done
 docker exec "$prefix-pg" du -sk /var/lib/postgresql/data > "$attempt/pg-size-kib.txt" 2>&1 || true
 volume_args=(--volumes); if [[ ${B8_KEEP_VOLUME:-} == 1 ]]; then volume_args=(); fi
 bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" ${volume_args[@]+"${volume_args[@]}"}
 docker volume rm "$prefix-driver" >/dev/null 2>&1 || true
 docker ps -a --filter "name=$prefix" --format '{{.Names}}' > "$root/$prefix-cleanup.txt"
 docker volume ls --filter "name=$prefix" --format '{{.Name}}' > "$attempt/volumes-retained.txt"
 python3 - "$attempt/volumes-retained.txt" "$prefix" "${B8_KEEP_VOLUME:-0}" <<'PYVOLUME'
import pathlib,sys
actual=pathlib.Path(sys.argv[1]).read_text().splitlines()
allowed=[sys.argv[2]+'-pg-data'] if sys.argv[3]=='1' else []
assert all(v in allowed for v in actual), (actual,allowed)
PYVOLUME
 docker network ls --filter "name=$prefix" --format '{{.Name}}' >> "$root/$prefix-cleanup.txt"
 [[ ! -s "$root/$prefix-cleanup.txt" ]] || { echo 'Cleanup incomplete; retaining lock'; exit 1; }
 python3 - "$lock/owner.json" "$$" <<'PY'
import sys,json
v=json.load(open(sys.argv[1]));assert v['id']=='DX-B8' and v['pid']==int(sys.argv[2])
PY
 printf '{"childExitCode":%d,"heldSeconds":%d,"containersAndNetworksEmpty":true,"retainedVolumesIndex":"volumes-retained.txt","semanticVerdict":null}\n' "$rc" "$(( $(date +%s) - started ))" > "$attempt/cleanup.json"
 rm "$lock/owner.json"; rmdir "$lock"; exit "$rc"
}
# [DX-B8] Why: include engine startup and cleanup in the fifteen-minute lease. Rejected: bounding only the benchmark.
(sleep 870; kill -TERM $$) & watchdog=$!
trap cleanup EXIT
trap 'exit 124' TERM INT
export DX_STACK_EVIDENCE="$root"
src=(); if [[ -n ${B8_GATEWAY_SRC:-} ]]; then src=(--gateway-src "$B8_GATEWAY_SRC"); fi
ports=(--no-publish); if [[ ${B8_HOST_GATES:-} == 1 ]]; then ports=(--port-write 8526 --port-read 8527); fi
bash lab/experiments/EXP-DX1/b8/up.sh "$prefix" "${ports[@]}" ${src[@]+"${src[@]}"} --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write 1 --cpus-gw-read 2,3 --pg-memory 1g --tx-memory 4g --gw-memory 3g --tx-java-opts '-Xms1g -Xmx3g' --gw-java-opts "-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g -Dtriplex.entityCacheVerify=${B8_CACHE_VERIFY:-false}" --object-cache-max 1g --memory-index-threshold 256m --memory-index-max 1g
export DX_DRIVER_ENV="DATOMIC_INTEGRATION=1 TRIPLEX_DATOMIC_LAYOUT=lean B8_LABEL=${B8_LABEL:-before} B8_HEADS=${B8_HEADS:-1000,50000,250000,500000} B8_SECONDS=${B8_SECONDS:-680}"
if [[ ${B8_HOST_GATES:-} == 1 ]]; then
 export DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8526 DATOMIC_URL=http://127.0.0.1:8526 DATOMIC_READ_URLS=http://127.0.0.1:8527
 node lab/experiments/EXP-DX1/b6/bounded-command.mjs "$(( 825 - $(date +%s) + started ))" "$@"
else
 node lab/experiments/EXP-DX1/b6/bounded-command.mjs "$(( 825 - $(date +%s) + started ))" env DX_STACK_EVIDENCE="$attempt" bash lab/experiments/EXP-DX1/stack/run-in-vm.sh "$prefix" --cpus 4,5,6,7 --memory 5g -- "$@"
fi

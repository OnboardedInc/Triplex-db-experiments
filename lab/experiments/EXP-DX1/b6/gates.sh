#!/usr/bin/env bash
set -euo pipefail
prefix=${1:?prefix}; shift
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
mkdir -p "$root"
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"DX-B6","pid":%d}\n' $$ > "$lock/owner.json"
cleanup() {
  rc=${1:-$?}
  trap - EXIT
  docker rm -f "$prefix-driver" "$prefix-health" "$prefix-cgroups" "$prefix-extract" >/dev/null 2>&1 || true
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes
  docker volume rm "$prefix-driver" >/dev/null 2>&1 || true
  docker ps -a --filter "name=$prefix" --format '{{.Names}}' > "$root/$prefix-cleanup.txt"
  docker volume ls --filter "name=$prefix" --format '{{.Name}}' >> "$root/$prefix-cleanup.txt"
  docker network ls --filter "name=$prefix" --format '{{.Name}}' >> "$root/$prefix-cleanup.txt"
  rm "$lock/owner.json"; rmdir "$lock"
  exit "$rc"
}
trap cleanup EXIT
# [DX-B6] Why: enforce the complete lock hold, including startup and cleanup. Rejected: timing only the driver.
(sleep 870; kill -TERM $$) & watchdog=$!
finish() { result=$?; kill "$watchdog" 2>/dev/null || true; cleanup "$result"; }
trap finish EXIT
export DX_STACK_EVIDENCE="$root"
python3 lab/experiments/EXP-DX1/b6/capture.py "$root/$prefix-source"
started=$(date +%s)
publish=(--no-publish); if [[ ${B6_HOST_GATES:-} == 1 ]]; then publish=(--port-write 8516 --port-read 8517); fi
bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" "${publish[@]}" --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write 1 --cpus-gw-read 2,3 --pg-memory 1g --tx-memory 4g --gw-memory 3g --tx-java-opts '-Xms1g -Xmx3g' --gw-java-opts '-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g' --object-cache-max 1g --memory-index-threshold 256m --memory-index-max 1g
export DX_DRIVER_ENV='DATOMIC_INTEGRATION=1 TRIPLEX_DATOMIC_LAYOUT=lean'
if [[ ${B6_HOST_GATES:-} == 1 ]]; then
 export DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8516 DATOMIC_URL=http://127.0.0.1:8516 DATOMIC_READ_URLS=http://127.0.0.1:8517
 node lab/experiments/EXP-DX1/b6/bounded-command.mjs "$((830 - $(date +%s) + started))" "$@"
else
 node lab/experiments/EXP-DX1/b6/bounded-command.mjs "$((830 - $(date +%s) + started))" bash lab/experiments/EXP-DX1/stack/run-in-vm.sh "$prefix" --cpus 4,5,6,7 --memory 5g -- "$@"
fi

#!/usr/bin/env bash
# [DX-B10] Why: bound owned container lifetime and remove it on TERM. Rejected: persistent test stacks.
set -euo pipefail
prefix=${1:?}; shift
[[ $prefix =~ ^tx2-dxb10-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export DX_STACK_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B10
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
started=$(date +%s)
job=
export B10_HOLD_STARTED=$started
printf '{"id":"DX-B10","pid":%d}\n' $$ > "$lock/owner.json"
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ -z $job ]] || { kill -TERM "$job" 2>/dev/null || true; wait "$job" || true; }
 kill "$timer" 2>/dev/null || true
 for role in driver health selftest extract; do docker rm -f "$prefix-$role" >/dev/null 2>&1 || true; done
 docker exec "$prefix-pg" du -sk /var/lib/postgresql/data || true
 bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes
 docker volume rm "$prefix-driver" "$prefix-tools" >/dev/null 2>&1 || true
 rm "$lock/owner.json"; rmdir "$lock"
 exit "$rc"
}
trap cleanup EXIT
trap 'exit 124' TERM INT
(sleep 850; kill -TERM $$) & timer=$!
[[ $(df -k /System/Volumes/Data | awk 'NR==2 {print $4}') -ge 15728640 ]] || exit 2
export B8_GATEWAY_SRC="$PWD/packages/datomic/gateway" B8_CACHE_VERIFY=${B10_CACHE_VERIFY:-true}
ports=(--port-write 8526 --port-read 8527); [[ ${B10_VM:-0} != 1 ]] || ports=(--no-publish)
bash lab/experiments/EXP-DX1/b10/up.sh "$prefix" "${ports[@]}" --gateway-src "$B8_GATEWAY_SRC" --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write 1 --cpus-gw-read 2,3 --pg-memory 1g --tx-memory 4g --gw-memory 3g --tx-java-opts '-Xms1g -Xmx3g' --gw-java-opts '-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g' --object-cache-max 1g --memory-index-threshold 256m --memory-index-max 1g
export DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8526 DATOMIC_URL=http://127.0.0.1:8526 DATOMIC_READ_URLS=http://127.0.0.1:8527
node lab/experiments/EXP-DX1/b6/bounded-command.mjs "$((800 - $(date +%s) + started))" "$@" & job=$!
wait "$job"

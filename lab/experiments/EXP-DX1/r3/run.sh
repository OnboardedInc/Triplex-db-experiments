#!/usr/bin/env bash
# [DX-R3] Why: a bounded measurement lease owns the entire stack until cleanup completes.
# Rejected: keeping a warm seed stack outside the shared measurement lock.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
mode=${1:?differential|benchmark|both|compare}; attempt=${2:?fresh attempt name}
[[ $mode == differential || $mode == benchmark || $mode == both || $mode == compare ]] || exit 2
[[ $attempt =~ ^[a-z0-9-]+$ ]] || exit 2
prefix=tx2-dxr3-$attempt
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
repo=$PWD
operational=$(mktemp -d /tmp/tx2-dxr3-XXXXXX)
held=false; owned=false; job=
cleanup() {
  rc=$?; trap - EXIT TERM INT
  if [[ -n $job ]]; then kill -TERM "$job" 2>/dev/null || true; wait "$job" || true; fi
  if [[ $held == true ]]; then
    if [[ $owned == true ]]; then
    for role in driver health extract gw-r gw-w tx pg; do
      if docker container inspect "$prefix-$role" >/dev/null 2>&1; then docker rm -f "$prefix-$role"; fi
    done
    docker network rm "$prefix-net" || true
    docker volume rm "$prefix-pg-data" "$prefix-driver" || true
    remaining=$(docker ps -a --filter "name=$prefix" --format '{{.Names}}') || { echo 'container inventory failed, retaining lock'; exit 1; }
    [[ -z $remaining ]] || { echo 'cleanup incomplete, retaining lock'; exit 1; }
    remaining=$(docker volume ls --filter "name=$prefix" --format '{{.Name}}') || { echo 'volume inventory failed, retaining lock'; exit 1; }
    [[ -z $remaining ]] || { echo 'owned volumes remain, retaining lock'; exit 1; }
    remaining=$(docker network ls --filter "name=$prefix" --format '{{.Name}}') || { echo 'network inventory failed, retaining lock'; exit 1; }
    [[ -z $remaining ]] || { echo 'owned networks remain, retaining lock'; exit 1; }
    fi
    rm "$lock/owner.json"; rmdir "$lock"
  fi
  rm -rf "$operational"
  echo "DX-R3 $mode $attempt exit=$rc"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
python3 - <<'PY'
import shutil
assert shutil.disk_usage('.').free >= 15*1024**3, 'requires 15 GiB free'
PY
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
held=true
printf '{"id":"DX-R3","pid":%s}\n' "$$" > "$lock/owner.json"
python3 - <<'PY'
import shutil
assert shutil.disk_usage('.').free >= 15*1024**3, 'requires 15 GiB free at admission'
PY
# [DX-R3] Why: cleanup may remove only resources proven absent before this attempt.
# Rejected: adopting an existing prefix when a failed preflight reaches the exit trap.
for role in driver health extract gw-r gw-w tx pg; do
  if docker container inspect "$prefix-$role" >/dev/null 2>&1; then echo "refuse existing $prefix-$role"; exit 2; fi
done
for name in "$prefix-pg-data" "$prefix-driver"; do
  if docker volume inspect "$name" >/dev/null 2>&1; then echo "refuse existing $name"; exit 2; fi
done
if docker network inspect "$prefix-net" >/dev/null 2>&1; then echo "refuse existing network"; exit 2; fi
owned=true
export DX_R3_OPERATIONAL=$operational DX_R3_PREFIX=$prefix DX_R3_MODE=$mode
node lab/experiments/EXP-DX1/b6/bounded-command.mjs 1140 bash lab/experiments/EXP-DX1/r3/work.sh & job=$!
wait "$job"

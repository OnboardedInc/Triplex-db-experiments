#!/usr/bin/env bash
# [DX-H7] Why: keep both diagnostic arms on one seeded stack and release every owned container before the lock.
# Rejected: a surviving stack between arms (would outlive its measurement lease).
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
prefix=${DX_H7_PREFIX:-tx2-dxh7-q1}
[[ $prefix == tx2-dxh7-* ]] || exit 2
repo=$PWD
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H7
export DX_STACK_EVIDENCE="$root/setup"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"DX-H7","pid":%s}\n' "$$" > "$lock/owner.json"
cleanup() {
  rc=$?; trap - EXIT TERM INT
  if [[ -n ${job:-} ]]; then kill -TERM "$job" 2>/dev/null || true; wait "$job" || true; fi
  for role in driver health extract; do docker rm -f "$prefix-$role" >/dev/null 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes
  docker volume rm "$prefix-driver" >/dev/null 2>&1 || true
  remaining=$(docker ps -a --filter "name=$prefix" --format '{{.Names}}')
  [[ -z $remaining ]] || { echo "owned containers remain; retain lock: $remaining"; exit 1; }
  rm -f lab/experiments/EXP-DX1/h7/.after-ready lab/experiments/EXP-DX1/h7/.optimized-ready
  rm -f "$lock/owner.json"; rmdir "$lock"
  exit "$rc"
}
job=
trap cleanup EXIT
trap 'exit 143' TERM INT
python3 - <<'PY'
import shutil
assert shutil.disk_usage('.').free >= 15*1024**3, 'requires 15 GiB free'
PY
node lab/experiments/EXP-DX1/b6/bounded-command.mjs 1140 bash lab/experiments/EXP-DX1/h7/work.sh & job=$!
wait "$job"

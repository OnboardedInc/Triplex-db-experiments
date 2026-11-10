#!/usr/bin/env bash
# [DX-S4] Why: freeze controller files before waiting on either scheduler, so later edits cannot alter a queued attempt. Rejected: copying mutable files only after the lock is acquired.
set -euo pipefail
prefix=${1:?PREFIX SCRIPT.sh [args...]};script=${2:?SCRIPT.sh};shift 2
[[ $prefix =~ ^tx2-dxs4-[a-z0-9-]+$ && $script =~ ^[a-z0-9-]+\.sh$ ]] || exit 2
here=$(cd "$(dirname "$0")" && pwd);repo=$(cd "$here/../../../.." && pwd)
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
python3 - <<'PY'
import shutil
assert shutil.disk_usage('.').free>=5*1024**3,'host disk under 5 GiB'
PY
# [DX-S4] Why: a new prefix must not adopt or remove pre-existing resources. Rejected: relying on idempotent docker volume create to prove freshness.
[[ -z $(docker ps -a --filter "name=^/${prefix}-" -q) ]] || exit 2
[[ -z $(docker volume ls --filter "name=^${prefix}-" -q) ]] || exit 2
[[ -z $(docker network ls --filter "name=^${prefix}-" -q) ]] || exit 2
src=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/launches/$prefix
mkdir -p "$(dirname "$src")";mkdir "$src"
cp "$here/"*.sh "$here/"*.py "$here/"*.sql "$here/"*.clj "$here/"*.mjs "$here/"*.yaml "$src/"
[[ -f $src/$script ]] || exit 2
cd "$repo"
exec node "$repo/lab/bin/heavy.mjs" --label "$prefix" -- bash "$src/window.sh" "$prefix" bash "$src/$script" "$@"

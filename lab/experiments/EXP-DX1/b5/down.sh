#!/usr/bin/env bash
set -euo pipefail
prefix=${1:?usage: down.sh PREFIX [--volumes]}
[[ "$prefix" =~ ^tx2-dxb5-[a-z0-9-]+$ ]] || { echo "DX stack accepts only tx2-dx* prefixes" >&2; exit 2; }
[[ $# == 1 || ($# == 2 && $2 == --volumes) ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
for role in gw-r gw-w tx pg; do
  docker rm -f "$prefix-$role" >/dev/null 2>&1 || true
done
docker network rm "$prefix-net" >/dev/null 2>&1 || true
# [DX-B5] Why: the outer exit trap may run after the owned stack was already removed before mutants.
# Rejected: failing on a second volume removal and skipping the required fresh inventory readback.
# Callers still require successful empty inventories; an unavailable daemon cannot establish cleanup.
if [[ ${2:-} == --volumes ]] && docker volume inspect "$prefix-pg-data" >/dev/null 2>&1; then
  docker volume rm "$prefix-pg-data"
fi

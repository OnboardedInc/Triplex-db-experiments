#!/usr/bin/env bash
set -euo pipefail
prefix=${1:?usage: down.sh PREFIX [--volumes]}
[[ "$prefix" =~ ^tx2-dx[a-z0-9-]+$ ]] || { echo "DX stack accepts only tx2-dx* prefixes" >&2; exit 2; }
[[ $# == 1 || ($# == 2 && $2 == --volumes) ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
for role in gw-r gw-w tx pg; do
  docker rm -f "$prefix-$role" >/dev/null 2>&1 || true
done
docker network rm "$prefix-net" >/dev/null 2>&1 || true
if [[ ${2:-} == --volumes ]]; then docker volume rm "$prefix-pg-data"; fi

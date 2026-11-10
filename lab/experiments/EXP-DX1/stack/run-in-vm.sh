#!/usr/bin/env bash
# [DX-H3] Why: direct VM networking avoids Lima SSH forwarding and disk-backed SQLite avoids virtiofs fsync.
# Rejected: host load generation (one failed tunnel invalidates all endpoints).
set -euo pipefail
prefix=${1:?usage: run-in-vm.sh PREFIX [--cpus LIST] [--memory SIZE] -- COMMAND...}; shift
[[ $prefix =~ ^tx2-dxh3-[a-z0-9-]+$ ]] || exit 2
cpus=6,7 memory=3g
while [[ ${1:-} != -- ]]; do
  case ${1:-} in --cpus) cpus=$2;; --memory) memory=$2;; *) exit 2;; esac
  shift 2
done
shift
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
evidence=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/$prefix
mkdir -p "$evidence/driver"
docker image inspect node:22.23.2-bookworm-slim >/dev/null
docker volume create "$prefix-driver" >/dev/null
cgroups=
for role in pg tx gw-w gw-r; do
  name=$prefix-$role
  # Docker exec resolves the host cgroup path without mounting the socket in the driver.
  cg=$(docker exec "$name" cat /proc/self/cgroup | sed -n 's/^0:://p')
  [[ $cg == /* && $cg != / && $cg != *..* ]] || { echo "unusable cgroup: $name $cg" >&2; exit 1; }
  cgroups+=${cgroups:+,}"$name=/sys/fs/cgroup$cg"
done
cleanup() {
  rc=$?
  trap - EXIT
  # Copy even after command failure; retain container and volume if copy fails.
  docker cp "$prefix-driver:/driver/." "$evidence/driver/" || exit 1
  docker rm -f "$prefix-driver" >/dev/null
  exit "$rc"
}
trap cleanup EXIT
# The lexical output remains under runs/; that directory is a real Docker volume during execution.
docker create --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus "$cpus" --memory "$memory" --memory-swap "$memory" \
  --cgroupns host -v /sys/fs/cgroup:/sys/fs/cgroup:ro -v "$repo:$repo" \
  -v /Users/sam/Claude/Projects/triplex-db-2/evidence:/Users/sam/Claude/Projects/triplex-db-2/evidence \
  -v "$prefix-driver:/driver" -v "$prefix-driver:$repo/runs/DX-H3-vm" -w "$repo" \
  -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" \
  -e "TX2_ENGINE_CONTAINER=$prefix-pg,$prefix-tx,$prefix-gw-w,$prefix-gw-r" \
  -e "TX2_ENGINE_CGROUPS=$cgroups" -e "TX2_ENGINE_CPUS=${TX2_ENGINE_CPUS:-1}" \
  node:22.23.2-bookworm-slim "$@" >/dev/null
docker start -a "$prefix-driver"

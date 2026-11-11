#!/usr/bin/env bash
# [DX-M2] Why: alternate rate arms in one bounded hold after source-bound equality gates.
# Rejected: comparing arm samples collected across different holds.
set -euo pipefail
if [[ ${M2_OWNED_CHILD:-0} != 1 ]]; then
 exec node --experimental-strip-types lab/experiments/EXP-DX1/m2/run-owned.ts bash "$0" "$@"
fi
prefix=${1:?owned prefix}
[[ $prefix =~ ^tx2-dxm2-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
# Gate work files are temporary; only this run's command output is retained.
export DATOMIC_ROUTE_EVIDENCE_DIR="$DX_STACK_EVIDENCE/$prefix/oracle"
# [DX-M2] Why: GC files must survive disposal as raw command output, including rotations.
# Rejected: enabling GC logging and discarding the only observed pause bytes.
finish() {
 rc=$?; trap - EXIT TERM INT
 for role in tx gw-w gw-r; do
  echo "GC log $prefix-$role"
  docker exec "$prefix-$role" sh -c 'for file in /tmp/gc.log*; do if [ -f "$file" ]; then echo "$file"; cat "$file"; fi; done' || true
 done
 exit "$rc"
}
trap finish EXIT
trap 'exit 124' TERM INT
for role in tx gw-w gw-r pg; do
 docker inspect --format '{{.Name}} {{.Id}} {{.Image}} {{.HostConfig.CpusetCpus}} {{.HostConfig.Memory}}' "$prefix-$role"
 if [[ $role != pg ]]; then
  docker exec "$prefix-$role" sh -c 'printf "%s\n" "$JAVA_OPTS" "${DATOMIC_JAVA_OPTS:-}" "${GATEWAY_SOURCE_SHA256:-}"'
 fi
done
# Equality/order/lean gates passed at the same gateway source identity in gates1.
# [DX-M2] Why: spend this lease on matched rate arms, not an unchanged nine-minute suite rerun.
# Rejected: repeating already-passing source-bound checks before every timing sample.
git rev-parse HEAD
# [DX-M2] Why: changing peer CPU concurrency gets a fresh real reordered-arrival check.
# Rejected: assuming a single-core ordering sample covers this physical profile.
if [[ ${M2_ORDER_BEFORE_RATE:-0} == 1 ]]; then
 bash lab/experiments/EXP-DX1/m2/gates.sh order
fi
bash lab/experiments/EXP-DX1/m2/rate.sh "$prefix"

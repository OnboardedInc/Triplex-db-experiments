#!/usr/bin/env bash
# [DX-M2] Why: share one bounded hold across native and unchanged HTTP gates.
# Rejected: spending another lease just to repeat stack startup between correctness slices.
set -euo pipefail
if [[ ${M2_OWNED_CHILD:-0} != 1 ]]; then
 exec node --experimental-strip-types lab/experiments/EXP-DX1/m2/run-owned.ts bash "$0" "$@"
fi
gate_started=$(date +%s)
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
docker run --rm --pull never --name "$prefix-native" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory 3g --memory-swap 3g \
 -v "$PWD/packages/datomic/gateway:/opt/gateway:ro" -v "$PWD/packages/datomic/src/codec-spec.json:/opt/spec/codec-spec.json:ro" \
 -v "$PWD/lab/experiments/EXP-DX1/m2:/opt/m2:ro" \
 -e DATOMIC_JAVA_OPTS=-Dtriplex.codec.spec=/opt/spec/codec-spec.json -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src:/opt/m2 \
 -e "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic" --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m hints-test
bash lab/experiments/EXP-DX1/m2/gates.sh diff
bash lab/experiments/EXP-DX1/m2/gates.sh order
bash lab/experiments/EXP-DX1/m2/gates.sh base
# [DX-M2] Why: only measure after equality gates, leaving a conservative budget for all four arms.
# Rejected: beginning an inevitably truncated rate comparison late in the lease.
if (( $(date +%s) - gate_started < 300 )); then
 bash lab/experiments/EXP-DX1/m2/rate.sh "$prefix"
else
 echo 'Rate alternations not started: correctness gates consumed the measurement budget.'
fi

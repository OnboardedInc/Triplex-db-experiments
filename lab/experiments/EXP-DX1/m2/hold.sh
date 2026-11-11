#!/usr/bin/env bash
# [DX-M2] Why: no owned container survives a bounded measurement lease. Rejected: persistent tuning stacks.
set -euo pipefail
mode=${1:?native|stack}; id=${2:?fresh id}; shift 2
[[ $id =~ ^[a-z0-9-]+$ && $mode =~ ^(native|stack)$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export DX_STACK_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-M2/setup
prefix=tx2-dxm2-$id
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; timer=; child=
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ -z $child ]] || { kill -TERM "$child" 2>/dev/null || true; sleep 1; kill -KILL "$child" 2>/dev/null || true; wait "$child" || true; }
 [[ -z $timer ]] || kill "$timer" 2>/dev/null || true
 if [[ $held == true ]]; then
  if [[ $mode == stack ]]; then
   for role in tx gw-w gw-r; do docker logs --timestamps "$prefix-$role" || true; done
  fi
  for role in native driver health cgroups extract; do docker rm -f "$prefix-$role" >/dev/null 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes
  docker volume rm "$prefix-driver" >/dev/null 2>&1 || true
  remaining=$(docker ps -a --filter "name=$prefix" --format '{{.Names}}'; docker volume ls --filter "name=$prefix" --format '{{.Name}}'; docker network ls --filter "name=$prefix" --format '{{.Name}}')
  echo "remaining=$remaining"
  [[ -z $remaining ]] || { echo 'cleanup incomplete; retaining lock'; exit 1; }
  sh lab/bin/host-quiet.sh || true
  rm "$lock/owner.json"; rmdir "$lock"
  # Only transient configuration produced by this owned attempt; raw command output is retained.
  rm -rf "$DX_STACK_EVIDENCE/$prefix"
  echo "hold end $(date -u +%FT%TZ)"
 fi
 exit "$rc"
}
trap cleanup EXIT; trap 'exit 124' TERM INT
python3 - <<'PY'
import shutil
assert shutil.disk_usage('/System/Volumes/Data').free>=15*1024**3
assert shutil.disk_usage('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-M2').free>=15*1024**3
PY
until mkdir "$lock" 2>/dev/null; do
 if [[ -n ${M2_ADMIT_UNTIL:-} && $(date +%s) -ge $M2_ADMIT_UNTIL ]]; then echo 'admission cutoff'; exit 124; fi
 sleep 5
done
held=true
printf '{"id":"DX-M2","pid":%d}\n' $$ > "$lock/owner.json"
echo "hold begin $(date -u +%FT%TZ)"
sh lab/bin/host-quiet.sh || true
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),1150000)' "$$" & timer=$!
python3 -c 'import shutil; assert shutil.disk_usage("/System/Volumes/Data").free>=15*1024**3'
if [[ $mode == native ]]; then
 docker run --rm --pull never --name "$prefix-native" --cpuset-cpus 4,5,6,7 --memory 3g --memory-swap 3g \
  -v "$PWD/packages/datomic/gateway:/opt/gateway:ro" -v "$PWD/packages/datomic/src/codec-spec.json:/opt/spec/codec-spec.json:ro" \
  -v "$PWD/lab/experiments/EXP-DX1/m2:/opt/m2:ro" \
  -e DATOMIC_JAVA_OPTS=-Dtriplex.codec.spec=/opt/spec/codec-spec.json -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src:/opt/m2 \
  -e 'DATOMIC_URI_TEMPLATE=datomic:mem://{db}' --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m hints-test & child=$!
else
 bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --gateway-src "$PWD/packages/datomic/gateway" --codec-spec "$PWD/packages/datomic/src/codec-spec.json" \
  --port-write 8546 --port-read 8547 --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write "${M2_GW_WRITE_CPUS:-2}" --cpus-gw-read 3 \
  --gw-java-opts '-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=50 -Ddatomic.objectCacheMax=1g' \
  --pg-memory 2g --tx-memory 4g --gw-memory 3g
 export DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8546 DATOMIC_URL=http://127.0.0.1:8546 DATOMIC_READ_URLS=http://127.0.0.1:8547 DATOMIC_TEST_LAYOUT=lean
 "$@" & child=$!
fi
wait "$child"; child=

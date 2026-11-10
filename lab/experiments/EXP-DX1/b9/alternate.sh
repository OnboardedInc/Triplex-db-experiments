#!/usr/bin/env bash
# [DX-B9-A] Why: A1 B1 A2 B2 share one bounded lease and identical driver bytes/topology.
# Rejected: comparing historical runs or starting any container outside the lock.
set -euo pipefail
group=${1:?frozen|mixed}; stage=${2:?immutable stage}; id=${3:?fresh id}
[[ $group == frozen || $group == mixed ]]; [[ $id =~ ^[a-z0-9-]+$ ]]
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9
out=$root/$id; mkdir "$out"
cp "$0" "$out/alternate.sh"
shasum -a256 lab/experiments/EXP-DX1/b9/{load,mixed}.mjs > "$out/driver-before.sha256"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
sh lab/bin/host-quiet.sh --wait 20 > "$out/host-before.jsonl" || true
python3 -c 'import shutil;assert shutil.disk_usage("/System/Volumes/Data").free >= 15*1024**3'
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
sh lab/bin/host-quiet.sh > "$out/host-lock-acquired.jsonl" || true
python3 -c 'import shutil;assert shutil.disk_usage("/System/Volumes/Data").free >= 15*1024**3'
started=$(date +%s); prefix=; watchdog=
printf '{"id":"DX-B9","pid":%d}\n' $$ > "$lock/owner.json"
cleanup_stack() {
 [[ -n $prefix ]] || return 0
 for role in gw-r gw-w tx pg; do docker logs --timestamps "$prefix-$role" > "$out/$prefix-$role.log" 2>&1 || true; done
 docker exec "$prefix-pg" du -sk /var/lib/postgresql/data > "$out/$prefix-size.txt" 2>&1 || true
 for role in driver health cgroups extract profile compile; do docker rm -f "$prefix-$role" >/dev/null 2>&1 || true; done
 bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >> "$out/removed.txt" 2>&1
 docker volume rm "$prefix-driver" >> "$out/removed.txt" 2>&1 || true
}
cleanup() {
 rc=$?; trap - EXIT TERM INT; [[ -z $watchdog ]] || kill "$watchdog" 2>/dev/null || true
 cleanup_stack
 docker ps -a --filter "name=tx2-dxb9-$id-" --format '{{.Names}}' > "$out/remaining.txt"
 docker network ls --filter "name=tx2-dxb9-$id-" --format '{{.Name}}' >> "$out/remaining.txt"
 docker volume ls --filter "name=tx2-dxb9-$id-" --format '{{.Name}}' >> "$out/remaining.txt"
 [[ ! -s $out/remaining.txt ]] || { echo 'cleanup incomplete; retaining lock'; exit 1; }
 printf '{"exit":%d,"heldSeconds":%d,"keepAwake":false,"semanticVerdict":null}\n' "$rc" "$(( $(date +%s)-started ))" > "$out/exit.json"
 shasum -a256 lab/experiments/EXP-DX1/b9/{load,mixed}.mjs > "$out/driver-after.sha256"
 cmp "$out/driver-before.sha256" "$out/driver-after.sha256" || rc=1
 sh lab/bin/host-quiet.sh > "$out/host-after.jsonl" || true
 python3 - "$lock/owner.json" $$ <<'PY'
import json,sys
assert json.load(open(sys.argv[1]))=={'id':'DX-B9','pid':int(sys.argv[2])}
PY
 rm "$lock/owner.json"; rmdir "$lock"; exit "$rc"
}
trap cleanup EXIT
trap 'exit 124' TERM INT
(sleep 1110; kill -TERM $$) & watchdog=$!
# [DX-B9-A] Why: fail compilation before paying for four engine arms. Rejected: discovering a key-type error at B1 startup.
if [[ -f $stage/B/src/triplex/gateway/cache_key_test.clj ]]; then
 prefix=tx2-dxb9-$id-preflight
 node lab/experiments/EXP-DX1/b6/bounded-command.mjs 60 docker run --rm --pull never --name "$prefix-compile" --network none --cpuset-cpus 4,5,6,7 --memory 1g --memory-swap 1g -v "$stage/B:/opt/gateway:ro" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e 'DATOMIC_JAVA_OPTS=-Xms128m -Xmx512m' --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.cache-key-test > "$out/key-test.log" 2>&1
 prefix=
fi
for arm in A1 B1 A2 B2; do
 prefix=tx2-dxb9-$id-$(echo "$arm" | tr '[:upper:]' '[:lower:]')
 export DX_STACK_EVIDENCE=$out/$arm; mkdir -p "$DX_STACK_EVIDENCE"
 src=$stage/${arm:0:1}
 profile=''; [[ ${arm:1:1} != 1 ]] || profile='-XX:FlightRecorderOptions=stackdepth=128 -XX:StartFlightRecording=name=b9,filename=/tmp/b9.jfr,settings=profile,dumponexit=true'
 bash lab/experiments/EXP-DX1/b8/up.sh "$prefix" --no-publish --gateway-src "$src" --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write 1 --cpus-gw-read 2,3 --pg-memory 1g --tx-memory 4g --gw-memory 3g --tx-java-opts "-Xms1g -Xmx3g $profile" --gw-java-opts "-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g $profile" --object-cache-max 1g --memory-index-threshold 256m --memory-index-max 1g > "$out/$arm-up.log" 2>&1
 export DX_DRIVER_ENV="DATOMIC_INTEGRATION=1 TRIPLEX_DATOMIC_LAYOUT=lean B9_ARM=$arm B9_GROUP=$group B7_WORKERS=4"
 node lab/experiments/EXP-DX1/b6/bounded-command.mjs "$((1070-$(date +%s)+started))" bash lab/experiments/EXP-DX1/stack/run-in-vm.sh "$prefix" --cpus 4,5,6,7 --memory 5g -- node --experimental-strip-types lab/experiments/EXP-DX1/b9/load.mjs > "$out/$arm-driver.log" 2>&1
 if [[ $arm == A1 || $arm == B1 ]]; then
  for role in gw-r gw-w tx; do
   docker update --restart=no "$prefix-$role" > "$out/$arm-$role-jfr.txt"
   docker exec "$prefix-$role" sh -c 'for p in /proc/[0-9]*; do if [ "$(cat "$p/comm" 2>/dev/null)" = java ]; then kill -TERM "${p##*/}"; fi; done' >> "$out/$arm-$role-jfr.txt" 2>&1
   node lab/experiments/EXP-DX1/b6/bounded-command.mjs 15 docker wait "$prefix-$role" >> "$out/$arm-$role-jfr.txt" 2>&1
   docker cp "$prefix-$role:/tmp/b9.jfr" "$out/$arm-$role.jfr"
  done
 fi
 cleanup_stack; prefix=
done

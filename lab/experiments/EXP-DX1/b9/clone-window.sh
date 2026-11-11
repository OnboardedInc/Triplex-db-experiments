#!/usr/bin/env bash
# [DX-B9-A] Why: restore one sealed 50k seed for each arm, avoiding four expensive fills in one lease.
# Rejected: extending the twenty-minute hold or copying live PostgreSQL files.
set -euo pipefail
kind=${1:?seed|frozen|mixed}; stage=${2:?stage}; id=${3:?fresh id}; seed_prefix=${4:-}; metadata=${5:-}; ready=${6:-}
[[ $kind == seed || $kind == frozen || $kind == mixed ]]; [[ $id =~ ^[a-z0-9-]+$ ]]
[[ $kind == seed || $seed_prefix =~ ^tx2-dxb9-[a-z0-9-]+$ ]]
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9; out=$root/$id; mkdir "$out"
cp "$0" "$out/clone-window.sh"
shasum -a256 lab/experiments/EXP-DX1/b9/{load-clone,mixed-instrumented}.mjs > "$out/driver-before.sha256"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
sh lab/bin/host-quiet.sh --wait 20 > "$out/host-before.jsonl" || true
python3 -c 'import shutil;assert shutil.disk_usage("/System/Volumes/Data").free>=15*1024**3'
if [[ $kind != seed && -n $ready ]]; then
 while [[ ! -f $ready ]]; do sleep 5; done
 python3 - "$ready" <<'PYREADY'
import json,sys
v=json.load(open(sys.argv[1]));assert v['exit']==0 and v['sealedSeed'] and v['heldSeconds']<=1200
PYREADY
fi
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"DX-B9","pid":%d}\n' $$ > "$lock/owner.json"
started=$(date +%s); prefix=; sealed=false; cleaned=false; watchdog=
cleanup_stack() {
 [[ -n $prefix && $cleaned != true ]] || return 0
 for role in gw-r gw-w tx pg; do docker logs --timestamps "$prefix-$role" > "$out/$prefix-$role.log" 2>&1 || true; done
 docker exec "$prefix-pg" du -sk /var/lib/postgresql/data > "$out/$prefix-size.txt" 2>&1 || true
 for role in driver health cgroups extract profile compile copy; do docker rm -f "$prefix-$role" >/dev/null 2>&1 || true; done
 args=(--volumes); [[ $sealed != true ]] || args=()
 bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" ${args[@]+"${args[@]}"} >> "$out/removed.txt" 2>&1
 docker volume rm "$prefix-driver" >> "$out/removed.txt" 2>&1 || true
 cleaned=true
}
cleanup() {
 rc=$?; trap - EXIT TERM INT; [[ -z $watchdog ]] || kill "$watchdog" 2>/dev/null || true
 cleanup_stack
 docker ps -a --filter "name=tx2-dxb9-$id" --format '{{.Names}}' > "$out/remaining-containers.txt"
 docker network ls --filter "name=tx2-dxb9-$id" --format '{{.Name}}' > "$out/remaining-networks.txt"
 docker volume ls --filter "name=tx2-dxb9-$id" --format '{{.Name}}' > "$out/remaining-volumes.txt"
 [[ ! -s $out/remaining-containers.txt && ! -s $out/remaining-networks.txt ]] || { echo 'cleanup incomplete; retaining lock'; exit 1; }
 if [[ $sealed == true ]]; then [[ $(cat "$out/remaining-volumes.txt") == "$prefix-pg-data" ]]; else [[ ! -s $out/remaining-volumes.txt ]]; fi
 shasum -a256 lab/experiments/EXP-DX1/b9/{load-clone,mixed-instrumented}.mjs > "$out/driver-after.sha256"
 cmp "$out/driver-before.sha256" "$out/driver-after.sha256" || rc=1
 sh lab/bin/host-quiet.sh > "$out/host-after.jsonl" || true
 printf '{"exit":%d,"heldSeconds":%d,"sealedSeed":%s,"keepAwake":false,"semanticVerdict":null}\n' "$rc" "$(( $(date +%s)-started ))" "$sealed" > "$out/exit.json"
 python3 - "$lock/owner.json" $$ <<'PY'
import json,sys
assert json.load(open(sys.argv[1]))=={'id':'DX-B9','pid':int(sys.argv[2])}
PY
 rm "$lock/owner.json"; rmdir "$lock"; exit "$rc"
}
trap cleanup EXIT; trap 'exit 124' TERM INT
(sleep 1110; kill -TERM $$) & watchdog=$!
sh lab/bin/host-quiet.sh > "$out/host-lock-acquired.jsonl" || true
python3 -c 'import shutil;assert shutil.disk_usage("/System/Volumes/Data").free>=15*1024**3'
if [[ $kind == seed ]]; then arms=(seed); else arms=(A1 B1 A2 B2); fi
for arm in "${arms[@]}"; do
 cleaned=false
 prefix=tx2-dxb9-$id-$(echo "$arm" | tr '[:upper:]' '[:lower:]')
 export DX_STACK_EVIDENCE=$out/$arm; mkdir -p "$DX_STACK_EVIDENCE"
 if [[ $kind == seed ]]; then src=$stage/A; else
  src=$stage/${arm:0:1}
  docker volume inspect "$seed_prefix-pg-data" > "$out/$arm-seed-volume.json"
  docker volume create "$prefix-pg-data" >/dev/null
  docker run --rm --pull never --name "$prefix-copy" --memory 512m --cpuset-cpus 4,5,6,7 -v "$seed_prefix-pg-data:/from:ro" -v "$prefix-pg-data:/to" postgres:17-alpine sh -c 'test -f /from/PG_VERSION; cp -a /from/. /to/; du -sk /from /to' > "$out/$arm-clone-kib.txt"
  docker run --rm --pull never --name "$prefix-copy" --memory 512m --cpuset-cpus 4,5,6,7 -v "$seed_prefix-pg-data:/from:ro" -v "$prefix-pg-data:/to:ro" postgres:17-alpine sh -eu -c '
    cd /from
    find . -type f | sort > /tmp/source-files
    find . -type f -exec sha256sum {} \; | sort > /tmp/source-sha256
    cd /to
    find . -type f | sort > /tmp/target-files
    cmp /tmp/source-files /tmp/target-files
    cat /tmp/source-sha256
    sha256sum -c /tmp/source-sha256
  ' > "$out/$arm-clone-checksums.txt"
  python3 - "$out/$arm-clone-kib.txt" <<'PY'
import sys
sizes=[int(x.split()[0])*1024 for x in open(sys.argv[1])];assert len(sizes)==2 and sum(sizes)<8_000_000_000,sizes
PY
 fi
 profile=''; if [[ $arm == A1 || $arm == B1 ]]; then profile='-XX:FlightRecorderOptions=stackdepth=128 -XX:StartFlightRecording=name=b9,filename=/tmp/b9.jfr,settings=profile,dumponexit=true'; fi
 bash lab/experiments/EXP-DX1/b8/up.sh "$prefix" --no-publish --gateway-src "$src" --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write 1 --cpus-gw-read 2,3 --pg-memory 1g --tx-memory 4g --gw-memory 3g --tx-java-opts "-Xms1g -Xmx3g $profile" --gw-java-opts "-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g $profile" --object-cache-max 1g --memory-index-threshold 256m --memory-index-max 1g > "$out/$arm-up.log" 2>&1
 export DX_DRIVER_ENV="DATOMIC_INTEGRATION=1 TRIPLEX_DATOMIC_LAYOUT=lean B9_ARM=$arm B9_GROUP=$kind B7_WORKERS=4"
 if [[ $kind == seed ]]; then export DX_DRIVER_ENV="$DX_DRIVER_ENV B9_SEED_ONLY=1 B9_KEEP_SCOPE=1"; else export DX_DRIVER_ENV="$DX_DRIVER_ENV B9_SEED_METADATA=$metadata"; fi
 node lab/experiments/EXP-DX1/b6/bounded-command.mjs "$((1070-$(date +%s)+started))" bash lab/experiments/EXP-DX1/stack/run-in-vm.sh "$prefix" --cpus 4,5,6,7 --memory 5g -- node --experimental-strip-types lab/experiments/EXP-DX1/b9/load-clone.mjs > "$out/$arm-driver.log" 2>&1
 if [[ $kind == seed || $arm == A1 || $arm == B1 ]]; then
  for role in gw-r gw-w tx; do
   docker update --restart=no "$prefix-$role" >> "$out/$arm-stop.txt"
   docker exec "$prefix-$role" sh -c 'for p in /proc/[0-9]*; do if [ "$(cat "$p/comm" 2>/dev/null)" = java ]; then kill -TERM "${p##*/}"; fi; done' >> "$out/$arm-stop.txt" 2>&1
   node lab/experiments/EXP-DX1/b6/bounded-command.mjs 15 docker wait "$prefix-$role" >> "$out/$arm-stop.txt" 2>&1
   if [[ $kind != seed ]]; then docker cp "$prefix-$role:/tmp/b9.jfr" "$out/$arm-$role.jfr"; [[ -s $out/$arm-$role.jfr ]]; fi
  done
 fi
 if [[ $kind == seed ]]; then
  docker stop -t 30 "$prefix-pg" >> "$out/seed-stop.txt"
  [[ $(docker inspect --format '{{.State.ExitCode}}' "$prefix-pg") == 0 ]]
  docker run --rm --pull never --name "$prefix-copy" -v "$prefix-pg-data:/from:ro" postgres:17-alpine du -sk /from > "$out/seed-kib.txt"
  python3 - "$out/seed-kib.txt" <<'PY'
import sys
assert int(open(sys.argv[1]).read().split()[0])*1024<3_500_000_000
PY
  sealed=true
 fi
 cleanup_stack
 if [[ $kind != seed ]]; then prefix=; fi
done

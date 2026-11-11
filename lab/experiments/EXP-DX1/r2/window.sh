#!/usr/bin/env bash
# [DX-R2] Why: all owned containers live inside a bounded exclusive hold and read a clone of the sealed seed.
# Rejected: modifying a seed or leaving peers running while another party measures.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
prefix=${1:?tx2-dxr2-*}; seed=${2:?sealed-volume}; scope=${3:?scope}; n=${4:?subjects}; shift 4
s5=false
[[ $prefix =~ ^tx2-dxs5-[a-z0-9-]+$ ]] && s5=true
[[ $prefix =~ ^tx2-dxr2-[a-z0-9-]+$ || $s5 == true ]] || exit 2
[[ $seed == tx2-dxh5-seed-1000-pg-data || $seed == tx2-dxh8-seed-10000-pg-data || ( $s5 == true && $seed == tx2-dxs5-seed-100000-pg-data && $n == 100000 ) ]] || exit 2
if [[ $s5 == true ]]; then
 [[ -f /Users/sam/Claude/Projects/triplex-db-2/locks/long-hold-ok ]] || { echo 'long hold not authorized'; exit 2; }
fi
allow_first_use=false; first_use=false
if [[ ${1:-} == --first-use-if-needed ]]; then
 [[ $s5 == true && $seed == tx2-dxs5-seed-100000-pg-data && $n == 100000 ]] || exit 2
 allow_first_use=true; shift
fi
working_volume=$prefix-pg-data
repo=$PWD
out=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R2/$prefix
if [[ $s5 == true ]]; then out=$(mktemp -d "$repo/lab/experiments/EXP-DX1/s5/.runtime.XXXXXX"); else mkdir -p "$out"; fi
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; resources=false; completed=false; timer=; watcher=; diskguard=
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ $completed == true || $rc != 0 ]] || rc=1
 [[ -z $timer ]] || kill "$timer" 2>/dev/null || true
 [[ -z $watcher ]] || kill "$watcher" 2>/dev/null || true
 [[ -z $diskguard ]] || kill "$diskguard" 2>/dev/null || true
 if [[ $held == true ]]; then
   if [[ $resources == true ]]; then
   if [[ $first_use == true ]] && docker container inspect "$prefix-pg" >/dev/null 2>&1; then
    for role in gw-r gw-w tx; do docker stop -t 15 "$prefix-$role" || true; done
    docker stop -t 20 "$prefix-pg" || true
    docker inspect --format 'first-use PG exit={{.State.ExitCode}}' "$prefix-pg"
    [[ $(docker inspect --format '{{.State.ExitCode}}' "$prefix-pg") == 0 ]] || rc=1
   fi
   for role in gate driver gw-r gw-w tx pg copy extract budget guard; do docker rm -f "$prefix-$role" || true; done
   docker network rm "$prefix-net" || true
   docker volume rm "$prefix-pg-data" "$prefix-tools" || true
   docker ps -a --filter "name=$prefix" --format '{{.Names}}'
   docker volume ls --filter "name=$prefix" --format '{{.Name}}'
   fi
   if [[ $s5 == true ]]; then
    remaining=$(docker ps -aq --filter "name=^/$prefix-") || { echo 'cannot verify containers: lock retained'; exit 1; }
    volumes=$(docker volume ls --filter "name=^$prefix-" --format '{{.Name}}') || { echo 'cannot verify volumes: lock retained'; exit 1; }
    [[ -z $remaining && -z $volumes ]] || { echo 'owned resources remain: lock retained'; exit 1; }
   fi
   rm -f "$lock/owner.json"; rmdir "$lock"
 fi
 # [DX-S5] Why: retain every actual latency/write event in this command's one raw output file, including failed windows.
 # Rejected: deleting the traffic streams and leaving only computed p99 summaries as evidence.
 if [[ $s5 == true ]]; then
  for raw in "$out"/traffic/*-traffic.ndjson; do
   [[ -f $raw ]] || continue
   printf '\n{"kind":"traffic-raw-begin","file":"%s"}\n' "${raw##*/}"
   cat "$raw" || rc=1
   printf '\n{"kind":"traffic-raw-end","file":"%s"}\n' "${raw##*/}"
  done
 fi
 find "$out" -type f -name "*.ndjson" -exec gzip {} \;
 [[ $s5 != true ]] || rm -rf "$out"
 echo "window exit=$rc"; exit "$rc"
}
trap cleanup EXIT
trap 'exit 124' TERM INT
if [[ $s5 == true ]]; then
 [[ $(df -k /System/Volumes/Data | awk 'NR==2 {print $4}') -ge 15728640 ]] || { echo 'disk below 15 GiB before admission'; exit 1; }
fi
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
held=true
id=DX-R2; [[ $s5 != true ]] || id=DX-S5
printf '{"id":"%s","pid":%s,"kind":"evaluation"}\n' "$id" "$$" > "$lock/owner.json"
git diff --quiet && git diff --cached --quiet || { echo "refuse dirty source"; exit 2; }
git rev-parse HEAD
hold_s=1100; driver_memory=8g; clone_kib=6000000
[[ $s5 != true ]] || { hold_s=3500; driver_memory=11g; clone_kib=19531250; }
# [DX-S5] Why: a delayed seed must not silently consume time beyond the overall task budget.
# Rejected: dropping exactness coverage to fit; a capped verifier remains explicitly incomplete.
if [[ $s5 == true && -n ${S5_END_EPOCH:-} ]]; then
 [[ $S5_END_EPOCH =~ ^[0-9]+$ ]] || exit 2
 available=$(( S5_END_EPOCH - $(date +%s) - 90 ))
 (( available >= 300 )) || { echo 'insufficient remaining evaluation budget'; exit 2; }
 (( available >= hold_s )) || hold_s=$available
 echo "overall-budget endEpoch=$S5_END_EPOCH holdSeconds=$hold_s cleanupReserveSeconds=90"
fi
deadline=$(( $(date +%s) * 1000 + hold_s * 1000 ))
[[ $(df -k /System/Volumes/Data | awk 'NR==2 {print $4}') -ge 15728640 ]] || { echo 'disk below 15 GiB'; exit 1; }
[[ -z $(docker ps -q --filter "volume=$seed") ]] || { echo 'refuse an active seed'; exit 2; }
(sleep "$hold_s"; docker rm -f "$prefix-driver" || true; [[ $s5 != true ]] || docker rm -f "$prefix-copy" || true; kill -TERM $$) & timer=$!
for name in "$prefix-pg-data" "$prefix-tools"; do
 if docker volume inspect "$name" >/dev/null 2>&1; then echo "refuse existing owned volume $name"; exit 2; fi
done
for role in pg tx gw-w gw-r driver; do
 if docker container inspect "$prefix-$role" >/dev/null 2>&1; then echo 'refuse existing container'; exit 2; fi
done
if docker network inspect "$prefix-net" >/dev/null 2>&1; then echo 'refuse existing network'; exit 2; fi
resources=true
if [[ $s5 == true ]]; then
 (
  while sleep 5; do
   mac=$(df -k /System/Volumes/Data | awk 'NR==2 {print $4}')
   vm=$(docker run --rm --pull never --name "$prefix-guard" postgres:17-alpine sh -c 'df -Pk / | tail -1' | awk '{print $4}') || { kill -TERM $$; exit 1; }
   echo "evaluation-disk macFreeKiB=$mac vmFreeKiB=$vm"
   (( mac >= 15728640 && vm >= 5242880 )) || { docker rm -f "$prefix-driver" "$prefix-copy" || true; kill -TERM $$; exit 1; }
  done
 ) & diskguard=$!
fi
for name in "$prefix-pg-data" "$prefix-tools"; do docker volume create "$name"; done
# [DX-S5] Why: reserve full clone space plus the Mac/VM floors before allocating any seed bytes.
# Rejected: allowing a 100k copy to discover the disk limit only after it finishes.
clone_start=$(date +%s)
if [[ $s5 == true ]]; then
 source_kib=$(docker run --rm --pull never --name "$prefix-copy" -v "$seed:/from:ro" postgres:17-alpine du -sk /from | awk '{print $1}')
 mac_kib=$(df -k /System/Volumes/Data | awk 'NR==2 {print $4}')
 vm_kib=$(docker run --rm --pull never --name "$prefix-copy" -v "$seed:/from:ro" postgres:17-alpine sh -c 'df -Pk /from | tail -1' | awk '{print $4}')
 echo "clone-plan sourceKiB=$source_kib macFreeKiB=$mac_kib vmFreeKiB=$vm_kib"
 if ! (( mac_kib-source_kib >= 15728640 && vm_kib-source_kib >= 5242880 )); then
  [[ $allow_first_use == true ]] || { echo 'clone does not fit disk reserve'; exit 1; }
  first_use=true; working_volume=$seed
  echo 'DECLARED FIRST USE: clone does not fit the disk reserve; this evaluation modifies the new seed volume.'
 fi
fi
if [[ $first_use != true ]]; then
docker run --rm --pull never --name "$prefix-copy" -v "$seed:/from:ro" -v "$prefix-pg-data:/to" postgres:17-alpine sh -c 'test $(du -sk /from | cut -f1) -lt "$1" && cp -a /from/. /to/ && du -sk /to' sh "$clone_kib"
echo "clone elapsedSeconds=$(( $(date +%s)-clone_start ))"
else echo 'clone skipped: first use'; fi
docker create --pull never --name "$prefix-extract" -v "$prefix-tools:/tool" node:22.23.2-bookworm-slim sh -c 'cp /usr/local/bin/node /tool/node; cp /usr/lib/*-linux-gnu/libstdc++.so.6 /usr/lib/*-linux-gnu/libgcc_s.so.1 /tool/'
docker start -a "$prefix-extract"; docker rm "$prefix-extract"
mkdir "$out/config"
docker create --pull never --name "$prefix-extract" tx2-datomic:1.0.7745-da00
docker cp "$prefix-extract:/opt/datomic/config/samples/sql-transactor-template.properties" "$out/config/template.properties"
docker rm "$prefix-extract"
python3 - "$out/config" "$prefix" <<'PY'
import sys,pathlib
root=pathlib.Path(sys.argv[1]); prefix=sys.argv[2]
s={'protocol':'sql','host':prefix+'-tx','alt-host':prefix+'-tx','sql-url':'jdbc:postgresql://'+prefix+'-pg:5432/datomic','sql-user':'datomic','sql-password':'datomic','memory-index-threshold':'256m','memory-index-max':'1g','object-cache-max':'1g'}
lines=[l for l in (root/'template.properties').read_text().splitlines() if l.partition('=')[0].strip() not in s]
(root/'sql.properties').write_text('\n'.join(lines)+'\n'+'\n'.join(k+'='+v for k,v in s.items())+'\n')
PY
docker network create "$prefix-net"
docker run -d --pull never --name "$prefix-pg" --network "$prefix-net" --cpuset-cpus 0 --memory 2g --memory-swap 2g -e POSTGRES_PASSWORD=datomic -v "$working_volume:/var/lib/postgresql/data" postgres:17-alpine postgres -c shared_buffers=512MB -c max_wal_size=1GB -c checkpoint_timeout=5min
for ((i=0;i<90;i++)); do docker exec "$prefix-pg" pg_isready -h 127.0.0.1 -U postgres && break; sleep 1; done
# [DX-S5] Why: retain bounded WARN/error logs instead of gigabytes of per-block INFO; old R2 defaults stay unchanged.
# Rejected: spending the reserved Mac disk on disposable container log files.
start_jvm() {
 if [[ $s5 == true ]]; then
  docker run -d --pull never -v "$repo/lab/experiments/EXP-DX1/s5/logback.xml:/opt/datomic/bin/logback.xml:ro" "$@"
 else docker run -d --pull never "$@"; fi
}
start_jvm --name "$prefix-tx" --network "$prefix-net" --cpuset-cpus 0,1 --memory 4g --memory-swap 4g -e 'JAVA_OPTS=-Xms256m -Xmx3g' -v "$out/config:/config:ro" --entrypoint /opt/datomic/bin/transactor tx2-datomic:1.0.7745-da00 /config/sql.properties
for role in w r; do
 cpu=1; [[ $role == w ]] || cpu=2,3
 host_port=18542; [[ $role == w ]] || host_port=18543
 start_jvm --restart on-failure:10 --name "$prefix-gw-$role" -p "127.0.0.1:$host_port:8080" --network "$prefix-net" --cpuset-cpus "$cpu" --memory 3g --memory-swap 3g -e 'DATOMIC_JAVA_OPTS=-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g -Dtriplex.codec.spec=/opt/replica-codec-spec.json' -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic" -v "$repo/packages/datomic/gateway:/opt/gateway:ro" -v "$repo/packages/datomic/src/codec-spec.json:/opt/replica-codec-spec.json:ro" --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.main
 done
docker run --rm --pull never --name "$prefix-copy" --network "$prefix-net" node:22.23.2-bookworm-slim node -e '
for (const role of ["w","r"]) { let ok=false; for(let i=0;i<180;i++){try{let r=await fetch("http://"+process.argv[1]+"-gw-"+role+":8080/health"); if(r.ok){console.log(await r.text());ok=true;break;}}catch{} await new Promise(r=>setTimeout(r,1000));}if(!ok)process.exit(1);}' "$prefix"
if [[ ${1:-} == --gateway-tests ]]; then
 for ns in triplex.gateway.feed-test triplex.gateway.selftest; do
  docker exec -e DF01_RECORDED_PAGE=/tmp/dxr2-feed-recording.json -e 'DATOMIC_JAVA_OPTS=-Xms128m -Xmx768m -Dtriplex.codec.spec=/opt/replica-codec-spec.json' "$prefix-gw-r" /opt/datomic/bin/run -m "$ns"
 done
 DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:18542 pnpm --config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store exec vitest run packages/datomic/test/journal-fast.test.ts
 shift
 if [[ $# == 0 ]]; then completed=true; exit 0; fi
fi
(
 while sleep 15; do
   kb=$(docker run --rm --pull never --name "$prefix-budget" -v "$working_volume:/from:ro" postgres:17-alpine du -sk /from | awk '{print $1}') || { kill -TERM $$; exit 1; }
   evidence_root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R2; evidence_cap=490000
   [[ $s5 != true ]] || { evidence_root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S5; evidence_cap=976562; }
   owned_kb=$(du -sk "$evidence_root" | awk '{print $1}')
   free_kb=$(df -k /System/Volumes/Data | awk 'NR==2 {print $4}')
   volume_cap=7300000; floor=5242880
   [[ $s5 != true ]] || { volume_cap=22000000; floor=15728640; }
   if [[ $kb -gt $volume_cap || $owned_kb -gt $evidence_cap || $free_kb -lt $floor ]]; then echo "resource stop: volumeKiB=$kb evidenceKiB=$owned_kb freeKiB=$free_kb"; docker rm -f "$prefix-driver" || true; kill -TERM $$; exit 1; fi
 done
) & watcher=$!
docker run --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory "$driver_memory" --memory-swap "$driver_memory" \
 -v "$repo:$repo:ro" -v "$out:$out" -v "$prefix-tools:/tool:ro" -w "$repo" -e LD_LIBRARY_PATH=/tool -e PATH=/tool:/usr/local/bin:/usr/bin:/bin \
 -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" -e "DX_R1_DEADLINE=$deadline" -e TRIPLEX_DATOMIC_LAYOUT=lean -e TX2_SWEEP_STRICT=1 -e TX2_W0_RESTORE_INDEXED_JOURNAL=1 \
 python:3.13-slim /tool/node --expose-gc --experimental-strip-types lab/experiments/EXP-DX1/r2/run.ts --replica --rung "$n" --scope "$scope" --traffic-dir "$out/traffic" "$@"
docker exec "$prefix-pg" psql -U postgres -d datomic -Atc 'SELECT pg_database_size(current_database());'
docker run --rm --pull never --name "$prefix-copy" -v "$working_volume:/from:ro" postgres:17-alpine du -sk /from

completed=true

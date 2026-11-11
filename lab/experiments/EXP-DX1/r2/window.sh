#!/usr/bin/env bash
# [DX-R2] Why: all owned containers live inside a bounded exclusive hold and read a clone of the sealed seed.
# Rejected: modifying a seed or leaving peers running while another party measures.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
prefix=${1:?tx2-dxr2-*}; seed=${2:?sealed-volume}; scope=${3:?scope}; n=${4:?subjects}; shift 4
[[ $prefix =~ ^tx2-dxr2-[a-z0-9-]+$ ]] || exit 2
[[ $seed == tx2-dxh5-seed-1000-pg-data || $seed == tx2-dxh8-seed-10000-pg-data ]] || exit 2
repo=$PWD
out=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R2/$prefix
mkdir -p "$out"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; resources=false; completed=false; timer=; watcher=
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ $completed == true || $rc != 0 ]] || rc=1
 [[ -z $timer ]] || kill "$timer" 2>/dev/null || true
 [[ -z $watcher ]] || kill "$watcher" 2>/dev/null || true
 if [[ $held == true ]]; then
   if [[ $resources == true ]]; then
   for role in gate driver gw-r gw-w tx pg copy extract budget; do docker rm -f "$prefix-$role" || true; done
   docker network rm "$prefix-net" || true
   docker volume rm "$prefix-pg-data" "$prefix-tools" || true
   docker ps -a --filter "name=$prefix" --format '{{.Names}}'
   docker volume ls --filter "name=$prefix" --format '{{.Name}}'
   fi
   rm "$lock/owner.json"; rmdir "$lock"
 fi
 find "$out" -type f -name "*.ndjson" -exec gzip {} \;
 echo "window exit=$rc"; exit "$rc"
}
trap cleanup EXIT
trap 'exit 124' TERM INT
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
held=true
git diff --quiet && git diff --cached --quiet || { echo "refuse dirty source"; exit 2; }
git rev-parse HEAD
deadline=$(( $(date +%s) * 1000 + 1100000 ))
printf '{"id":"DX-R2","pid":%s}\n' "$$" > "$lock/owner.json"
[[ $(df -k /System/Volumes/Data | awk 'NR==2 {print $4}') -ge 15728640 ]] || { echo 'disk below 15 GiB'; exit 1; }
[[ -z $(docker ps -q --filter "volume=$seed") ]] || { echo 'refuse an active seed'; exit 2; }
(sleep 1100; docker rm -f "$prefix-driver" || true; kill -TERM $$) & timer=$!
for name in "$prefix-pg-data" "$prefix-tools"; do
 if docker volume inspect "$name" >/dev/null 2>&1; then echo "refuse existing owned volume $name"; exit 2; fi
done
for role in pg tx gw-w gw-r driver; do
 if docker container inspect "$prefix-$role" >/dev/null 2>&1; then echo 'refuse existing container'; exit 2; fi
done
if docker network inspect "$prefix-net" >/dev/null 2>&1; then echo 'refuse existing network'; exit 2; fi
resources=true
for name in "$prefix-pg-data" "$prefix-tools"; do docker volume create "$name"; done
docker run --rm --pull never --name "$prefix-copy" -v "$seed:/from:ro" -v "$prefix-pg-data:/to" postgres:17-alpine sh -c 'test $(du -sk /from | cut -f1) -lt 6000000 && cp -a /from/. /to/ && du -sk /to'
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
docker run -d --pull never --name "$prefix-pg" --network "$prefix-net" --cpuset-cpus 0 --memory 2g --memory-swap 2g -e POSTGRES_PASSWORD=datomic -v "$prefix-pg-data:/var/lib/postgresql/data" postgres:17-alpine postgres -c shared_buffers=512MB -c max_wal_size=1GB -c checkpoint_timeout=5min
for ((i=0;i<90;i++)); do docker exec "$prefix-pg" pg_isready -h 127.0.0.1 -U postgres && break; sleep 1; done
docker run -d --pull never --name "$prefix-tx" --network "$prefix-net" --cpuset-cpus 0,1 --memory 4g --memory-swap 4g -e 'JAVA_OPTS=-Xms256m -Xmx3g' -v "$out/config:/config:ro" --entrypoint /opt/datomic/bin/transactor tx2-datomic:1.0.7745-da00 /config/sql.properties
for role in w r; do
 cpu=1; [[ $role == w ]] || cpu=2,3
 host_port=18542; [[ $role == w ]] || host_port=18543
 docker run -d --pull never --restart on-failure:10 --name "$prefix-gw-$role" -p "127.0.0.1:$host_port:8080" --network "$prefix-net" --cpuset-cpus "$cpu" --memory 3g --memory-swap 3g -e 'DATOMIC_JAVA_OPTS=-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g -Dtriplex.codec.spec=/opt/replica-codec-spec.json' -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic" -v "$repo/packages/datomic/gateway:/opt/gateway:ro" -v "$repo/packages/datomic/src/codec-spec.json:/opt/replica-codec-spec.json:ro" --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.main
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
   kb=$(docker run --rm --pull never --name "$prefix-budget" -v "$prefix-pg-data:/from:ro" postgres:17-alpine du -sk /from | awk '{print $1}') || { kill -TERM $$; exit 1; }
   owned_kb=$(du -sk /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R2 | awk '{print $1}')
   free_kb=$(df -k /System/Volumes/Data | awk 'NR==2 {print $4}')
   if [[ $kb -gt 7300000 || $owned_kb -gt 490000 || $free_kb -lt 5242880 ]]; then echo "resource stop: volumeKiB=$kb evidenceKiB=$owned_kb freeKiB=$free_kb"; docker rm -f "$prefix-driver" || true; kill -TERM $$; exit 1; fi
 done
) & watcher=$!
docker run --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory 8g --memory-swap 8g \
 -v "$repo:$repo:ro" -v "$out:$out" -v "$prefix-tools:/tool:ro" -w "$repo" -e LD_LIBRARY_PATH=/tool -e PATH=/tool:/usr/local/bin:/usr/bin:/bin \
 -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" -e "DX_R1_DEADLINE=$deadline" -e TRIPLEX_DATOMIC_LAYOUT=lean -e TX2_SWEEP_STRICT=1 -e TX2_W0_RESTORE_INDEXED_JOURNAL=1 \
 python:3.13-slim /tool/node --expose-gc --experimental-strip-types lab/experiments/EXP-DX1/r2/run.ts --replica --rung "$n" --scope "$scope" --traffic-dir "$out/traffic" "$@"
docker exec "$prefix-pg" psql -U postgres -d datomic -Atc 'SELECT pg_database_size(current_database());'
docker run --rm --pull never --name "$prefix-copy" -v "$prefix-pg-data:/from:ro" postgres:17-alpine du -sk /from

completed=true

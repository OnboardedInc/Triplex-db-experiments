#!/usr/bin/env bash
# [DX-S5] Why: all containers are owned inside the measurement lock; SIGTERM removes containers before release.
# Rejected: leaving a peer resident or retaining a failed proof's volume.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
n=${1:?1000|10000|100000}; chunk=${2:?chunk subjects}; deliberate=${3:-false}
[[ $n == 1000 || $n == 10000 || $n == 100000 ]] || exit 2
[[ $chunk =~ ^[1-9][0-9]*$ ]] && (( chunk % 50 == 0 && chunk <= n && n % chunk == 0 )) || exit 2
prefix=tx2-dxs5-seed-$n; scope=dxs5-w0-$n-v1
repo=$PWD; out=$(mktemp -d /private/tmp/dxs5.XXXXXX)
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; timer=; watcher=; keep=false; owned=false
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ -z $timer ]] || kill "$timer" 2>/dev/null || true
 [[ -z $watcher ]] || kill "$watcher" 2>/dev/null || true
 if [[ $held == true && $owned == true ]]; then
  for role in driver peer copy budget extract gw-r gw-w tx; do docker rm -f "$prefix-$role" 2>/dev/null || true; done
  docker stop -t 30 "$prefix-pg" || true
  docker rm "$prefix-pg" 2>/dev/null || true
  docker network rm "$prefix-net" 2>/dev/null || true
  docker volume rm "$prefix-tools" 2>/dev/null || true
  if [[ $keep != true ]]; then docker volume rm "$prefix-pg-data" 2>/dev/null || true; fi
  if [[ -n $(docker ps -aq --filter "name=^/$prefix-") ]]; then echo 'containers remain: retaining lock'; exit 1; fi
 fi
 if [[ $held == true ]]; then rm "$lock/owner.json"; rmdir "$lock"; fi
 rm -rf "$out"
 echo "hold exit=$rc retained=$keep"; exit "$rc"
}
trap cleanup EXIT
trap 'exit 124' TERM INT
free_mac() { df -k /System/Volumes/Data | awk 'NR==2 {print $4}'; }
(( $(free_mac) >= 15728640 )) || { echo 'Mac below 15GiB'; exit 2; }
if [[ $n == 100000 ]]; then
 [[ -f /Users/sam/Claude/Projects/triplex-db-2/locks/long-hold-ok ]] || { echo 'long hold not authorized'; exit 2; }
fi
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
held=true
printf '{"id":"DX-S5","pid":%s,"kind":"seed-%s"}\n' "$$" "$n" > "$lock/owner.json"
(( $(free_mac) >= 15728640 )) || exit 2
git diff --quiet && git diff --cached --quiet || { echo 'dirty source refused'; exit 2; }
git rev-parse HEAD
seconds=1440; [[ $n != 100000 ]] || seconds=17900
# [DX-S5] Why: Bash defers traps while waiting on a foreground Docker client; end the client before signalling its supervisor.
# Rejected: TERM alone (a long seed could keep the measurement lock beyond its deadline).
abort_hold() {
 docker rm -f "$prefix-driver" "$prefix-peer" "$prefix-copy" "$prefix-gw-r" "$prefix-gw-w" "$prefix-tx" "$prefix-pg" 2>/dev/null || true
 kill -TERM $$
}
(sleep "$seconds"; abort_hold) & timer=$!
[[ -z $(docker ps -aq --filter "name=^/$prefix-") ]] || exit 2
fresh=true
if docker volume inspect "$prefix-pg-data" >/dev/null 2>&1; then echo 'existing seed refused'; exit 2; fi
owned=true
docker volume create "$prefix-pg-data"
docker volume create "$prefix-tools"
# Monitor during startup, writes and maintenance; reserve live-table rewrite space separately before vacuum.
(
 while true; do
  mac=$(free_mac)
  vm=$(docker run --rm --pull never --name "$prefix-budget" -v "$prefix-pg-data:/data:ro" postgres:17-alpine sh -c 'df -Pk /data | tail -1; du -sk /data') || { abort_hold; exit 1; }
  echo "disk $(date -u +%FT%TZ) macFreeKiB=$mac vm=$vm"
  docker stats --no-stream --format '{{.Name}} cpu={{.CPUPerc}} memory={{.MemUsage}}' "$prefix-pg" "$prefix-tx" "$prefix-gw-w" "$prefix-gw-r" "$prefix-driver" 2>/dev/null || true
  vmfree=$(echo "$vm" | awk 'NR==1 {print $4}')
  (( mac >= 15728640 && vmfree >= 5242880 )) || { abort_hold; exit 1; }
  sleep 10
 done
) & watcher=$!
source lab/experiments/EXP-DX1/s5/setup.sh
run_driver() {
 docker run --rm --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory 11g --memory-swap 11g \
 -v "$repo:$repo:ro" -v "$prefix-tools:/state" -w "$repo" \
 -e "S5_REQUIRE_RECOVERED=${require_recovered:-0}" -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" -e TRIPLEX_DATOMIC_LAYOUT=lean -e TX2_SWEEP_STRICT=1 \
 node:22.23.2-bookworm-slim node --experimental-strip-types lab/experiments/EXP-DX1/s5/seed.ts "$scope" "$n" "$1" "${2:-seed}"
}
maintain() {
 db=$(node --input-type=module -e 'import {DatabaseScope} from "./packages/core/dist/runtime/index.js";console.log("s2-"+Buffer.from(String(DatabaseScope.test(process.argv[1]))).toString("base64url"))' "$scope")
 native_proof() {
 docker run --rm --pull never --name "$prefix-peer" --network "$prefix-net" --memory 3g --memory-swap 3g \
 -e DATOMIC_JAVA_OPTS='-Xms128m -Xmx2g' -e DATOMIC_EXT_CLASSPATH=/s5 -v "$repo/lab/experiments/EXP-DX1/s5:/s5:ro" \
 --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m maintain "datomic:sql://$db?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic" "${1:-maintain}"
 }
 native_proof | tee "$out/native-before.jsonl"
 last=; stable=0
 for ((i=0;i<60;i++)); do
  now=$(docker exec "$prefix-pg" psql -U postgres -d datomic -Atc 'SELECT count(*),sum(octet_length(val)) FROM datomic_kvs;')
  echo "gc $now"
  if [[ $now == "$last" ]]; then stable=$((stable+1)); else stable=0; fi
  (( stable < 6 )) || break
  last=$now; sleep 5
 done
 (( stable >= 6 )) || { echo 'GC did not quiesce'; exit 1; }
 table=$(docker exec "$prefix-pg" psql -U postgres -d datomic -Atc "SELECT pg_total_relation_size('datomic_kvs')")
 vmfree=$(docker exec "$prefix-pg" sh -c 'df -Pk /var/lib/postgresql/data | tail -1' | awk '{print $4}')
 (( vmfree*1024 > table+5368709120 && $(free_mac)*1024 > table+16106127360 )) || { echo 'vacuum rewrite reserve unavailable'; exit 1; }
 docker exec "$prefix-pg" psql -v ON_ERROR_STOP=1 -U postgres -d datomic -c 'VACUUM FULL;' -c 'CHECKPOINT;' -c "SELECT pg_total_relation_size('datomic_kvs'),pg_database_size(current_database());"
 native_proof proof | tee "$out/native-after.jsonl"
 python3 - "$out/native-before.jsonl" "$out/native-after.jsonl" <<'PYPROOF'
import json,sys
def read(p):
 return [json.loads(s)['proof'] for s in open(p) if s.startswith('{') and json.loads(s).get('event')=='native-after'][-1]
a,b=map(read,sys.argv[1:]);assert a==b, 'vacuum changed current/history rows'
print(json.dumps({'event':'post-vacuum-native-equality','proof':b}))
PYPROOF
}
for ((end=chunk;end<=n;end+=chunk)); do
 run_driver "$end"
 require_recovered=0
 maintain
 run_driver "$end" verify
 if [[ $deliberate == true && $end == "$chunk" && $end -lt $n ]]; then
  run_driver "$((end+chunk))" & child=$!
  sleep 10
  docker kill "$prefix-driver"
  wait "$child" && { echo 'kill proof unexpectedly completed'; exit 1; }
  echo 'deliberate driver kill completed; next chunk resumes stored suffix'
  require_recovered=1
 fi
done
for role in gw-r gw-w tx; do docker stop -t 30 "$prefix-$role"; done
docker exec "$prefix-pg" psql -v ON_ERROR_STOP=1 -U postgres -d datomic -c CHECKPOINT
docker stop -t 30 "$prefix-pg"
[[ $(docker inspect --format '{{.State.ExitCode}}' "$prefix-pg") == 0 ]] || exit 1
docker run --rm --pull never --name "$prefix-copy" -v "$prefix-pg-data:/data:ro" postgres:17-alpine sh -c 'du -sk /data; du -sk /data/pg_wal; pg_controldata /data | head -20'
if [[ $n == 100000 ]]; then
 size=$(docker run --rm --pull never --name "$prefix-copy" -v "$prefix-pg-data:/data:ro" postgres:17-alpine du -sk /data | awk '{print $1}')
 (( size*1024 <= 20000000000 )) || { echo 'seed exceeds 20GB'; exit 1; }
 keep=true
fi
echo "sealed candidate=$keep volume=$prefix-pg-data"

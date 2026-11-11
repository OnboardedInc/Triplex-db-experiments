#!/usr/bin/env bash
# [DX-S5] Why: all containers are owned inside the measurement lock; SIGTERM removes containers before release.
# Rejected: leaving a peer resident or retaining a failed proof's volume.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
n=${1:?1000|10000|100000}; chunk=${2:?chunk subjects}; deliberate=${3:-false}; activation_check=${4:-false}
[[ $n == 1000 || $n == 10000 || $n == 100000 ]] || exit 2
[[ $chunk =~ ^[1-9][0-9]*$ ]] && (( chunk % 50 == 0 && chunk <= n && n % chunk == 0 )) || exit 2
prefix=tx2-dxs5-seed-$n; scope=dxs5-w0-$n-v1
repo=$PWD; out=$(mktemp -d "$repo/lab/experiments/EXP-DX1/s5/.runtime.XXXXXX")
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; timer=; watcher=; keep=false; owned=false; ready=false; partial=false
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ -z $timer ]] || kill "$timer" 2>/dev/null || true
 [[ -z $watcher ]] || kill "$watcher" 2>/dev/null || true
 if [[ $held == true && $owned == true ]]; then
  for role in driver peer copy budget extract; do docker rm -f "$prefix-$role" 2>/dev/null || true; done
  if (( rc != 0 )); then
   docker stop -t 3 "$prefix-gw-r" "$prefix-gw-w" || true
   docker stop -t 30 "$prefix-tx" "$prefix-pg" || true
   python3 "$repo/lab/experiments/EXP-DX1/s5/failure-logs.py" "$prefix" || true
   if [[ $ready == true && ${S5_DISCARD_ON_FAILURE:-0} != 1 ]]; then partial=true; fi
  fi
  for role in gw-r gw-w tx; do docker rm -f "$prefix-$role" 2>/dev/null || true; done
  docker stop -t 30 "$prefix-pg" || true
  docker rm "$prefix-pg" 2>/dev/null || true
  docker network rm "$prefix-net" 2>/dev/null || true
  if [[ $partial != true ]]; then
   docker volume rm "$prefix-tools" 2>/dev/null || true
   if [[ $keep != true ]]; then docker volume rm "$prefix-pg-data" 2>/dev/null || true; fi
  fi
  remaining=$(docker ps -aq --filter "name=^/$prefix-") || { echo 'cannot verify containers: retaining lock'; exit 1; }
  [[ -z $remaining ]] || { echo 'containers remain: retaining lock'; exit 1; }
  remaining_volumes=$(docker volume ls --filter "name=^$prefix-" --format '{{.Name}}' | sort) || { echo 'cannot verify volumes: retaining lock'; exit 1; }
  expected=; [[ $keep != true ]] || expected="$prefix-pg-data"
  [[ $partial != true ]] || expected="$prefix-pg-data"$'\n'"$prefix-tools"
  [[ $remaining_volumes == "$expected" ]] || { echo "unexpected retained volumes $remaining_volumes: retaining lock"; exit 1; }
 fi
 if [[ $held == true ]]; then rm "$lock/owner.json"; rmdir "$lock"; fi
 rm -rf "$out"
 echo "hold exit=$rc retained=$keep partial=$partial"; exit "$rc"
}
trap cleanup EXIT
trap 'exit 124' TERM INT
free_mac() { df -k /System/Volumes/Data | awk 'NR==2 {print $4}'; }
(( $(free_mac) >= 15728640 )) || { echo 'Mac below 15GiB'; exit 2; }
if [[ $n == 100000 ]]; then
 [[ -f /Users/sam/Claude/Projects/triplex-db-2/locks/long-hold-ok ]] || { echo 'long hold not authorized'; exit 2; }
fi
# [DX-S5] Why: discover missing built public imports before consuming an engine hold.
# Rejected: discovering a missing qualification package after all engine JVMs have started.
node --experimental-strip-types --input-type=module -e 'await import("./lab/bench/lib/composition.ts"); await import("./lab/bench/lib/w0-replica-driver.ts"); console.log("driver imports ready")'
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
held=true
printf '{"id":"DX-S5","pid":%s,"kind":"seed-%s"}\n' "$$" "$n" > "$lock/owner.json"
(( $(free_mac) >= 15728640 )) || exit 2
git diff --quiet && git diff --cached --quiet || { echo 'dirty source refused'; exit 2; }
git rev-parse HEAD
hold_started=$(date +%s)
echo "hold startedAt=$(date -u +%FT%TZ)"
seconds=1440; [[ $n != 100000 ]] || seconds=17900
# [DX-S5] Why: Bash defers traps while waiting on a foreground Docker client; end the client before signalling its supervisor.
# Rejected: TERM alone (a long seed could keep the measurement lock beyond its deadline).
abort_hold() {
 docker rm -f "$prefix-driver" "$prefix-peer" "$prefix-copy" "$prefix-extract" 2>/dev/null || true
 # [DX-S5] Why: interrupt a blocked vacuum/client while retaining stopped JVM diagnostics and durable partial data.
 # Rejected: force-removing every JVM before its failure log can be read.
 docker stop -t 3 "$prefix-gw-r" "$prefix-gw-w" 2>/dev/null || true
 docker stop -t 10 "$prefix-tx" "$prefix-pg" 2>/dev/null || true
 kill -TERM $$
}
(sleep "$seconds"; abort_hold) & timer=$!
[[ -z $(docker ps -aq --filter "name=^/$prefix-") ]] || exit 2
fresh=true
if [[ ${S5_RESUME:-0} == 1 ]]; then
 # [DX-S5] Why: a whole-controller interruption must resume the same owned data/checkpoint pair.
 # Rejected: adopting a same-named foreign volume or restarting from an ACK count without the durable journals.
 seed_id=
 for suffix in pg-data tools; do
  labels=$(docker volume inspect --format '{{index .Labels "triplex.lab.owner"}} {{index .Labels "triplex.dxs5.subjects"}} {{index .Labels "triplex.dxs5.chunk"}} {{index .Labels "triplex.dxs5.seed-id"}}' "$prefix-$suffix")
  read -r owner subjects saved_chunk identity <<< "$labels"
  [[ $owner == DX-S5 && $subjects == "$n" && $saved_chunk == "$chunk" && -n $identity && $identity != '<no value>' ]] || { echo 'resume ownership/input mismatch'; exit 2; }
  [[ -z $seed_id || $seed_id == "$identity" ]] || { echo 'resume volume pair mismatch'; exit 2; }
  seed_id=$identity
 done
 fresh=false; owned=true; ready=true
 echo "resuming owned unsealed seed id=$seed_id"
else
 for suffix in pg-data tools; do
  if docker volume inspect "$prefix-$suffix" >/dev/null 2>&1; then echo 'existing seed refused; use S5_RESUME=1 for its owned checkpoint pair'; exit 2; fi
 done
 owned=true; seed_id=$(node -e 'console.log(require("node:crypto").randomUUID())')
 for suffix in pg-data tools; do
  docker volume create --label triplex.lab.owner=DX-S5 --label "triplex.dxs5.subjects=$n" --label "triplex.dxs5.chunk=$chunk" --label "triplex.dxs5.seed-id=$seed_id" "$prefix-$suffix"
 done
fi
# Monitor during startup, writes and maintenance; reserve live-table rewrite space separately before vacuum.
(
 while true; do
  mac=$(free_mac)
  vm=$(docker run --rm --pull never --name "$prefix-budget" -v "$prefix-pg-data:/data:ro" postgres:17-alpine sh -c 'df -Pk /data | tail -1; du -sk /data') || { abort_hold; exit 1; }
  echo "disk $(date -u +%FT%TZ) macFreeKiB=$mac vm=$vm"
  # [DX-S5] Why: an absent driver previously suppressed resident diagnostics during maintenance.
  # Rejected: making all engine observations depend on a short-lived client container existing.
  docker stats --no-stream --format '{{.Name}} cpu={{.CPUPerc}} memory={{.MemUsage}}' "$prefix-pg" "$prefix-tx" "$prefix-gw-w" "$prefix-gw-r" 2>/dev/null || true
  docker inspect --format 'engine-state {{.Name}} running={{.State.Running}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} restarts={{.RestartCount}}' "$prefix-tx" 2>/dev/null || true
  for role in driver peer; do
   if docker container inspect "$prefix-$role" >/dev/null 2>&1; then docker stats --no-stream --format '{{.Name}} cpu={{.CPUPerc}} memory={{.MemUsage}}' "$prefix-$role" 2>/dev/null || true; fi
  done
  vmfree=$(echo "$vm" | awk 'NR==1 {print $4}')
  (( mac >= 15728640 && vmfree >= 5242880 )) || { abort_hold; exit 1; }
  sleep 10
 done
) & watcher=$!
source lab/experiments/EXP-DX1/s5/setup.sh
ready=true
start=$chunk
if [[ $fresh != true ]]; then
 saved=$(docker run --rm --pull never --name "$prefix-copy" -v "$prefix-tools:/state:ro" node:22.23.2-bookworm-slim node -e 'const fs=require("node:fs"),z=require("node:zlib");if(!fs.existsSync("/state/checkpoint.json.gz")){console.log("0 0");}else{const s=JSON.parse(z.gunzipSync(fs.readFileSync("/state/checkpoint.json.gz")));if(s.format!=="dxs5-seed/2"||s.N!==Number(process.argv[1])||s.scope!==process.argv[2]||!Number.isSafeInteger(s.endSubjects)||!Number.isSafeInteger(s.verifiedSubjects)||s.verifiedSubjects<0||s.endSubjects<s.verifiedSubjects||s.endSubjects>Number(process.argv[1]))throw Error("invalid checkpoint header");console.log(s.endSubjects,s.verifiedSubjects);}' "$n" "$scope")
 read -r committed verified <<< "$saved"
 (( committed % chunk == 0 && verified % chunk == 0 )) || { echo 'checkpoint chunk mismatch'; exit 2; }
 if (( committed > verified || committed == n )); then start=$committed; else start=$((committed+chunk)); fi
 (( start > 0 && start <= n )) || exit 2
 echo "resume startSubjects=$start committedSubjects=$committed verifiedSubjects=$verified"
fi
run_driver() { S5_REQUIRE_RECOVERED=${require_recovered:-0} bash lab/experiments/EXP-DX1/s5/driver.sh "$n" "$@"; }
# [DX-S5] Why: a killed seed process may have a durable uncheckpointed suffix; recover it without ending the owned hold.
# Rejected: deleting a several-hour partial seed on the first driver process interruption.
seed_recover() {
 for attempt in 1 2 3; do
  if run_driver "$1"; then return 0; else rc=$?; fi
  [[ $rc == 137 || $rc == 143 ]] || return "$rc"
  echo "seed driver exit=$rc; resume attempt=$((attempt+1)) from checkpoint and stored suffix"
 done
 return "$rc"
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
 for ((i=0;i<360;i++)); do
  now=$(docker exec "$prefix-pg" psql -U postgres -d datomic -Atc 'SELECT count(*),sum(octet_length(val)) FROM datomic_kvs;')
  echo "gc $now"
  if [[ $now == "$last" ]]; then stable=$((stable+1)); else stable=0; fi
  (( stable < 6 )) || break
  last=$now; sleep 5
 done
 (( stable >= 6 )) || { echo 'GC did not quiesce'; exit 1; }
 table=$(docker exec "$prefix-pg" psql -U postgres -d datomic -Atc "SELECT max(pg_total_relation_size(relid)) FROM pg_partition_tree('datomic_kvs') WHERE isleaf")
 echo "vacuum rewrite reserve bytes=$table (largest leaf; leaves reclaimed sequentially)"
 vmfree=$(docker exec "$prefix-pg" sh -c 'df -Pk /var/lib/postgresql/data | tail -1' | awk '{print $4}')
 (( vmfree*1024 > table+5368709120 && $(free_mac)*1024 > table+16106127360 )) || { echo 'vacuum rewrite reserve unavailable'; exit 1; }
 # [DX-S5] Why: the 70k post-vacuum peer lost its broker connection; keep JVMs out of the long SQL-exclusive reclaim.
 # Rejected: allowing maintenance to strand a live transactor, then deleting hours of otherwise resumable data.
 docker stop -t 3 "$prefix-gw-r" "$prefix-gw-w"
 docker stop -t 30 "$prefix-tx"
 docker inspect --format 'maintenance-stopped {{.Name}} running={{.State.Running}} exit={{.State.ExitCode}}' "$prefix-gw-r" "$prefix-gw-w" "$prefix-tx"
 for role in gw-r gw-w tx; do [[ $(docker inspect --format '{{.State.Running}}' "$prefix-$role") == false ]] || return 1; done
 docker exec "$prefix-pg" psql -v ON_ERROR_STOP=1 -U postgres -d datomic -c 'VACUUM FULL;' -c 'CHECKPOINT;' -c "SELECT sum(pg_total_relation_size(relid)) AS table_bytes,max(pg_total_relation_size(relid)) AS max_leaf_bytes,count(*) AS leaves,pg_database_size(current_database()) AS database_bytes FROM pg_partition_tree('datomic_kvs') WHERE isleaf;"
 reconnect() {
  docker start "$prefix-tx" "$prefix-gw-w"
  docker run --rm --pull never --name "$prefix-copy" --network "$prefix-net" node:22.23.2-bookworm-slim node -e 'let ok=false;for(let i=0;i<180;i++){try{const r=await fetch("http://"+process.argv[1]+":8080/health");if(r.ok){console.log(await r.text());ok=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}if(!ok)process.exit(1);' "$prefix-gw-w"
 }
 reconnect
 # [DX-S5] Why: exercise the observed connection failure once in a bounded proof, without modifying any facts.
 # Rejected: claiming the reconnect path works from shell shape alone.
 if [[ ${S5_TEST_BROKER_DOWN:-0} == 1 && ${disconnect_tested:-false} != true ]]; then
  disconnect_tested=true
  echo 'INJECTED native-after broker down once; expected fresh-peer connection failure and explicit retry'
  docker stop -t 3 "$prefix-tx"
 fi
 for attempt in 1 2 3; do
  echo "native-after attempt=$attempt"
  if native_proof proof 2>&1 | tee "$out/native-after.jsonl"; then break; else native_rc=$?; fi
  if (( attempt == 3 )) || ! rg -q 'AMQ219007|ActiveMQNotConnectedException' "$out/native-after.jsonl"; then return "$native_rc"; fi
  echo 'fresh native peer connection failed; restart owned writer/transactor and retry, with first failure retained above'
  docker stop -t 3 "$prefix-gw-w"; docker stop -t 30 "$prefix-tx"; reconnect
 done
 python3 - "$out/native-before.jsonl" "$out/native-after.jsonl" <<'PYPROOF'
import json,sys
def read(p,event):
 return [json.loads(s)['proof'] for s in open(p) if s.startswith('{') and json.loads(s).get('event')==event][-1]
a=read(sys.argv[1],'native-before');b=read(sys.argv[2],'native-after');assert a==b, 'maintenance changed current/history rows'
print(json.dumps({'event':'post-vacuum-native-equality','proof':b}))
PYPROOF
}
for ((end=start;end<=n;end+=chunk)); do
 seed_recover "$end"
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
if [[ $activation_check == true ]]; then
 [[ $n == 1000 ]] || { echo 'activation preflight is the 1k disposable seed only'; exit 2; }
 docker run --rm --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory 11g --memory-swap 11g \
 -v "$repo:$repo:ro" -v "$out:$out" -v "$prefix-tools:/tool:ro" -w "$repo" -e LD_LIBRARY_PATH=/tool -e PATH=/tool:/usr/local/bin:/usr/bin:/bin \
 -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" -e TRIPLEX_DATOMIC_LAYOUT=lean -e TX2_SWEEP_STRICT=1 -e TX2_W0_RESTORE_INDEXED_JOURNAL=1 \
 python:3.13-slim /tool/node --expose-gc --experimental-strip-types lab/experiments/EXP-DX1/r2/run.ts --replica --rung "$n" --scope "$scope" --traffic-dir "$out/traffic" \
 --seed-fingerprint --publish --post-capture --candidates --oracle-candidates --oracle-concurrency 8 --batch-oracle --verification-pages 4 --live --traffic-offset-s 120 --baseline-ms 12000 --live-warmup-ms 10000
fi
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
echo "sealed candidate=$keep volume=$prefix-pg-data wallSeconds=$(( $(date +%s)-hold_started ))"

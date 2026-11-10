#!/usr/bin/env bash
# [DX-M1] Why: retain logs before teardown and release the lease only after removing owned resources. Rejected: changing H3/H4 wrappers shared with other measurements.
set -euo pipefail
arm=${1:?zero|indexed}; [[ $arm == zero || $arm == indexed ]] || exit 2
prefix=tx2-dxm1-$arm-${2:?fresh attempt suffix}
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export DX_STACK_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-M1
out=$DX_STACK_EVIDENCE/$prefix; mkdir -p "$out"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; watch=; vmstat_pid=; runner=; pgwatch=
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ -z $watch ]] || kill "$watch" 2>/dev/null || true
 [[ -z $pgwatch ]] || kill "$pgwatch" 2>/dev/null || true
 [[ -z $runner ]] || kill "$runner" 2>/dev/null || true
 [[ -z $vmstat_pid ]] || kill "$vmstat_pid" 2>/dev/null || true
 if [[ $held == true ]]; then
  docker stop --time 15 "$prefix-tx" > "$out/tx-stop.txt" 2>&1 || true
  mkdir -p "$out/tx-internal"
  docker cp "$prefix-tx:/opt/datomic/log/." "$out/tx-internal/" 2> "$out/tx-log-copy.txt" || true
  docker cp "$prefix-tx:/tmp/m1.jfr" "$out/m1.jfr" 2> "$out/jfr-copy.txt" || true
  if [[ -s "$out/m1.jfr" ]]; then
   docker cp "$out/m1.jfr" "$prefix-gw-r:/tmp/tx.jfr" 2> "$out/jfr-stage.txt" || true
   docker exec "$prefix-gw-r" /opt/java/openjdk/bin/jfr summary /tmp/tx.jfr > "$out/jfr-summary.txt" 2>&1 || true
   docker exec "$prefix-gw-r" /opt/java/openjdk/bin/jfr print --events jdk.GCPhasePause,jdk.GarbageCollection,jdk.SafepointBegin,jdk.SafepointEnd,jdk.FileWrite,jdk.SocketRead,jdk.SocketWrite,jdk.JavaMonitorEnter,jdk.JavaMonitorWait,jdk.ThreadPark,jdk.CPULoad /tmp/tx.jfr > "$out/jfr-events.log" 2>&1 || true
  fi
  for role in tx gw-w gw-r; do docker cp "$prefix-$role:/tmp/gc.log" "$out/gc-$role.log" 2> "$out/gc-$role-copy.txt" || true; done
  for role in gw-w gw-r tx pg; do docker logs --timestamps "$prefix-$role" > "$out/$role.log" 2>&1 || true; done
  if docker container inspect "$prefix-driver" >/dev/null 2>&1; then mkdir -p "$out/driver"; docker cp "$prefix-driver:/driver/." "$out/driver/" || true; fi
  docker rm -f "$prefix-driver" "$prefix-health" "$prefix-cgroups" "$prefix-extract" >/dev/null 2>&1 || true
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes > "$out/down.log" 2>&1 || true
  docker volume rm "$prefix-driver" >> "$out/down.log" 2>&1 || true
  left=$(docker ps -a --filter "name=$prefix" --format '{{.Names}}'; docker volume ls --filter "name=$prefix" --format '{{.Name}}'; docker network ls --filter "name=$prefix" --format '{{.Name}}')
  printf '%s\n' "$left" > "$out/remaining.txt"
  if [[ -n $left ]]; then echo 'cleanup incomplete, retaining lock'; exit 1; fi
  rm "$lock/owner.json"; rmdir "$lock"
 fi
 # [DX-M1] Why: raw logs are evidence, compression bounds retained disk. Rejected: source snapshots or audit manifests.
 python3 - "$out" <<'PY'
import pathlib,gzip,sys
for p in pathlib.Path(sys.argv[1]).rglob('*'):
 if p.is_file() and p.suffix in ['.log','.jsonl','.jfr']:
  with p.open('rb') as i,gzip.open(str(p)+'.gz','wb') as o:
   while b:=i.read(1<<20):o.write(b)
  p.unlink()
PY
 exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
while :; do
 free=$(df -k /System/Volumes/Data | awk 'NR==2 {print $4}'); ((free>=15*1024*1024)) || { echo 'below 15 GiB free'; exit 1; }
 sh lab/bin/host-quiet.sh >> "$out/host-before.jsonl" || true
 if mkdir "$lock" 2>/dev/null; then held=true; break; fi
 sleep 5
done
printf '{"id":"DX-M1","pid":%s}\n' "$$" > "$lock/owner.json"
( sleep 850; kill -TERM $$ ) & watch=$!
ssh -F "$HOME/.colima/_lima/colima-triplex2/ssh.config" lima-colima-triplex2 'timeout 850 vmstat -t 1' > "$out/vmstat.log" 2>&1 & vmstat_pid=$!
export DX_TX_HEAP=3g DX_TX_MEMORY=4g DX_GW_WRITE_MEMORY=3g DX_GW_READ_MEMORY=3g DX_PG_MEMORY=2g
export DX_OBJECT_CACHE=1g DX_INDEX_THRESHOLD=256m DX_INDEX_MAX=1g TX2_ENGINE_CPUS=4
export DX_DRIVER_ENV="TRIPLEX_DATOMIC_LAYOUT=lean M1_PREINDEX=$([[ $arm == indexed ]] && echo 1 || echo 0) M1_Q3=1"
gc='-Xlog:gc*,safepoint:file=/tmp/gc.log:time,uptime:filecount=2,filesize=10M'
bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --no-publish --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write 1 --cpus-gw-read 2,3 \
 --gateway-src /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/stage/tx2-dxh4-q1-zero \
 --tx-java-opts "-Xms256m -Xmx3g $gc -XX:StartFlightRecording=filename=/tmp/m1.jfr,settings=profile,dumponexit=true,maxsize=96m" \
 --gw-java-opts "-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g $gc" \
 --pg-settings '-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB -c log_checkpoints=on -c log_lock_waits=on -c log_autovacuum_min_duration=0' > "$out/up.log" 2>&1
# [DX-M1] Why: a command-line GUC masks ALTER SYSTEM; configure the 100 ms burst log threshold in the reloadable file. Rejected: claiming a reload enabled per-insert timing without checking the effective value.
docker exec "$prefix-pg" psql -U postgres -d datomic -c "ALTER SYSTEM SET log_min_duration_statement=100;" -c 'SELECT pg_reload_conf();' > "$out/pg-threshold.txt"
docker exec "$prefix-pg" psql -U postgres -d datomic -Atc 'SHOW log_min_duration_statement;' >> "$out/pg-threshold.txt"
# Discover log destinations while alive, including nonstandard Logback files.
docker exec "$prefix-tx" sh -c 'find /opt/datomic /tmp -name "*.log" -o -name "*logback*"' > "$out/log-locations.txt"
if [[ $arm == zero || $arm == indexed ]]; then
 (
  while ! docker exec "$prefix-driver" test -f /driver/q3-ready 2>/dev/null; do sleep 2; done
  docker exec "$prefix-pg" psql -U postgres -d datomic -c "ALTER SYSTEM SET log_min_duration_statement=0;" -c 'SELECT pg_reload_conf();' > "$out/q3-pg-enable.txt" 2>&1
  docker exec "$prefix-pg" psql -U postgres -d datomic -Atc 'SHOW log_min_duration_statement;' >> "$out/q3-pg-enable.txt"
  grep -qx 0 "$out/q3-pg-enable.txt" || exit 1
  docker exec "$prefix-driver" touch /driver/q3-go
 ) & pgwatch=$!
fi
bash lab/experiments/EXP-DX1/m1/run-in-vm.sh "$prefix" --cpus 4,5,6,7 --memory 8g -- bash lab/experiments/EXP-DX1/m1/workload.sh > "$out/driver.log" 2>&1 & runner=$!
wait "$runner"; runner=
# jfr print is offline and local; raw recording is retained as well.
docker exec "$prefix-tx" sh -c 'ls -l /opt/datomic/log /tmp/gc*' > "$out/log-list.txt" 2>&1 || true

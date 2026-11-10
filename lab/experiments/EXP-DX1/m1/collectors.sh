#!/usr/bin/env bash
# [DX-M1] Why: change only write-peer JVM/cache configuration and retain the same frozen workload. Rejected: editing the shared stack or changing the read peer along with the writer.
set -euo pipefail
arm=${1:?G|Z|S|P}; suffix=${2:?fresh suffix}; txarm=${3:-G}
[[ $arm =~ ^[GZSP]$ && $txarm =~ ^[GZ]$ ]] || exit 2
prefix=tx2-dxm1-cg-$(echo "$arm" | tr A-Z a-z)-$suffix
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export DX_STACK_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-M1
out=$DX_STACK_EVIDENCE/$prefix
[[ ! -e $out ]] || { echo 'fresh prefix required'; exit 2; }
mkdir -p "$out"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; watch=; vmstat_pid=; runner=
cleanup() {
 rc=$?; trap - EXIT TERM INT
 for pid in "$watch" "$vmstat_pid" "$runner"; do [[ -z $pid ]] || kill "$pid" 2>/dev/null || true; done
 if [[ $held == true ]]; then
  for role in tx gw-w gw-r; do
   docker cp "$prefix-$role:/tmp/gc.log" "$out/gc-$role.log" 2> "$out/gc-$role-copy.txt" || true
   # [DX-M1] Why: retain rotated GC logs too; startup allocation can rotate a long run. Rejected: interpreting an incomplete active file as zero pauses.
   for i in 0 1; do docker cp "$prefix-$role:/tmp/gc.log.$i" "$out/gc-$role.log.$i" 2>/dev/null || true; done
  done
  mkdir -p "$out/tx-internal"
  docker cp "$prefix-tx:/opt/datomic/log/." "$out/tx-internal/" 2> "$out/tx-log-copy.txt" || true
  for role in gw-w gw-r tx pg; do docker logs --timestamps "$prefix-$role" > "$out/$role.log" 2>&1 || true; done
  if docker container inspect "$prefix-driver" >/dev/null 2>&1; then mkdir -p "$out/driver"; docker cp "$prefix-driver:/driver/." "$out/driver/" || true; fi
  docker rm -f "$prefix-driver" "$prefix-health" "$prefix-cgroups" "$prefix-extract" >/dev/null 2>&1 || true
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes > "$out/down.log" 2>&1 || true
  docker volume rm "$prefix-driver" >> "$out/down.log" 2>&1 || true
  left=$(docker ps -a --filter "name=$prefix" --format '{{.Names}}'; docker volume ls --filter "name=$prefix" --format '{{.Name}}'; docker network ls --filter "name=$prefix" --format '{{.Name}}')
  printf '%s\n' "$left" > "$out/remaining.txt"
  [[ -z $left ]] || { echo 'cleanup incomplete, retaining lock'; exit 1; }
  date -u '+%FT%TZ released' >> "$out/hold.txt"
  rm "$lock/owner.json"; rmdir "$lock"
 fi
 python3 - "$out" <<'PY'
import pathlib,gzip,sys,shutil
root=pathlib.Path(sys.argv[1])
(root/'gateway-files.json').unlink(missing_ok=True)
(root/'config/template.properties').unlink(missing_ok=True)
for p in (root/'sql').glob('*.sql'):p.unlink()
for p in root.rglob('*'):
 if p.is_file() and (p.suffix in ['.log','.jsonl','.json'] or '.log.' in p.name):
  with p.open('rb') as i,gzip.open(str(p)+'.gz','wb') as o:shutil.copyfileobj(i,o)
  p.unlink()
PY
 echo "FINISHED $prefix rc=$rc $(date -u '+%FT%TZ')"
 exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
while :; do
 free=$(df -k /System/Volumes/Data | awk 'NR==2 {print $4}'); ((free>=15*1024*1024)) || { echo 'below 15 GiB free'; exit 1; }
 bytes=$(du -sk "$DX_STACK_EVIDENCE" | awk '{print $1}'); ((bytes<300*1024)) || { echo 'evidence budget exhausted'; exit 1; }
 sh lab/bin/host-quiet.sh >> "$out/host-before.jsonl" || true
 if mkdir "$lock" 2>/dev/null; then held=true; break; fi
 sleep 5
done
printf '{"id":"DX-M1","pid":%s}\n' "$$" > "$lock/owner.json"
date -u '+%FT%TZ acquired' > "$out/hold.txt"
echo "START $prefix tx=$txarm $(date -u '+%FT%TZ')"
( sleep 850; kill -TERM $$ ) & watch=$!
ssh -F "$HOME/.colima/_lima/colima-triplex2/ssh.config" lima-colima-triplex2 'timeout 850 vmstat -t 1' > "$out/vmstat.log" 2>&1 & vmstat_pid=$!
export DX_TX_HEAP=3g DX_TX_MEMORY=4g DX_GW_WRITE_MEMORY=3g DX_GW_READ_MEMORY=3g DX_PG_MEMORY=2g
export DX_OBJECT_CACHE=1g DX_INDEX_THRESHOLD=256m DX_INDEX_MAX=1g TX2_ENGINE_CPUS=4
export DX_DRIVER_ENV='TRIPLEX_DATOMIC_LAYOUT=lean M1_PREINDEX=0 M1_Q3=0'
gc='-Xlog:gc*,safepoint:file=/tmp/gc.log:time,uptime:filecount=2,filesize=10M'
control='-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g'
export M1_SMALL=0
case $arm in
 G|P) writer=$control;;
 Z) writer='-Xms1g -Xmx2g -XX:+UseZGC -XX:+ZGenerational -Ddatomic.objectCacheMax=1g';;
 S) writer='-Xms512m -Xmx768m -XX:+UseG1GC -XX:MaxGCPauseMillis=10 -XX:+UnlockExperimentalVMOptions -XX:G1NewSizePercent=30 -Ddatomic.objectCacheMax=128m'; M1_SMALL=1;;
esac
export M1_GW_WRITE_JAVA_OPTS="$writer $gc"
tx='-Xms256m -Xmx3g'; [[ $txarm == G ]] || tx='-Xms1g -Xmx3g -XX:+UseZGC -XX:+ZGenerational'
wcpu=1; rcpu=2,3; [[ $arm != P ]] || { wcpu=2; rcpu=3; }
printf 'arm=%s tx=%s\nwriter=%s\nread=%s\ntransactor=%s\nwrite-cpu=%s read-cpu=%s\n' "$arm" "$txarm" "$M1_GW_WRITE_JAVA_OPTS" "$control $gc" "$tx $gc" "$wcpu" "$rcpu" > "$out/options.txt"
bash lab/experiments/EXP-DX1/m1/collectors-up.sh "$prefix" --no-publish --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write "$wcpu" --cpus-gw-read "$rcpu" \
 --gateway-src /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/stage/tx2-dxh4-q1-zero \
 --tx-java-opts "$tx $gc" --gw-java-opts "$control $gc" \
 --pg-settings '-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB -c log_checkpoints=on -c log_lock_waits=on -c log_autovacuum_min_duration=0 -c log_min_duration_statement=100' > "$out/up.log" 2>&1
bash lab/experiments/EXP-DX1/m1/run-in-vm.sh "$prefix" --cpus 4,5,6,7 --memory 8g -- bash lab/experiments/EXP-DX1/m1/workload.sh > "$out/driver.log" 2>&1 & runner=$!
wait "$runner"; runner=

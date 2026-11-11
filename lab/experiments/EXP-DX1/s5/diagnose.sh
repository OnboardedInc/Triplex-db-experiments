#!/usr/bin/env bash
# [DX-S5] Why: diagnose the only retained 80k image without seeding, indexing, GC or reclamation.
# Rejected: rerunning a mutating hold or deleting the owned checkpoint on diagnostic failure.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
repo=$PWD; prefix=tx2-dxs5-seed-100000; scope=dxs5-w0-100000-v1; fresh=false
out=$(mktemp -d "$repo/lab/experiments/EXP-DX1/s5/.diagnostic.XXXXXX")
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; timer=
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ -z $timer ]] || kill "$timer" 2>/dev/null || true
 if [[ $held == true ]]; then
  for role in peer copy; do docker rm -f "$prefix-$role" 2>/dev/null || true; done
  docker stop -t 15 "$prefix-gw-w" "$prefix-gw-r" "$prefix-tx" || true
  python3 "$repo/lab/experiments/EXP-DX1/s5/failure-logs.py" "$prefix" || true
  docker stop -t 30 "$prefix-pg" || true
  for role in gw-w gw-r tx pg extract; do docker rm -f "$prefix-$role" 2>/dev/null || true; done
  docker network rm "$prefix-net" || true
  [[ -z $(docker ps -aq --filter "name=^/$prefix-") ]] || { echo 'remaining containers; lock retained'; exit 1; }
  rm "$lock/owner.json"; rmdir "$lock"
 fi
 rm -rf "$out"; exit "$rc"
}
trap cleanup EXIT
trap 'exit 124' TERM INT
(( $(df -k /System/Volumes/Data | awk 'NR==2{print $4}') >= 15728640 )) || exit 2
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
held=true
printf '{"id":"DX-S5","pid":%s,"kind":"diagnose-80000"}\n' "$$" > "$lock/owner.json"
(sleep 2700; docker rm -f "$prefix-peer" "$prefix-copy" 2>/dev/null || true; kill -TERM $$) & timer=$!
[[ -z $(docker ps -aq --filter "name=^/$prefix-") ]] || exit 2
for suffix in pg-data tools; do
 docker volume inspect --format '{{json .Labels}}' "$prefix-$suffix"
 [[ $(docker volume inspect --format '{{index .Labels "triplex.dxs5.seed-id"}}' "$prefix-$suffix") == 1b8525ba-a1ae-4a81-9299-82e1e9a9f932 ]] || exit 2
done
sed 's/<root level="WARN">/<root level="INFO">/' lab/experiments/EXP-DX1/s5/logback.xml > "$out/logback.xml"
# [DX-S5] Why: retain startup/load/connection information without restoring per-KVS-block INFO floods.
# Rejected: WARN-only startup, which cannot distinguish a live broker from a loaded target database.
sed -i.bak '/<root level=/i\
  <logger name="datomic.kv-cluster" level="WARN"/>\
  <logger name="datomic.kv-cluster-storage" level="WARN"/>' "$out/logback.xml"
S5_TX_JAVA_EXTRA='-Xlog:gc*:file=/tmp/gc.log:time,uptime,level,tags:filecount=2,filesize=16M' S5_PEER_JAVA_EXTRA='-Xlog:gc*:file=/tmp/gc.log:time,uptime,level,tags:filecount=2,filesize=16M' S5_DIAGNOSTIC=1 S5_LOGBACK="$out/logback.xml" source lab/experiments/EXP-DX1/s5/setup.sh
echo "diagnostic started $(date -u +%FT%TZ) controller=$$"
# Keep the supervised engines alive for read-only observations from this task.
for ((i=0;i<240;i++)); do
 mac=$(df -k /System/Volumes/Data | awk 'NR==2{print $4}')
 vm=$(docker exec "$prefix-pg" sh -c 'df -Pk /var/lib/postgresql/data | tail -1')
 echo "diagnostic $(date -u +%FT%TZ) macFreeKiB=$mac vm=$vm"
 (( mac >= 15728640 && $(echo "$vm" | awk '{print $4}') >= 5242880 )) || exit 2
 sleep 10
done

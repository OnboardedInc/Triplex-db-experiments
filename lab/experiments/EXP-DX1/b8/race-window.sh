#!/usr/bin/env bash
set -euo pipefail
prefix=${1:?prefix}; shift
[[ $prefix =~ ^tx2-dxb8-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
mkdir -p "$root"
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
started=$(date +%s)
attempt="$root/$prefix-$started"
mkdir -p "$attempt"
cp -R lab/experiments/EXP-DX1/b8 "$attempt/runner"
wake_helper="$attempt/runner/${B8_WAKE_HELPER:-keep-awake.sh}"
printf '{"id":"DX-B8","pid":%d,"startedAtSeconds":%d}\n' $$ "$started" > "$lock/owner.json"
awake_owned=0
cleanup() {
 rc=$?; trap - EXIT; kill "$watchdog" 2>/dev/null || true
 if [[ ${B8_PROFILE:-0} == 1 ]] && docker inspect "$prefix-gw-r" >/dev/null 2>&1; then
  docker update --restart=no "$prefix-gw-r" >/dev/null 2>&1 || true
  docker exec "$prefix-gw-r" sh -c 'for p in /proc/[0-9]*; do if [ "$(cat "$p/comm" 2>/dev/null)" = java ]; then kill -TERM "${p##*/}"; fi; done' || true
  node lab/experiments/EXP-DX1/b6/bounded-command.mjs 10 docker wait "$prefix-gw-r" >/dev/null 2>&1 || docker kill "$prefix-gw-r" >/dev/null 2>&1 || true
  docker cp "$prefix-gw-r:/tmp/b8.jfr" "$attempt/read.jfr" || true
  if [[ -s "$attempt/read.jfr" ]]; then
   node lab/experiments/EXP-DX1/b6/bounded-command.mjs 15 docker run --rm --pull never --name "$prefix-profile" --cpuset-cpus 4,5,6,7 --memory 2g -v "$attempt:/evidence" --entrypoint /opt/java/openjdk/bin/jfr tx2-datomic:1.0.7745-da00 print --json --events jdk.ExecutionSample --stack-depth 30 /evidence/read.jfr > "$attempt/read-profile-30.json" || true
   node lab/experiments/EXP-DX1/b6/bounded-command.mjs 15 docker run --rm --pull never --name "$prefix-profile" --cpuset-cpus 4,5,6,7 --memory 2g -v "$attempt:/evidence" --entrypoint /opt/java/openjdk/bin/jfr tx2-datomic:1.0.7745-da00 print --json --events jdk.ExecutionSample --stack-depth 128 /evidence/read.jfr > "$attempt/read-profile.json" || true
  fi
 fi
 if [[ -f "$attempt/source/CAPTURE.json" ]]; then
  python3 - "$attempt/source/CAPTURE.json" "$attempt/source-stability.json" <<'PYSTABLE'
import hashlib,json,pathlib,sys
capture=json.load(open(sys.argv[1]));changed=[]
for name,expected in capture['files'].items():
 p=pathlib.Path(name)
 if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected['sha256']:changed.append(name)
pathlib.Path(sys.argv[2]).write_text(json.dumps({'sourceCapture':sys.argv[1],'changedDuringAttempt':changed,'unchanged':not changed}))
PYSTABLE
 fi
 docker logs "$prefix-uncached" > "$attempt/uncached.log" 2>&1 || true
 docker rm -f "$prefix-uncached" "$prefix-oracle-health" "$prefix-recent-selftest" "$prefix-profile" "$prefix-driver" "$prefix-health" "$prefix-cgroups" "$prefix-extract" "$prefix-selftest" >/dev/null 2>&1 || true
 for role in pg tx gw-w gw-r; do docker logs --timestamps "$prefix-$role" > "$attempt/$role.log" 2>&1 || true; done
 docker exec "$prefix-pg" du -sk /var/lib/postgresql/data > "$attempt/pg-size-kib.txt" 2>&1 || true
 volume_args=(--volumes); if [[ ${B8_KEEP_VOLUME:-} == 1 ]]; then volume_args=(); fi
 bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" ${volume_args[@]+"${volume_args[@]}"}
 docker volume rm "$prefix-driver" >/dev/null 2>&1 || true
 docker ps -a --filter "name=$prefix" --format '{{.Names}}' > "$root/$prefix-cleanup.txt"
 docker volume ls --filter "name=$prefix" --format '{{.Name}}' > "$attempt/volumes-retained.txt"
 python3 - "$attempt/volumes-retained.txt" "$prefix" "${B8_KEEP_VOLUME:-0}" <<'PYVOLUME'
import pathlib,sys
actual=pathlib.Path(sys.argv[1]).read_text().splitlines()
allowed=[sys.argv[2]+'-pg-data'] if sys.argv[3]=='1' else []
assert all(v in allowed for v in actual), (actual,allowed)
PYVOLUME
 docker network ls --filter "name=$prefix" --format '{{.Name}}' >> "$root/$prefix-cleanup.txt"
 [[ ! -s "$root/$prefix-cleanup.txt" ]] || { echo 'Cleanup incomplete; retaining lock'; exit 1; }
 python3 - "$lock/owner.json" "$$" <<'PY'
import sys,json
v=json.load(open(sys.argv[1]));assert v['id']=='DX-B8' and v['pid']==int(sys.argv[2])
PY
 printf '{"childExitCode":%d,"heldSeconds":%d,"containersAndNetworksEmpty":true,"retainedVolumesIndex":"volumes-retained.txt","semanticVerdict":null}\n' "$rc" "$(( $(date +%s) - started ))" > "$attempt/cleanup.json"
 if [[ $awake_owned == 1 ]]; then
  bash "$wake_helper" status > "$attempt/awake-final.txt"
  bash "$wake_helper" stop > "$attempt/awake-stop.txt"
  rg -q 'remaining 0' "$attempt/awake-stop.txt" || { echo 'Keep-awake workers remain; retaining lock'; exit 1; }
 fi
 rm "$lock/owner.json"; rmdir "$lock"; exit "$rc"
}
# [DX-B8] Why: include engine startup and cleanup in the fifteen-minute lease. Rejected: bounding only the benchmark.
(sleep 870; kill -TERM $$) & watchdog=$!
trap cleanup EXIT
trap 'exit 124' TERM INT
python3 -c 'import shutil;assert shutil.disk_usage(".").free >= 5*1024**3'
if [[ ${B8_KEEP_AWAKE:-0} == 1 ]]; then
 bash "$wake_helper" status > "$attempt/awake-before.txt"
 python3 - "$attempt/awake-before.txt" <<'PYOWN'
import json,sys
s=open(sys.argv[1]).read().splitlines();assert s[0]=='running 0';assert not json.loads(s[1])['workers']
PYOWN
 awake_owned=1
 bash "$wake_helper" start > "$attempt/awake-start.txt"
 bash "$wake_helper" status > "$attempt/awake-status.txt"
 python3 - "$attempt/awake-status.txt" <<'PYAWAKE'
import json,sys
s=open(sys.argv[1]).read().splitlines();assert s[0]=='running 8';assert json.loads(s[1])['onePerCpu'] is True
PYAWAKE
else
 bash "$wake_helper" status > "$attempt/awake-status.txt"
 python3 - "$attempt/awake-status.txt" <<'PYASLEEP'
import json,sys
s=open(sys.argv[1]).read().splitlines();assert s[0]=='running 0';assert not json.loads(s[1])['workers']
PYASLEEP
fi
printf '{"keepAwake":%s}\n' "${B8_KEEP_AWAKE:-0}" > "$attempt/environment.json"
profile=''; if [[ ${B8_PROFILE:-0} == 1 ]]; then profile='-XX:FlightRecorderOptions=stackdepth=128 -XX:StartFlightRecording=filename=/tmp/b8.jfr,settings=profile,dumponexit=true'; fi
python3 lab/experiments/EXP-DX1/b8/capture.py "$attempt/source"
export DX_STACK_EVIDENCE="$root"
src=(); if [[ -n ${B8_GATEWAY_SRC:-} ]]; then src=(--gateway-src "$B8_GATEWAY_SRC"); fi
ports=(--no-publish); if [[ ${B8_HOST_GATES:-} == 1 ]]; then ports=(--port-write 8526 --port-read 8527); fi
bash lab/experiments/EXP-DX1/b8/up.sh "$prefix" "${ports[@]}" ${src[@]+"${src[@]}"} --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write 1 --cpus-gw-read 2,3 --pg-memory 1g --tx-memory 4g --gw-memory 3g --tx-java-opts '-Xms1g -Xmx3g' --gw-java-opts "-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g -Dtriplex.entityCacheVerify=${B8_CACHE_VERIFY:-false} $profile" --object-cache-max 1g --memory-index-threshold 256m --memory-index-max 1g
export DX_DRIVER_ENV="DATOMIC_INTEGRATION=1 TRIPLEX_DATOMIC_LAYOUT=lean B8_LABEL=${B8_LABEL:-before} B8_HEADS=${B8_HEADS:-1000,50000,250000,500000} B8_SECONDS=${B8_SECONDS:-680} ${B8_DRIVER_ENV:-}"
# [DX-B8-C] Why: create the independent oracle on the host before launching the VM-local race driver.
# Rejected: mounting the Docker socket in the measured/test client.
node lab/experiments/EXP-DX1/b6/bounded-command.mjs "$(( 825 - $(date +%s) + started ))" "$@"

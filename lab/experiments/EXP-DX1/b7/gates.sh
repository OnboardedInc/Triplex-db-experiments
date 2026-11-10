#!/usr/bin/env bash
set -euo pipefail
prefix=${1:?prefix}; shift
[[ $prefix =~ ^tx2-dxb7-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
mkdir -p "$root"
keep_awake=false
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
lease_started=$(date +%s)
printf '{"id":"DX-B7","pid":%d,"startedAtSeconds":%d}\n' $$ "$lease_started" > "$lock/owner.json"
cleanup() {
  rc=${1:-$?}
  trap - EXIT
  if docker inspect "$prefix-gw-r" >/dev/null 2>&1; then
    # [DX-B7] Why: bin/run's PID 1 shell does not forward TERM to Java; stop the JVM itself so JFR dumps.
    # Rejected: docker stop alone (baseline-a retained a zero-byte JFR after its forced stop).
    docker update --restart=no "$prefix-gw-r" >/dev/null 2>&1 || true
    docker exec "$prefix-gw-r" sh -c 'for p in /proc/[0-9]*; do if [ "$(cat "$p/comm" 2>/dev/null)" = java ]; then kill -TERM "${p##*/}"; fi; done' || true
    docker wait "$prefix-gw-r" >/dev/null 2>&1 || true
    if [[ ${B7_PROFILE:-1} == 1 ]]; then docker cp "$prefix-gw-r:/tmp/b7.jfr" "$root/$prefix.jfr" || true; fi
    docker logs "$prefix-gw-r" > "$root/$prefix-gateway.log" 2>&1 || true
  fi
  if [[ -s "$root/$prefix.jfr" ]]; then
    docker run --rm --pull never --name "$prefix-profile" -v "$root:/evidence" --entrypoint /opt/java/openjdk/bin/jfr tx2-datomic:1.0.7745-da00 print --json --events jdk.ExecutionSample,jdk.GarbageCollection,jdk.GCPhasePause,jdk.JavaMonitorEnter,jdk.JavaThreadStatistics "/evidence/$prefix.jfr" > "$root/$prefix-profile.json" || true
  fi
  docker rm -f "$prefix-driver" "$prefix-health" "$prefix-cgroups" "$prefix-extract" >/dev/null 2>&1 || true
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes
  docker volume rm "$prefix-driver" >/dev/null 2>&1 || true
  docker ps -a --filter "name=$prefix" --format '{{.Names}}' > "$root/$prefix-cleanup.txt"
  docker volume ls --filter "name=$prefix" --format '{{.Name}}' >> "$root/$prefix-cleanup.txt"
  docker network ls --filter "name=$prefix" --format '{{.Name}}' >> "$root/$prefix-cleanup.txt"
  if [[ -s "$root/$prefix-cleanup.txt" ]]; then
    echo "Owned resources remain; retain lock for explicit cleanup" >&2; exit 1
  fi
  if [[ $keep_awake == true ]]; then
    bash "$root/$prefix-keep-awake.sh" status > "$root/$prefix-keep-awake-final-status.txt" 2>&1 || true
    bash "$root/$prefix-keep-awake.sh" stop > "$root/$prefix-keep-awake-stop.txt" 2>&1 || { echo 'Keep-awake cleanup failed; retain measurement lock' >&2; exit 1; }
    grep -q 'remaining 0' "$root/$prefix-keep-awake-stop.txt" || { echo 'Keep-awake workers remain; retain measurement lock' >&2; exit 1; }
  fi
  python3 - "$lock/owner.json" "$$" <<'PYOWNER'
import json,sys
owner=json.load(open(sys.argv[1]));assert owner['id']=='DX-B7' and owner['pid']==int(sys.argv[2])
PYOWNER
  python3 - "$root/$prefix-cleanup.txt" "$root/$prefix-cleanup.json" "$prefix" "$lease_started" "$rc" <<'PYCLEAN'
import pathlib,json,sys,time
inventory=pathlib.Path(sys.argv[1]);assert inventory.read_text()==''
pathlib.Path(sys.argv[2]).write_text(json.dumps({'prefix':sys.argv[3],'inventory':str(inventory),'inventoryEmpty':True,'heldSeconds':int(time.time())-int(sys.argv[4]),'childExitCode':int(sys.argv[5]),'purpose':'execution and cleanup only; no semantic verdict'},indent=2)+'\n')
PYCLEAN
  rm "$lock/owner.json"; rmdir "$lock"
  exit "$rc"
}
trap cleanup EXIT
# [DX-B7] Why: enforce the complete lock hold, including startup and cleanup. Rejected: timing only the driver.
(sleep 870; kill -TERM $$) & watchdog=$!
finish() { result=$?; kill "$watchdog" 2>/dev/null || true; cleanup "$result"; }
trap finish EXIT
git -C /Users/sam/projects/triplex-db-2/.claude/worktrees/d-native show lane/d-native:lab/experiments/EXP-DX1/vm-wake/RESULT.md > "$root/$prefix-vm-wake.txt" 2>/dev/null || true
if [[ -s "$root/$prefix-vm-wake.txt" ]]; then
  cmp -s lab/experiments/EXP-DX1/b7/VM-WAKE-RESULT.md "$root/$prefix-vm-wake.txt" || { cat "$root/$prefix-vm-wake.txt"; echo 'Re-read changed VM wake instructions' >&2; exit 2; }
  git -C /Users/sam/projects/triplex-db-2/.claude/worktrees/d-native show lane/d-native:lab/experiments/EXP-DX1/vm-wake/keep-awake.sh > "$root/$prefix-keep-awake-upstream.sh"
  cmp -s lab/experiments/EXP-DX1/b7/keep-awake-upstream.sh "$root/$prefix-keep-awake-upstream.sh" || { echo 'Re-read changed keep-awake helper' >&2; exit 2; }
  cp lab/experiments/EXP-DX1/b7/keep-awake-fixed.sh "$root/$prefix-keep-awake.sh"
  keep_awake=true
  bash "$root/$prefix-keep-awake.sh" start > "$root/$prefix-keep-awake-start.txt" 2>&1
  bash "$root/$prefix-keep-awake.sh" status > "$root/$prefix-keep-awake-status.txt"
  python3 - "$root/$prefix-keep-awake-status.txt" <<'PYAWAKE'
import json,sys
lines=open(sys.argv[1]).read().splitlines();assert lines[0]=='running 8'
s=json.loads(lines[1]);assert s['onePerCpu'] and len(s['workers'])==8
PYAWAKE
fi
printf '{"keepAwake":%s,"earlierRunsHadKeepAwake":false}\n' "$keep_awake" > "$root/$prefix-environment.json"
export DX_STACK_EVIDENCE="$root"
if [[ ${B7_PREBUILD:-} == 1 ]]; then node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic...; fi
python3 -c 'import shutil; assert shutil.disk_usage(".").free >= 5*1024**3, "Host disk free below 5 GiB"'
python3 lab/experiments/EXP-DX1/b7/capture.py "$root/$prefix-source"
started=$(date +%s)
profile_opts=''
if [[ ${B7_PROFILE:-1} == 1 ]]; then profile_opts='-XX:StartFlightRecording=filename=/tmp/b7.jfr,settings=profile,dumponexit=true'; fi
publish=(--no-publish); if [[ ${B7_HOST_GATES:-} == 1 ]]; then publish=(--port-write 8516 --port-read 8517); fi
bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" "${publish[@]}" --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write 1 --cpus-gw-read 2,3 --pg-memory 1g --tx-memory 4g --gw-memory 3g --tx-java-opts '-Xms1g -Xmx3g' --gw-java-opts "-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g $profile_opts -Dtriplex.entityCacheVerify=${B7_CACHE_VERIFY:-false}" --object-cache-max 1g --memory-index-threshold 256m --memory-index-max 1g
if [[ ${B7_CLOJURE_GATES:-} == 1 ]]; then bash lab/experiments/EXP-DX1/b7/clojure-gates.sh "$prefix"; fi
export DX_DRIVER_ENV="DATOMIC_INTEGRATION=1 TRIPLEX_DATOMIC_LAYOUT=lean ${B7_DRIVER_ENV:-}"
if [[ ${B7_HOST_GATES:-} == 1 ]]; then
 export DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:8516 DATOMIC_URL=http://127.0.0.1:8516 DATOMIC_READ_URLS=http://127.0.0.1:8517
 node lab/experiments/EXP-DX1/b6/bounded-command.mjs "$((830 - $(date +%s) + started))" "$@"
else
 node lab/experiments/EXP-DX1/b6/bounded-command.mjs "$((830 - $(date +%s) + started))" bash lab/experiments/EXP-DX1/stack/run-in-vm.sh "$prefix" --cpus 4,5,6,7 --memory 5g -- "$@"
fi

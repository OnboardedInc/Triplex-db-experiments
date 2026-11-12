#!/usr/bin/env bash
# [DX-R3-P9] Why: alternate clock/read-path controls inside one bounded owned lease before any behavioral fix.
# Rejected: changing the mechanism first, or letting raw output grow without the task's disk/file guard.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export DX_STACK_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R3
tag=${1:?fresh tag}; shift
[[ $tag =~ ^p9-[a-z0-9-]+$ && $# -gt 0 ]] || exit 2
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
child=; guard=; held=false; prefix=
disk() { python3 -c 'import shutil; n=shutil.disk_usage(".").free; print("freeBytes",n,flush=True); assert n>=15*1024**3, "15 GiB floor"'; }
finish() {
  rc=$?; trap - EXIT TERM INT
  [[ ${BASH_SUBSHELL:-0} == 0 ]] || exit "$rc"
  if [[ -n $child ]]; then kill -TERM "$child" 2>/dev/null || true; wait "$child" || true; fi
  if [[ -n $guard ]]; then kill "$guard" 2>/dev/null || true; wait "$guard" 2>/dev/null || true; fi
  if [[ $held == true ]]; then
    for type in container volume network; do
      case $type in
        container) remaining=$(docker ps -a --filter "name=tx2-dxr3-$tag" --format '{{.Names}}') || exit 1;;
        volume) remaining=$(docker volume ls --filter "name=tx2-dxr3-$tag" --format '{{.Name}}') || exit 1;;
        network) remaining=$(docker network ls --filter "name=tx2-dxr3-$tag" --format '{{.Name}}') || exit 1;;
      esac
      [[ -z $remaining ]] || { echo "retain lock: resources remain $remaining"; exit 1; }
    done
    disk || rc=1
    rm "$lock/owner.json"; rmdir "$lock"
  fi
  exit "$rc"
}
trap finish EXIT
trap 'exit 143' TERM INT
disk
if ! mkdir "$lock" 2>/dev/null; then cat "$lock/owner.json"; exit 75; fi
held=true
printf '{"id":"DX-R3","pid":%s,"kind":"writer-arms"}\n' "$$" > "$lock/owner.json"
export DX_R3_PAIR_LEASE_PID=$$
disk
python3 - "$DX_STACK_EVIDENCE" "$$" <<'PY' &
import os, pathlib, signal, sys, time, shutil
root=pathlib.Path(sys.argv[1]); parent=int(sys.argv[2]); until=time.monotonic()+1140
while time.monotonic()<until:
    bad=None
    for p in root.rglob('*'):
        try:
            if p.is_file() and p.stat().st_size>1_000_000_000: bad=p; break
        except FileNotFoundError: pass
    if bad or shutil.disk_usage('.').free<15*1024**3:
        print('STOP disk/file guard',bad,flush=True); break
    time.sleep(2)
os.kill(parent,signal.SIGTERM)
PY
guard=$!
i=0
for arm in "$@"; do
  i=$((i+1)); prefix=tx2-dxr3-$tag-$(echo "$arm" | tr A-Z a-z)$i
  [[ ! -e $DX_STACK_EVIDENCE/$prefix && ! -e $DX_STACK_EVIDENCE/$prefix.log.gz ]] || exit 2
  extra=(--replica-fallback-thread main)
  case $arm in
    J) read=replica; strict=1; export DX_CPUS_PG=0 DX_CPUS_TX=1 DX_CPUS_GW_WRITE=2 DX_CPUS_GW_READ=3; export DX_TX_JAVA_OPTS='-Xms256m -Xmx3g -Xlog:gc,safepoint:stdout:time,uptime';;
    K) read=replica; strict=1; export DX_CPUS_PG=0 DX_CPUS_TX=1 DX_CPUS_GW_WRITE=2 DX_CPUS_GW_READ=3; export DX_TX_JAVA_OPTS='-Xms256m -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Xlog:gc,safepoint:stdout:time,uptime';;
    G) read=replica; strict=1; extra=(--replica-fallback-thread worker);; A) read=gateway; strict=0;; B) read=gateway; strict=1;; C) read=replica; strict=0;; D) read=replica; strict=1;; *) exit 2;; esac
  export DX_READ_PATH=$read DX_STRICT_RECORD_CLOCKS=$strict DX_R3_SOURCE_DIAGNOSTICS=1
  echo "ARM $arm $prefix strict=$strict read=$read TX_JAVA_OPTS=${DX_TX_JAVA_OPTS:-default} $(date -u)"
  bash lab/experiments/EXP-DX1/h4/run.sh real "$prefix" --rung 10k --zero-readers --match-duration-s 200 --reader-ladder-only --level-s 30 --max-readers 1024 --seed-batch-facts "${DX_R3_SEED_BATCH_FACTS:-400}" --replica-history-mib 192 ${extra[@]+"${extra[@]}"} > "$DX_STACK_EVIDENCE/$prefix.log" 2>&1 & child=$!
  arm_rc=0; wait "$child" || arm_rc=$?; child=
  python3 lab/experiments/EXP-DX1/r3/writer-arm-summary.py "$DX_STACK_EVIDENCE/$prefix" "$arm" || true
  gzip "$DX_STACK_EVIDENCE/$prefix.log"
  gzip -t "$DX_STACK_EVIDENCE/$prefix.log.gz"
  # [DX-R3-P9] Why: the child emitted reports/writes and peer logs into this complete raw command stream before verified cleanup.
  # Rejected: retaining duplicate setup captures and raw directories between fresh arms.
  [[ $arm_rc == 0 ]] || exit "$arm_rc"
  rm -rf "$DX_STACK_EVIDENCE/$prefix"
  disk
 done

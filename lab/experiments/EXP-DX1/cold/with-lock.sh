#!/usr/bin/env bash
# [COLD-1] Why: every container of this investigation exists only under the measurement lock, and the lock is released
# only after its containers, volumes and networks are gone and the guest's CPUs are all online again.
# Rejected: per-command locking without a cleanup trap (an interrupted probe would leave resources outside a lease).
# usage: with-lock.sh KIND -- COMMAND...
set -euo pipefail
kind=${1:?kind}; shift
[[ ${1:-} == -- ]] && shift
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
lock=$HOME/Claude/Projects/triplex-db-2/locks/measure
python3 -c 'import shutil,os,sys; sys.exit(0 if shutil.disk_usage(os.path.expanduser("~")).free >= 15*1024**3 else 3)' || { echo "refusing: under 15 GiB free" >&2; exit 3; }
tries=0
until mkdir "$lock" 2>/dev/null; do tries=$((tries+1)); [[ $tries -lt 120 ]] || { echo "measurement lock busy" >&2; exit 75; }; sleep 5; done
printf '{"id":"COLD","pid":%s,"kind":"%s"}\n' "$$" "$kind" > "$lock/owner.json"
export COLD_LEASE_PID=$$
cleanup() {
  rc=$?; trap - EXIT TERM INT
  ids=$(docker ps -aq --filter 'name=^/tx2-cold-' || true)
  [[ -z $ids ]] || docker rm -f $ids >/dev/null 2>&1 || true
  # Bring every guest CPU back online before the lease ends (a probe may have taken some offline).
  docker run --rm --pull never --privileged --network none --name tx2-cold-restore node:22.23.2-bookworm-slim sh -c \
    'for f in /sys/devices/system/cpu/cpu[0-9]*/online; do [ "$(cat $f)" = 1 ] || echo 1 > $f; done; cat /sys/devices/system/cpu/online' > "${COLD_RESTORE_LOG:-/dev/null}" 2>&1 || rc=1
  vols=$(docker volume ls -q --filter 'name=^tx2-cold-' || true)
  [[ -z $vols ]] || docker volume rm $vols >/dev/null 2>&1 || true
  nets=$(docker network ls -q --filter 'name=^tx2-cold-' || true)
  [[ -z $nets ]] || docker network rm $nets >/dev/null 2>&1 || true
  left="$(docker ps -aq --filter 'name=^/tx2-cold-')$(docker volume ls -q --filter 'name=^tx2-cold-')$(docker network ls -q --filter 'name=^tx2-cold-')"
  if [[ -n $left ]]; then echo "owned resources remain; keeping the lock" >&2; exit 1; fi
  rm "$lock/owner.json"; rmdir "$lock"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
"$@"

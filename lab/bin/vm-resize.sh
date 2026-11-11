#!/usr/bin/env bash
# Restart the dedicated triplex2 colima VM with a new memory size, under the measurement lock.
# usage: vm-resize.sh <memory GiB> [file to wait for before taking the lock]
# Never touches the default colima profile. Restores the docker context and remounts the data disk with discard.
set -uo pipefail
mem=${1:?memory GiB}; waitfile=${2:-}
out=/Users/sam/Claude/Projects/triplex-db-2/evidence/ORCH-vm-resize; mkdir -p "$out"
log="$out/resize-$(date -u +%Y%m%dT%H%M%SZ)-${mem}g.log"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
[ -z "$waitfile" ] || until [ -e "$waitfile" ]; do sleep 20; done
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"ORCH-vm-resize","pid":%d}\n' $$ > "$lock/owner.json"
trap 'rm -rf "$lock"' EXIT
(
  date -u
  running=$(docker ps -q | wc -l | tr -d ' ')
  echo "containers running: $running"
  if [ "$running" != 0 ]; then echo "refusing: containers are running while the lock was free"; docker ps --format '{{.Names}}'; exit 4; fi
  ctx=$(env -u DOCKER_HOST docker context show); echo "context before: $ctx"
  echo "volumes before: $(docker volume ls -q | wc -l)"; echo "images before: $(docker images -q | sort -u | wc -l)"
  sh "$(dirname "$0")/host-quiet.sh"
  colima stop -p triplex2
  colima start -p triplex2 --cpu 8 --memory "$mem" --disk 100
  env -u DOCKER_HOST docker context use "$ctx"
  echo "context after: $(env -u DOCKER_HOST docker context show)"
  colima list
  colima ssh -p triplex2 -- sudo mount -o remount,discard /var/lib/docker
  colima ssh -p triplex2 -- sh -c 'mount | grep /var/lib/docker; free -g | sed -n 2p; nproc'
  echo "volumes after: $(docker volume ls -q | wc -l)"; echo "images after: $(docker images -q | sort -u | wc -l)"
  docker info --format 'docker sees {{.NCPU}} cpu {{.MemTotal}} bytes'
  env -u DOCKER_HOST docker context show
  date -u
) > "$log" 2>&1
rc=$?
echo "resize rc=$rc log=$log"; tail -12 "$log"
exit $rc

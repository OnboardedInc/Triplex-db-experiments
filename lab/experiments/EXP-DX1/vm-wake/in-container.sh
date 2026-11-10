#!/usr/bin/env bash
# Keep-awake that works: one SCHED_IDLE busy loop per CPU, started INSIDE each container of a stack (same cgroup as the
# measured threads, so the idle policy is honoured: about 8% dense cost on the probe against 45 to 54% for loops outside).
# usage: in-container.sh watch <container-name-prefix>   (run in the background; polls every 2 s and equips each new
#        container whose name starts with the prefix; kill this script to stop equipping; loops die with their containers)
# Note: the loops' CPU time is charged to the container's cgroup, so per-container CPU percentages include it.
set -uo pipefail
[[ ${1:-} == watch && -n ${2:-} ]] || { echo "usage: $0 watch <prefix>" >&2; exit 2; }
prefix=$2; export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock; seen=" "
while :; do
  for c in $(docker ps --format '{{.Names}}' | grep "^$prefix" || true); do
    case "$seen" in *" $c "*) continue;; esac
    cpus=$(docker inspect "$c" --format '{{.HostConfig.CpusetCpus}}'); n=0
    for part in ${cpus//,/ }; do if [[ $part == *-* ]]; then n=$((n + ${part#*-} - ${part%-*} + 1)); else n=$((n+1)); fi; done
    [[ $n -eq 0 ]] && n=1
    ok=0; for i in $(seq 1 $n); do docker exec -d "$c" chrt -i 0 sh -c 'while :; do :; done' 2>/dev/null && ok=$((ok+1)); done
    echo "$(date -u +%T) $c cpuset=$cpus loops=$ok/$n"; seen="$seen$c "
  done
  sleep 2
done

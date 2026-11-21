#!/usr/bin/env bash
set -uo pipefail

# [DX-BM1] Why: stack/up.sh checks requested stack CPUs against its caller's affinity on bare metal. A driver pinned
# before its stack starts is refused. Keep the driver on all host CPUs while none of its stack's transactors runs,
# and on its builder's driver CPUs while one does, so the check sees the host and the windows see the builder's pinning.
# Rejected: editing the pinned builds, skipping the check, or leaving the driver unpinned during measurement.
pattern=$1
container=$2
pinned=$3
all=0-$(( $(nproc --all) - 1 ))
fix() {
  for pid in $(pgrep -f "$pattern"); do
    [[ $pid == "$$" ]] && continue
    have=$(taskset -pc "$pid" 2>/dev/null | awk '{print $NF}') || continue
    if [[ -n $have && $have != "$1" ]]; then
      taskset -a -p -c "$1" "$pid" > /dev/null 2>&1 && echo "$(date -u +%FT%T.%3NZ) $pid $have -> $1"
    fi
  done
}
# The watcher itself stays on the last CPU, which none of these stacks or drivers use.
taskset -p -c "${all#0-}" $$ > /dev/null
while true; do
  if docker ps --format '{{.Names}}' | grep -Eq "$container"; then
    fix "$pinned"
    sleep 2
  else
    for _ in $(seq 25); do fix "$all"; sleep 0.02; done
  fi
done

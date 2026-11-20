#!/usr/bin/env bash
set -uo pipefail

base=/var/tmp/triplex-bm1
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
exec 9<> "$base/night-n20-next.lock"
flock -n 9 || exit 75

wait_terminal() {
  local unit=$1 state
  while state=$(systemctl show "$unit" -p ActiveState --value); do
    [[ $state == inactive || $state == failed ]] && return 0
    sleep 10
  done
  return 1
}

wait_terminal bm1n20-prep1-tenant.service || exit 75
for item in jvm25 tail-backlog; do
  # [DX-BM1] Why: let the next exclusive unit take the bench even when a prior run fails.
  # Rejected: a waiting SSH client or starting during another run's teardown.
  systemd-run --wait --unit="bm1n20-$item" --property=RuntimeMaxSec=9000s \
    --property=TimeoutStopSec=240s --property=KillMode=control-group \
    --property="StandardOutput=append:$base/night-n20-$item.log" \
    --property="StandardError=append:$base/night-n20-$item.log" \
    --property="ExecStopPost=/bin/bash $here/night-n20-run.sh cleanup $item" \
    /bin/bash "$here/night-n20-run.sh" run "$item"
  rc=$?
  wait_terminal "bm1n20-$item.service" || exit 75
  printf '%s %s %s\n' "$(date -u +%FT%TZ)" "$item" "$rc" >> "$base/night-n20-dispositions.txt"
done

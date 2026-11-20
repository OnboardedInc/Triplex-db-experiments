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

bash "$here/prep1-stop-after-two.sh" wait || exit 75
prep_root=$base/day-n20-prep1-tenant
prep_cleanup=$base/day-n20-prep1-tenant-control/lab/experiments/EXP-DX1/bm1/probes/prep1-run.sh
systemd-run --wait --unit=bm1n20-prep1-two --property=RuntimeMaxSec=3660s \
  --property=TimeoutStopSec=245s --property=KillMode=control-group \
  --property="StandardOutput=append:$prep_root/two-gateway.log" \
  --property="StandardError=append:$prep_root/two-gateway.log" \
  --property="ExecStopPost=/bin/bash $prep_cleanup cleanup $prep_root" \
  /bin/bash "$here/prep1-stop-after-two.sh" run
rc=$?
wait_terminal bm1n20-prep1-two.service || exit 75
printf '%s prep1-two %s\n' "$(date -u +%FT%TZ)" "$rc" >> "$base/night-n20-dispositions.txt"
for item in tail-backlog jvm25; do
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

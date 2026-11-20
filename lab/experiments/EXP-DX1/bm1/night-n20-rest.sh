#!/usr/bin/env bash
set -uo pipefail

action=${1:?run or cleanup or queue}
item=${2:-queue}
base=/var/tmp/triplex-bm1
root=$base/night-n20-$item
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
public=https://github.com/OnboardedInc/Triplex-db-experiments.git
exp=lab/experiments/EXP-DX1
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1 DX_NATIVE_BOOTSTRAP_CACHE=$base/day-p3r/checkout

wait_terminal() {
  local unit=$1 state
  while state=$(systemctl show "$unit" -p ActiveState --value); do
    [[ $state == inactive || $state == failed ]] && return 0
    sleep 10
  done
  return 1
}

status() {
  local tmp
  tmp=$(mktemp "$base/night-n20-state.XXXXXX")
  printf 'item=%s state=%s since=%s next=%s\n' "$item" "$1" "$(date -u +%FT%TZ)" "$2" > "$tmp"
  mv "$tmp" "$base/STATUS"
}

if [[ $action == queue ]]; then
  exec 9<> "$base/night-n20-rest.lock"
  flock -n 9 || exit 75
  wait_terminal bm1n20-night-reordered.service || exit 75
  # [DX-BM1] Why: give the fresh PREP1 handoff and the retained-roster check one bounded decision window.
  # Rejected: allowing a missing publication to strand the ready erasure and import commands.
  item=queue
  status awaiting-writer-followup erasure
  for ((i=0; i<60; i++)); do
    next=$(systemctl show bm1n20-prep1-followup.service -p LoadState --value)
    if [[ $next != not-found ]]; then
      wait_terminal bm1n20-prep1-followup.service || exit 75
      break
    fi
    [[ ! -f $base/night-n20-skip-writer-followup ]] || break
    sleep 10
  done
  for item in erasure ha1-paced; do
    # [DX-BM1] Why: preserve at least one hour for the ready shared-database import before midday.
    # Rejected: starting a 5.5-hour erasure stage too late to respect the release window.
    noon=$(date -u -d '2026-11-21T17:00:00Z' +%s)
    remaining=$((noon - $(date -u +%s)))
    case $item in
      erasure) minimum=18600; ceiling=19800 ;;
      ha1-paced) minimum=3900; ceiling=3600 ;;
    esac
    if (( remaining < minimum + 300 )); then
      printf '%s %s deadline\n' "$(date -u +%FT%TZ)" "$item" >> "$base/night-n20-dispositions.txt"
      continue
    fi
    if [[ $item == erasure ]]; then
      (( ceiling = remaining-4200 < ceiling ? remaining-4200 : ceiling ))
      if (( ceiling < 14400 )); then
        printf '%s %s insufficient-stage-window\n' "$(date -u +%FT%TZ)" "$item" >> "$base/night-n20-dispositions.txt"
        continue
      fi
    fi
    systemd-run --wait --unit="bm1n20-$item" --property="RuntimeMaxSec=${ceiling}s" \
      --property=TimeoutStopSec=245s --property=KillMode=control-group \
      --property="StandardOutput=append:$base/night-n20-$item.log" \
      --property="StandardError=append:$base/night-n20-$item.log" \
      --property="ExecStopPost=/bin/bash $here/night-n20-rest.sh cleanup $item" \
      /bin/bash "$here/night-n20-rest.sh" run "$item"
    rc=$?
    wait_terminal "bm1n20-$item.service" || exit 75
    printf '%s %s %s\n' "$(date -u +%FT%TZ)" "$item" "$rc" >> "$base/night-n20-dispositions.txt"
  done
  item=queue
  status waiting-for-review orchestrator
  exit 0
fi

case $item in
  erasure) branch=exp/DX-ERASE1-erasure-cost; pin=4054f548469e57b6aa82b06e93711c39b6867f7c ;;
  ha1-paced) branch=exp/DX-HA1-failover-move; pin=e1b5d34d27249c330aa257a1d5fcc4298b578c56 ;;
  *) exit 2 ;;
esac

erase_run() {
  local location=$1 tag=$2 seconds=$3
  python3 - "$location" "$tag" "$seconds" "$pin" <<'PY'
from pathlib import Path
import json,sys,time
root=Path(sys.argv[1]); now=time.time()
with (root/"request.json").open("x") as stream:
    json.dump(dict(root=str(root),directory=str(root),tag=sys.argv[2],item=34,
                   start=now,deadline=now+int(sys.argv[3]),source=sys.argv[4]),stream)
PY
  python3 "$here/probes/erase-runner.py" run "$location/request.json"
}

cleanup() {
  local phase
  if [[ $item == erasure ]]; then
    for phase in "$root-small" "$root"; do
      if [[ -f $phase/request.json ]]; then
        python3 "$here/probes/erase-runner.py" cleanup "$phase/request.json" || return 1
      fi
    done
  elif [[ -f $root/request.json ]]; then
    python3 "$here/ha-micro-run.py" cleanup paced || return 1
  fi
}

if [[ $action == cleanup ]]; then
  if ! cleanup; then status cleanup-failed operator; exit 1; fi
  if [[ ${SERVICE_RESULT:-success} != success ]]; then status incomplete next-ready-item; fi
  exit 0
fi

set -e
[[ $action == run && $(id -u) == 0 && -z $(docker ps -q) ]]
mkdir "$root"
status preparing native-small
git -c credential.helper= clone --quiet --single-branch --no-checkout --branch "$branch" "$public" "$root/producer"
git -C "$root/producer" checkout --quiet --detach "$pin"
bash "$root/producer/$exp/t1/bare-metal.sh" --prepare "$pin" "$root/build"
if [[ $item == erasure ]]; then
  python3 "$here/probes/erase-fast-source.py" "$root/build/repository" > "$root/adapter.json"
  mkdir "$root-small"
  status checking-native-small staged-fixtures
  erase_run "$root-small" erasen20small 810
  python3 "$here/probes/erase-runner.py" cleanup "$root-small/request.json"
  [[ -s $root-small/collector.json && -s $root-small/erase-clean.json ]]
  status staging native-checks
  erase_run "$root" erasen20fast 18400
  cleanup
  status measured next-ready-item
else
  python3 "$here/ha-micro-run.py" run paced
fi

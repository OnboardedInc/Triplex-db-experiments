#!/usr/bin/env bash
set -uo pipefail

base=/var/tmp/triplex-bm1
controls=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
public=https://github.com/OnboardedInc/Triplex-db-experiments.git
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export DX_NATIVE_BOOTSTRAP_CACHE="$base/day-p3r/checkout"

# [DX-BM1] Why: one supervisor advances only after the previous unit's cleanup has completed.
# Rejected: independently waiting on is-active during a failed unit's teardown or restart gap.
wait_terminal() {
  local unit=$1 state
  while state=$(systemctl show "$unit" -p ActiveState --value); do
    [[ $state == inactive || $state == failed ]] && return 0
    sleep 8
  done
  return 1
}

status() {
  local tmp
  tmp=$(mktemp "$base/next-status.XXXXXX")
  printf 'item=%s state=%s since=%s next=%s\n' "$1" "$2" "$(date -u +%FT%TZ)" "$3" > "$tmp"
  mv "$tmp" "$base/STATUS"
}

prepare() {
  local root=$1 branch=$2 source=$3
  [[ -d $root ]] || mkdir "$root" || return
  [[ -z $(docker ps -q) ]] || return 75
  if [[ ! -d $root/build/repository ]]; then
    git -c credential.helper= clone --quiet --single-branch --no-checkout --branch "$branch" "$public" "$root/producer" &&
      git -C "$root/producer" checkout --quiet --detach "$source" &&
      bash "$root/producer/lab/experiments/EXP-DX1/t1/bare-metal.sh" --prepare "$source" "$root/build" ||
      return 1
  fi
  [[ $(git -C "$root/build/repository" rev-parse HEAD) == "$source" ]] &&
    [[ $(cat "$root/build/results/bootstrap.exit") == 0 ]]
}

child() {
  local name=$1 seconds=$2 log=$3 cleanup=$4
  shift 4
  if systemctl is-failed --quiet "bm1n20-$name.service"; then systemctl reset-failed "bm1n20-$name.service" || return; fi
  systemd-run --wait --unit="bm1n20-$name" --property="RuntimeMaxSec=$seconds" \
    --property=TimeoutStopSec=245 --property=KillMode=control-group \
    --property="StandardOutput=append:$log" --property="StandardError=append:$log" \
    --property="ExecStopPost=$cleanup" "$@"
  local rc=$?
  wait_terminal "bm1n20-$name.service" || return
  printf '%s %s %s\n' "$(date -u +%FT%TZ)" "$name" "$rc" >> "$base/friday-dispositions.txt"
  return "$rc"
}

exec 9<> "$base/friday-remaining.lock"
flock -n 9 || exit 75
wait_terminal bm1n20-jvm1-campaign.service || exit 75
if [[ $(systemctl show bm1n20-tail1.service -p LoadState --value) != not-found ]]; then
  wait_terminal bm1n20-tail1.service || exit 75
fi

int1="$controls/probes/int1_capacity.py"
child int1-capacity-retry 5600 "$base/day-n20-jvm1/int1-retry.log" \
  "/usr/bin/env BM1_INT1_RETRY=1 /usr/bin/python3 $int1 cleanup" \
  /usr/bin/env BM1_INT1_RETRY=1 /usr/bin/python3 "$int1" run

rd="$base/day-n20-rd1-aged-retry"
status rd1-aged preparing native-small
if prepare "$rd" exp/DX-RD1-readers 5f51de7d6ab09b884df61f5c260db7f6688726c1 >> "$base/friday-build.log" 2>&1; then
  helper="$controls/probes/rd-aged-run.sh"
  child rd1-aged-retry 5600 "$rd/worker.log" "/bin/bash $helper cleanup $rd" /bin/bash "$helper" run "$rd"
fi

ha="$base/day-n20-ha1-micro"
status ha1-micro preparing campaign
if prepare "$ha" exp/DX-HA1-failover-move 14174308fa1b1f6ade7f3e1fe3ce58ca4bc173ba >> "$base/friday-build.log" 2>&1; then
  helper="$controls/ha-micro-run.py"
  child ha1-micro 7600 "$ha/worker.log" "/usr/bin/python3 $helper cleanup" /usr/bin/python3 "$helper" run
fi

prep="$base/day-n20-prep1"
status prep1 preparing native-small
if prepare "$prep" exp/DX-PREP1-parallel-prepare 7ca8525a9ea0c3810c7af6ba0b5a0e15552dd534 >> "$base/friday-build.log" 2>&1; then
  helper="$controls/probes/prep1-run.sh"
  child prep1 27500 "$prep/worker.log" "/bin/bash $helper cleanup $prep" /bin/bash "$helper" run "$prep"
fi
status queue waiting-for-inputs review-activation-and-tail

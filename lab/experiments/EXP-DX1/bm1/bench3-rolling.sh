#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: run the published credit comparison from one pinned clean build
# after the previous slot closes. Rejected: overlapping a build or a restore with offers.
root=$1
selection=$2
mode=${3:-run}
[[ $root == /var/tmp/triplex-bm1/bench3 && $EUID == 0 && $(systemd-detect-virt) == none ]]
case $selection in
  main) arms=(barrier6 rolling6 rolling12) ;;
  rolling8|rolling16|barrier6|rolling6|rolling12) arms=("$selection") ;;
  *) exit 2 ;;
esac
pin=c8f903ce1142772751328b88d972cc527ca46dfc
build=$root/rolling-build
repo=$build/repository
out=$root/rolling-$selection
wal=/mnt/triplex-bench3-wal
status=/var/tmp/triplex-bm1/STATUS
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export PATH="$build/tools/bin:$PATH" DX_BARE_METAL_ROOT="$build/state"

record() {
  printf 'item=bench3-rolling-%s state=%s since=%s next=%s\n' "$selection" "$1" "$(date -u +%FT%TZ)" "$2" > "$status"
}
if [[ $mode == cleanup ]]; then
  if [[ -s $out/prefix ]]; then
    tag=$(cat "$out/prefix")
    [[ $tag =~ ^[a-f0-9]{8}$ && $(cat "$out/source") == "$pin" ]]
    cd "$repo"
    for arm in "${arms[@]}"; do
      owned=tx2-dxprep1-$tag-1-$arm-s
      if [[ -n $(docker ps -aq --filter "name=^/$owned-") ||
            -n $(docker volume ls -q --filter "name=^$owned-") ||
            -n $(docker network ls -q --filter "name=^$owned-") ]]; then
        timeout 60 bash lab/experiments/EXP-DX1/stack/down.sh "$owned" --volumes
      fi
      if [[ -d $wal/$owned ]]; then
        [[ ! -L $wal/$owned && $(findmnt -nro SOURCE --mountpoint "$wal") == /dev/nvme1n1 ]]
        rm -r --one-file-system -- "$wal/$owned"
      fi
      [[ -z $(docker ps -aq --filter "name=^/$owned-") &&
         -z $(docker volume ls -q --filter "name=^$owned-") &&
         -z $(docker network ls -q --filter "name=^$owned-") ]]
    done
  fi
  record terminal collect
  exit
fi
[[ $mode == run ]]
if [[ $selection == main ]]; then
  while [[ $(systemctl show triplex-bench3-tuned-retry -p ActiveState --value) =~ ^(active|activating|deactivating)$ ]]; do
    sleep 5
  done
fi
[[ -z $(docker ps -q) && -f $root/seed-verification.json && ! -e $out ]]
[[ $(findmnt -nro SOURCE --mountpoint "$wal") == /dev/nvme1n1 ]]
for policy in /sys/devices/system/cpu/cpufreq/policy*/scaling_governor; do [[ $(cat "$policy") == performance ]]; done
df -Pk "$root" | awk 'NR==2 {exit ($4 < 200000000)}'
if [[ ! -f $build/results/bootstrap.exit ]]; then
  [[ $selection == main ]]
  record preparing rolling
  env DX_JAVA=25 DX_NATIVE_BOOTSTRAP_CACHE="$root/control-build" \
    bash "$root/rolling-prepare.sh" --prepare "$pin" "$build"
fi
[[ $(cat "$build/results/bootstrap.exit") == 0 ]]
cd "$repo"
[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
if [[ $selection != main ]]; then export DX_PREP1_ROLLING_ARM=$selection; fi
record running collect
exec node lab/bin/heavy.mjs --label DX-PREP1-rolling -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh rolling "$out" "$pin" \
    "$root/seed-metadata/arm-d7-wfix-pool-seed" \
    77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
    1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
    --pg-data "$root/verified-seed/cluster" --wal-mount "$wal"

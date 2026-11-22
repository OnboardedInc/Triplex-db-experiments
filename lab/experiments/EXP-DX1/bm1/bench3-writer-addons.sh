#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: queue the two pinned comparisons after fair import, with their own build and output.
# Rejected: changing the queued import or rebuilding images during its timed windows.
root=$1
selection=$2
mode=${3:-run}
[[ $root == /var/tmp/triplex-bm1/bench3 && $EUID == 0 && $(systemd-detect-virt) == none ]]
case $selection in
  cache32)
    pin=97aced1b1128ca54da2a72003299f38d805f1abc
    command=cache32
    prior=triplex-bench3-fair-import.service
    arms=(rolling6-cache32 rolling6-tx5-cache32)
    ;;
  tx5)
    pin=73afad665ac2ccecea62161b8dfb6a3a48287057
    command=rolling
    prior=triplex-bench3-cache32.service
    arms=(rolling6-tx5)
    export DX_PREP1_ROLLING_ARM=rolling6-tx5
    ;;
  fresh)
    pin=891ab9139eb4fa6defe2c5484ada332b84090e6f
    command=fresh
    prior=triplex-bench3-rd1.service
    arms=(rolling6 fresh6 fresh-zgc6)
    export DX_PREP1_FRESH_CREDITS=6
    ;;
  cache32b)
    # [DX-BM1] Why: repeat the 32 GiB cache pair once, unchanged, so the key result has a second run.
    # Rejected: changing its pin or arms between the two runs.
    pin=97aced1b1128ca54da2a72003299f38d805f1abc
    command=cache32
    prior=triplex-bench3-realistic.service
    arms=(rolling6-cache32 rolling6-tx5-cache32)
    ;;
  cache32c)
    # [DX-BM1] Why: a third unchanged run of the 32 GiB cache pair, as the idle fallback after Publish at 100,000.
    # Rejected: changing its pin or arms between runs.
    pin=97aced1b1128ca54da2a72003299f38d805f1abc
    command=cache32
    prior=triplex-bench3-publish100k.service
    arms=(rolling6-cache32 rolling6-tx5-cache32)
    ;;
  rolling6s)
    # [DX-BM1] Why: a third rolling 6 run at 16 GiB as the idle fallback after the third cache32 run.
    # Rejected: changing its pin or arm between runs.
    pin=c8f903ce1142772751328b88d972cc527ca46dfc
    command=rolling
    prior=triplex-bench3-cache32c.service
    arms=(rolling6)
    export DX_PREP1_ROLLING_ARM=rolling6
    ;;
  rolling6r)
    # [DX-BM1] Why: a second run of the morning's rolling 6 arm at 235, 394 and 620 from its own fresh build.
    # Rejected: reusing rolling-build, whose image tags later builds have moved.
    pin=c8f903ce1142772751328b88d972cc527ca46dfc
    command=rolling
    prior=triplex-bench3-cache32b.service
    arms=(rolling6)
    export DX_PREP1_ROLLING_ARM=rolling6
    ;;
  *) exit 2 ;;
esac
job=$root/queue/$selection
build=$job/build
repo=$build/repository
out=$job/result
wal=/mnt/triplex-bench3-wal
status=/var/tmp/triplex-bm1/STATUS
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export PATH="$build/tools/bin:$PATH" DX_BARE_METAL_ROOT="$build/state"

record() {
  local pending="$status.$selection.tmp"
  printf 'item=bench3-%s state=%s since=%s next=%s\n' "$selection" "$1" "$(date -u +%FT%TZ)" "$2" > "$pending"
  mv "$pending" "$status"
}

inventory() {
  docker ps -aq --filter "name=^/$1-" &&
    docker volume ls -q --filter "name=^$1-" && docker network ls -q --filter "name=^$1-"
}

if [[ $mode == cleanup ]]; then
  [[ -e $job/started ]] || exit 0
  if [[ -s $out/prefix ]]; then
    tag=$(cat "$out/prefix")
    [[ $tag =~ ^[a-f0-9]{8}$ && $(cat "$out/source") == "$pin" ]]
    cd "$repo"
    for arm in "${arms[@]}"; do
      owned=tx2-dxprep1-$tag-1-$arm-s
      remaining=$(inventory "$owned")
      if [[ -n $remaining ]]; then
        timeout 60 bash lab/experiments/EXP-DX1/stack/down.sh "$owned" --volumes
      fi
      remaining=$(inventory "$owned")
      [[ -z $remaining ]]
      if [[ -d $wal/$owned ]]; then
        [[ ! -L $wal/$owned && $(findmnt -nro SOURCE --mountpoint "$wal") == /dev/nvme1n1 ]]
        rm -r --one-file-system -- "$wal/$owned"
      fi
    done
  fi
  record terminal collect
  exit
fi

[[ $mode == run ]]
while [[ $(systemctl show "$prior" -p ActiveState --value) =~ ^(active|activating|deactivating)$ ]]; do
  sleep 5
done
[[ -z $(docker ps -q) && -f $root/seed-verification.json && ! -e $out && ! -e $build ]]
[[ $(findmnt -nro SOURCE --mountpoint "$wal") == /dev/nvme1n1 ]]
for policy in /sys/devices/system/cpu/cpufreq/policy*/scaling_governor; do [[ $(cat "$policy") == performance ]]; done
df -Pk "$root" | awk 'NR==2 {exit ($4 < 200000000)}'
if [[ $selection == cache32* ]]; then
  awk '$1 == "MemTotal:" {exit ($2 < 89*1024*1024)}' /proc/meminfo
fi
date -u +%FT%TZ > "$job/started"
record preparing measure
timeout -k 15s 20m env DX_JAVA=25 DX_NATIVE_BOOTSTRAP_CACHE="$root/rolling-build" \
  bash "$job/prepare.sh" --prepare "$pin" "$build"
[[ $(cat "$build/results/bootstrap.exit") == 0 ]]
cd "$repo"
[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
record running collect
writer_jvm=()
if [[ $selection == fresh ]]; then writer_jvm=(--write-jvm j25-zgc); fi
exec node lab/bin/heavy.mjs --label "DX-PREP1-$selection" -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh "$command" "$out" "$pin" \
    "$root/seed-metadata/arm-d7-wfix-pool-seed" \
    77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
    1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
    --pg-data "$root/verified-seed/cluster" --wal-mount "$wal" ${writer_jvm[@]+"${writer_jvm[@]}"}

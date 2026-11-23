#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: run PREP1's 32 GiB cache arm on the aged one-billion cut on bench 4 with Saturday's cache32 environment
# (fresh build from the pinned bootstrap, Java 25 transactor image, WAL on the second NVMe).
# Rejected: reusing another job's build (later builds retag the shared image names) or warming anything before the arm.
root=$1
selection=$2
mode=${3:-run}
[[ $root == /var/tmp/triplex-bm1/bench4 && $EUID == 0 && $(systemd-detect-virt) == none ]]
case $selection in
  cache32-aged|cache32-aged-b|cache32-aged-c) pin=cdc72d4d5bd6cc1adecaaf9267a351173763d134 ;;
  *) exit 2 ;;
esac
job=$root/queue/$selection
build=$job/build
repo=$build/repository
out=$job/result
wal=/mnt/triplex-bench4-wal
status=/var/tmp/triplex-bm1/STATUS
aged=/mnt/triplex-scale1-held-age/calibrated-post-ladder/cluster
handoff=/var/tmp/triplex-scale1/age-v01-bulk-c/rung/1000000000/aged-scorecard.json
image=/var/tmp/triplex-scale1/decision/attempts/arm-d7-wfix-pool-seed
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export PATH="$build/tools/bin:$PATH" DX_BARE_METAL_ROOT="$build/state"

record() {
  local pending="$status.$selection.tmp"
  printf 'item=bench4-%s state=%s since=%s next=%s\n' "$selection" "$1" "$(date -u +%FT%TZ)" "$2" > "$pending"
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
    owned=tx2-dxprep1-$tag-1-rolling6-cache32-s
    if [[ -n $(inventory "$owned") ]]; then
      timeout 60 bash lab/experiments/EXP-DX1/stack/down.sh "$owned" --volumes
    fi
    [[ -z $(inventory "$owned") ]]
    if [[ -d $wal/$owned ]]; then
      [[ ! -L $wal/$owned && $(findmnt -nro SOURCE --mountpoint "$wal") == /dev/nvme1n1 ]]
      rm -r --one-file-system -- "$wal/$owned"
    fi
  fi
  record terminal collect
  exit
fi

[[ $mode == run ]]
# The aged directory, handoff and seed metadata must have passed the receiver's byte and digest checks first.
[[ -f $root/aged-verification.json && -z $(docker ps -q) && ! -e $out && ! -e $build ]]
handoff_sha=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["handoffSha256"])' "$root/aged-verification.json")
[[ $handoff_sha =~ ^[a-f0-9]{64}$ && $(sha256sum "$handoff" | cut -d ' ' -f 1) == "$handoff_sha" ]]
[[ ! -e $aged/postmaster.pid ]]
[[ $(findmnt -nro SOURCE --mountpoint "$wal") == /dev/nvme1n1 ]]
for policy in /sys/devices/system/cpu/cpufreq/policy*/scaling_governor; do [[ $(cat "$policy") == performance ]]; done
awk '$1 == "MemTotal:" {exit ($2 < 89*1024*1024)}' /proc/meminfo
mkdir -p "$job"
date -u +%FT%TZ > "$job/started"
record preparing measure
timeout -k 15s 20m env DX_JAVA=25 DX_NATIVE_BOOTSTRAP_CACHE="$root/base-build" \
  bash "$root/prepare.sh" --prepare "$pin" "$build"
[[ $(cat "$build/results/bootstrap.exit") == 0 ]]
cd "$repo"
[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
record running collect
exec node lab/bin/heavy.mjs --label "DX-PREP1-$selection" -- \
  bash lab/experiments/EXP-DX1/prep1/server.sh cache32-aged "$out" "$pin" "$image" \
    77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
    1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
    --pg-data "$aged" --wal-mount "$wal" --aged-bundle "$handoff" "$handoff_sha"

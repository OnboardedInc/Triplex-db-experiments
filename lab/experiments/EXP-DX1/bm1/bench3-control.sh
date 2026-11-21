#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: repeat exactly the tuned comparator while the rolling-credit
# campaign is still unpublished. Rejected: rerunning the two other scale arms.
root=${1:?absolute bench3 control root}
[[ $root == /var/tmp/triplex-bm1/bench3 && $(systemd-detect-virt) == none && $EUID == 0 ]]
out=$root/tuned-control
build=$root/control-build
repo=$build/repository
wal=/mnt/triplex-bench3-wal
pin=6abc19f66b0bbe59f3dbc57767ca6dc7456c8d4e
status=/var/tmp/triplex-bm1/STATUS
export PATH="$build/tools/bin:$PATH" DX_BARE_METAL=1 DX_BARE_METAL_ROOT="$build/state"
export DOCKER_HOST=unix:///var/run/docker.sock
cd "$repo"

if [[ ${2:-run} == cleanup ]]; then
  if [[ -s $out/prefix ]]; then
    tag=$(cat "$out/prefix")
    [[ $tag =~ ^[a-f0-9]{8}$ && $(cat "$out/source") == "$pin" ]]
    owned=tx2-dxprep1-$tag-1-scale-wal-zgc-s
    active=$(docker ps -aq --filter "name=^/$owned-")
    volume=$(docker volume ls -q --filter "name=^$owned-")
    network=$(docker network ls -q --filter "name=^$owned-")
    if [[ -n $active || -n $volume || -n $network ]]; then
      timeout 60 bash lab/experiments/EXP-DX1/stack/down.sh "$owned" --volumes
    fi
    if [[ -d $wal/$owned ]]; then
      [[ $(findmnt -nro SOURCE --mountpoint "$wal") == /dev/nvme1n1 && ! -L $wal/$owned ]]
      rm -r --one-file-system -- "$wal/$owned"
    fi
    [[ -z $(docker ps -aq --filter "name=^/$owned-") &&
       -z $(docker volume ls -q --filter "name=^$owned-") &&
       -z $(docker network ls -q --filter "name=^$owned-") ]]
  fi
  printf 'item=bench3-tuned-control state=terminal since=%s next=collect\n' "$(date -u +%FT%TZ)" > "$status"
  exit
fi

[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
[[ $(findmnt -nro SOURCE --mountpoint "$wal") == /dev/nvme1n1 ]]
[[ -f $root/seed-verification.json && ! -e $out && -z $(docker ps -q) ]]
df -Pk "$root" | awk 'NR==2 {exit ($4 < 200000000)}'
raw=lab/experiments/EXP-DX1/prep1/server.sh
select='for cell in 1-scale-base-S 1-scale-cache-S 1-scale-wal-zgc-S; do'
[[ $(grep -Fc "$select" "$raw") == 1 ]]
adapter=$root/scale-tuned-only.sh
sed 's/for cell in 1-scale-base-S 1-scale-cache-S 1-scale-wal-zgc-S; do/for cell in 1-scale-wal-zgc-S; do/' "$raw" > "$adapter"
sha256sum "$raw" "$adapter" > "$root/control-producer.sha256"
printf 'item=bench3-tuned-control state=running since=%s next=collect\n' "$(date -u +%FT%TZ)" > "$status"
exec node lab/bin/heavy.mjs --label DX-BM1-bench3-control -- timeout --kill-after=30s 1400s   bash "$adapter" scale-timed "$out" "$pin" "$root/seed-metadata/arm-d7-wfix-pool-seed"   77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b   1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154   --pg-data "$root/verified-seed/cluster" --wal-mount "$wal"

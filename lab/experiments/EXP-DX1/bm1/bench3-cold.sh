#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: run JVM1's three cold-start arms at 235 offered on INT1's credit-mode build, with rolling 6.
# Rejected: the earlier pins that hard-code barrier 6, or reusing a copy a previous item opened.
root=$1
mode=${2:-run}
pin=8ab8320936b646eb5f18fa893966137ad768fc40
[[ $root == /var/tmp/triplex-bm1/bench3 && $EUID == 0 && $(systemd-detect-virt) == none ]]
job=$root/queue/cold
build=$job/build
out=$job/result
held=$root/verified-seed/cluster
wal=/mnt/triplex-bench3-wal
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export DX_BARE_METAL_ROOT="$job" PATH="$build/tools/bin:$PATH"
status=/var/tmp/triplex-bm1/STATUS

record() {
  printf 'item=bench3-cold state=%s since=%s next=%s\n' "$1" "$(date -u +%FT%TZ)" "$2" > "$status"
}

if [[ $mode == cleanup ]]; then
  [[ -e $job/started ]] || exit 0
  bash "$root/bench3-slots-down.sh" "$build/repository" "$out"
  record terminal collect
  exit
fi

[[ $mode == run && ! -e $out && -z $(docker ps -q) ]]
date -u +%FT%TZ > "$job/started"
record preparing measure
# [DX-BM1] Why: every v01 build retags the shared tx2-datomic image names, so a build made before another item's
# build no longer matches its receipt's image IDs (removal2 refused at 19:05 UTC). Rebuild right before each run.
# Rejected: reusing a receipt whose tags a later build moved.
rm -rf --one-file-system "$build" "$job/build-input"
timeout -k 15s 20m bash "$root/bench3-v01-build.sh" "$root" cold "$pin"
cd "$build/repository"
[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
export DX_V01_BUILD_RECEIPT="$build/BUILD-v0.1.json"
record running collect
bash lab/experiments/EXP-DX1/jvm1/cold-server.sh "$pin" "$out" "$root/seed-metadata/arm-d7-wfix-pool-seed" \
  77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  "$held" 6c8986df870b10b5cec64a6103e3316935a82d8c85cad080fbd4b86d67b05c0c "$wal" --credit-mode rolling6 \
  2>&1 | tee "$job/cold.log"
record terminal collect

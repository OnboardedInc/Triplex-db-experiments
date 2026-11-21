#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: run RD1's control and tuned reader ladders from private copies of the held directory, one copy at a time.
# Rejected: restoring a logical dump this server does not hold, or keeping two scratch copies beside the held one.
root=$1
mode=${2:-run}
pin=ca93f51658bf6fda54398748f0df64ca9d86edfe
[[ $root == /var/tmp/triplex-bm1/bench3 && $EUID == 0 && $(systemd-detect-virt) == none ]]
job=$root/queue/rd1
build=$job/build
out=$job/result
copy=$job/copy
held=$root/verified-seed/cluster
wal=/mnt/triplex-bench3-wal/rd1
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export DX_BARE_METAL_ROOT="$job" PATH="$build/tools/bin:$PATH"
status=/var/tmp/triplex-bm1/STATUS

record() {
  printf 'item=bench3-rd1 state=%s since=%s next=%s\n' "$1" "$(date -u +%FT%TZ)" "$2" > "$status"
}

if [[ $mode == cleanup ]]; then
  [[ -e $job/started ]] || exit 0
  bash "$root/bench3-slots-down.sh" "$build/repository" "$out"
  record terminal collect
  exit
fi

[[ $mode == run && ! -e $out && ! -e $copy && -z $(docker ps -q) ]]
date -u +%FT%TZ > "$job/started"
record preparing measure
# [DX-BM1] Why: every v01 build retags the shared tx2-datomic image names, so a build made before another item's
# build no longer matches its receipt's image IDs (removal2 refused at 19:05 UTC). Rebuild right before each run.
# Rejected: reusing a receipt whose tags a later build moved.
rm -rf --one-file-system "$build" "$job/build-input"
timeout -k 15s 20m bash "$root/bench3-v01-build.sh" "$root" rd1 "$pin"
cd "$build/repository"
[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
export DX_V01_BUILD_RECEIPT="$build/BUILD-v0.1.json"
mkdir -p "$wal"
# The tuned read study pins its own driver to 9,10 before its stack starts (v01/adopted-server.ts line 32).
bash "$root/bench3-affinity.sh" 'v01/adopted-server.ts' '^tx2-dxscale1-v01-[0-9a-f]{8}-[0-9a-f]{3}-tx$' 9,10 \
  >> "$job/affinity.log" 2>&1 &
watcher=$!
trap 'kill "$watcher" 2>/dev/null || true' EXIT

ladder() {
  record "copying-$1" measure
  [[ ! -e $copy ]]
  timeout 15m cp -a --reflink=never "$held" "$copy"
  record "running-$1" collect
  timeout --kill-after=30s 32m node lab/bin/scorecard.mjs --commit "$pin" \
    --age fresh --seed "$root/seed-metadata/arm-d7-wfix-pool-seed" \
    --image-sha256 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
    --transfer-sha256 1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
    --out "$out" --read-study --tx-jvm j25-zgc --credit-mode rolling6 --wal-directory "$wal" \
    --ladder "$1" --pgdata-source "$held" --pgdata "$copy" | tee -a "$job/ladders.log"
  rm -rf --one-file-system "$copy"
  slot=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["slot"])' "$out/campaign/$1/pgdata.json")
  [[ $slot =~ ^tx2-dxscale1-v01-[a-z0-9-]+$ ]]
  rm -rf --one-file-system "${wal:?}/$slot"
}
ladder control
ladder tuned
record terminal collect

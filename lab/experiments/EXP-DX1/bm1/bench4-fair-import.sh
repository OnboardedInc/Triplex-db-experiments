#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: run LOAD2's live-first fair import (NEIGHBOURS-SERVER.md) on bench 4 from a fresh disposable copy of the
# verified fresh template, the way bench3-fair-import.sh ran Saturday's fair import.
# Rejected: opening the template itself (it is the failover source) or reusing another item's build (tags move).
# Usage: bench4-fair-import.sh ROOT SELECTION PIN [run|dry|cleanup]
root=$1
selection=$2
pin=$3
mode=${4:-run}
[[ $root == /var/tmp/triplex-bm1/bench4 && $EUID == 0 && $(systemd-detect-virt) == none ]]
[[ $selection =~ ^fair-yield[a-z0-9-]*$ && $pin =~ ^[a-f0-9]{40}$ ]]
job=$root/queue/$selection
build=$job/build
out=$job/result
held=/mnt/triplex-scale1-pgdata/fresh-a
image=/var/tmp/triplex-scale1/decision/attempts/arm-d7-wfix-pool-seed
mount=/mnt/triplex-bench4-wal
wal=$mount/queue-$selection
prepared=$job/prepared
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1 GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0
export DX_BARE_METAL_ROOT="$job" PATH="$build/tools/bin:$PATH"
status=/var/tmp/triplex-bm1/STATUS
state() { printf 'item=bench4-%s state=%s since=%s next=%s\n' "$selection" "$1" "$(date -u +%FT%TZ)" "$2" > "$status"; }
launch() {
  cmd=(bash lab/experiments/EXP-DX1/load1/fair-server.sh "$pin" "$image"
    77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b
    1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154
    "$held/cluster" "$1" --pg-data "$prepared/cluster" --wal-dir "$wal"
    --credit-mode rolling6 --import-credits 1 --frame-facts 32,40 --import-policy yield)
}

if [[ $mode == cleanup ]]; then
  if [[ -s $out/attempt.json ]]; then
    read -r source slot < <(python3 -c 'import json,sys; a=json.load(open(sys.argv[1])); print(a["source"], a["slot"])' "$out/attempt.json")
    [[ $source == "$pin" && $slot =~ ^tx2-dxscale1-[a-z0-9-]+$ ]]
    cd "$build/repository"
    if [[ -n $(bash lab/experiments/EXP-DX1/stack/up.sh "$slot" --inventory) ]]; then
      timeout 60 bash lab/experiments/EXP-DX1/stack/down.sh "$slot" --volumes
    fi
    [[ -z $(bash lab/experiments/EXP-DX1/stack/up.sh "$slot" --inventory) ]]
  fi
  state terminal collect
  exit
fi

[[ ($mode == run || $mode == dry) && -z $(docker ps -q) && -s $root/fresh-verification.json ]]
state preparing measure
if [[ ! -f $build/BUILD-v0.1.json ]]; then
  [[ ! -e $build ]]
  mkdir -p "$job"
  inputs=$job/build-input
  rm -rf --one-file-system "$inputs"
  mkdir "$inputs"
  git -C "$inputs" init -q
  git -C "$inputs" fetch -q --no-tags --depth 1 https://github.com/OnboardedInc/Triplex-db-experiments.git "$pin"
  git -C "$inputs" checkout -q --detach FETCH_HEAD
  [[ $(git -C "$inputs" rev-parse HEAD) == "$pin" ]]
  (cd "$inputs" && "$root/base-build/tools/bin/node" --no-warnings --experimental-transform-types \
    lab/experiments/EXP-DX1/v01/build.ts "$pin" "$build")
fi
cd "$build/repository"
[[ $(git rev-parse HEAD) == "$pin" ]]
export DX_V01_BUILD_RECEIPT="$build/BUILD-v0.1.json"
touch /var/tmp/triplex-bm1/dx-bm1-day.lock
if [[ ! -e $prepared/ready.txt ]]; then
  # Fresh disposable copy, checked against the held inventory, WAL relocated to the second NVMe (FAIR-SERVER.md).
  [[ ! -e $prepared && ! -e $wal && $(findmnt -nro SOURCE --mountpoint "$mount") == /dev/nvme1n1 ]]
  df -Pk "$root" | awk 'NR==2 {exit ($4 < 160000000)}'
  mkdir -m 0700 "$prepared"
  cp -a --reflink=never -- "$held/cluster" "$prepared/cluster"
  expect=$(python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))["inventory"]))' "$root/fresh-verification.json")
  python3 "$root/bench4-inventory.py" "$prepared/cluster" --expect "$expect" > "$prepared/inventory.json"
  cp -a --reflink=never -- "$prepared/cluster/pg_wal" "$wal"
  diff -qr -- "$prepared/cluster/pg_wal" "$wal"
  mv -- "$prepared/cluster/pg_wal" "$prepared/original-wal"
  ln -s /wal "$prepared/cluster/pg_wal"
  sync -f "$wal"; sync -f "$prepared"
  date -u +%FT%TZ > "$prepared/ready.txt"
fi
state dry-run measure
rm -rf --one-file-system "$job/dry-run" "$job/dry-run-out"
# The launcher's own checks and the stack guard run for real; the first container create is refused.
launch "$job/dry-run-out"
bash "$root/tools/launch-dry-run.sh" "$job/dry-run" -- "${cmd[@]}" || true
[[ $(head -c 8 "$job/dry-run/verdict.txt") == ADMITTED ]]
[[ -z $(docker ps -aq --filter name=tx2-dxscale1-) ]]
[[ $mode == run ]] || { state dry-admitted run; exit 0; }
state running collect
launch "$out"
exec node lab/bin/heavy.mjs --label "DX-LOAD2-$selection" -- "${cmd[@]}"

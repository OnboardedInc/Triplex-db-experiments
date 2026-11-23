#!/usr/bin/env bash
set -euo pipefail
# [DX-BM1] Why: run the held Publish at 100,000 (actv-lazy/PART9.md) on INT1 4e64e0d97 (seed-frame repair 22db6e3ec)
# from a fresh disposable copy of the verified fresh template, after a first-offer pass of the same launcher.
# Rejected: reusing another item's copy or build, or skipping the first-offer pass (the repair was proven only on a toy).
# Usage: bench4-publish100k.sh build|first-offer|run|cleanup [publish100k|publish-large]
mode=$1
selection=${2:-publish100k}
root=/var/tmp/triplex-bm1/bench4
pin=4e64e0d97f7f540d9f105b945de0a562c1b9828d
if [[ $selection == publish-large ]]; then
  # [DX-BM1] Why: ACT3's large release (actv-lazy/LARGE-RELEASE.md), the same held runner with one release setting.
  # Its base (INT1 61a794c1d) differs from the small release's, so it needs its own build.
  pin=a54dfca310796dfc53ca8efe4abbfb5592fdee5f
  export DX_ACT3_RELEASE=forms=20,policies=20,permille=1000
else
  [[ $selection == publish100k ]]
fi
[[ $EUID == 0 && $(systemd-detect-virt) == none && $mode =~ ^(build|first-offer|run|cleanup)$ ]]
job=$root/queue/$selection
build=$job/build
out=$job/result
held=/mnt/triplex-scale1-pgdata/fresh-a/cluster
image=/var/tmp/triplex-scale1/decision/attempts/arm-d7-wfix-pool-seed
mount=/mnt/triplex-bench4-wal
wal=$mount/queue-$selection
prepared=$job/prepared
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1 GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0
export DX_BARE_METAL_ROOT="$job" PATH="$build/tools/bin:$PATH"
status=/var/tmp/triplex-bm1/STATUS
state() { printf 'item=bench4-%s state=%s since=%s next=%s\n' "$selection" "$1" "$(date -u +%FT%TZ)" "$2" > "$status"; }
pins=(77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b 1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154)

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

if [[ $mode == build ]]; then
  [[ ! -e $build ]]
  mkdir -p "$job"; inputs=$job/build-input; rm -rf --one-file-system "$inputs"; mkdir "$inputs"
  git -C "$inputs" init -q
  git -C "$inputs" fetch -q --no-tags --depth 1 https://github.com/OnboardedInc/Triplex-db-experiments.git "$pin"
  git -C "$inputs" checkout -q --detach FETCH_HEAD
  [[ $(git -C "$inputs" rev-parse HEAD) == "$pin" ]]
  cd "$inputs"
  exec "$root/base-build/tools/bin/node" --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts "$pin" "$build"
fi

[[ -z $(docker ps -q) && -s $root/fresh-verification.json ]]
cd "$build/repository"
[[ $(git rev-parse HEAD) == "$pin" ]]
export DX_V01_BUILD_RECEIPT="$build/BUILD-v0.1.json"
python3 "$root/bench4-retag.py" "$build/BUILD-v0.1.json"
touch /var/tmp/triplex-bm1/dx-bm1-day.lock

if [[ $mode == first-offer ]]; then
  queue=$job/first-offer-queue.txt
  fo=$job/fo-copy
  printf '%s\n' "publish cp -a --reflink=never \"\$HELD\" $fo && rm -rf $fo/pg_wal && ln -s /wal $fo/pg_wal && mkdir $mount/$selection-dry && cp -a \"\$HELD/pg_wal/.\" $mount/$selection-dry/ && bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh $pin $image ${pins[0]} ${pins[1]} \"\$HELD\" $fo $mount/$selection-dry \"\$LOGS/publish-out\"; rc=\$?; rm -rf --one-file-system $fo $mount/$selection-dry; exit \$rc" > "$queue"
  rm -rf --one-file-system "$job/first-offer"
  exec bash lab/experiments/EXP-DX1/ha1/first-offer-dry-run.sh "$queue" "$held" "$job/first-offer"
fi

[[ $mode == run && ! -e $out ]]
state preparing measure
if [[ ! -e $prepared/ready.txt ]]; then
  [[ ! -e $prepared && ! -e $wal && $(findmnt -nro SOURCE --mountpoint "$mount") == /dev/nvme1n1 ]]
  mkdir -m 0700 "$prepared"
  cp -a --reflink=never -- "$held" "$prepared/cluster"
  expect=$(python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))["inventory"]))' "$root/fresh-verification.json")
  python3 "$root/bench4-inventory.py" "$prepared/cluster" --expect "$expect" > "$prepared/inventory.json"
  cp -a --reflink=never -- "$prepared/cluster/pg_wal" "$wal"
  diff -qr -- "$prepared/cluster/pg_wal" "$wal"
  mv -- "$prepared/cluster/pg_wal" "$prepared/original-wal"
  ln -s /wal "$prepared/cluster/pg_wal"
  sync -f "$wal"; sync -f "$prepared"
  date -u +%FT%TZ > "$prepared/ready.txt"
fi
state running collect
exec node lab/bin/heavy.mjs --label "DX-BM1-$selection" -- \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh "$pin" "$image" "${pins[@]}" "$held" "$prepared/cluster" "$wal" "$out"

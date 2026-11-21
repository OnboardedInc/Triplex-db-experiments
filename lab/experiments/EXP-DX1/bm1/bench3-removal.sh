#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: keep removal on a separate writable copy of the verified fresh seed.
# Rejected: letting destructive work open the held population or an import's used copy.
root=$1
mode=${2:-run}
pin=3669bee4146c60d8b833c021ce0e1be3e341f611
[[ $root == /var/tmp/triplex-bm1/bench3 && $EUID == 0 && $(systemd-detect-virt) == none ]]
job=$root/queue/removal
build=$job/build
out=$job/result
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export DX_BARE_METAL_ROOT="$job" PATH="$build/tools/bin:$PATH"
status=/var/tmp/triplex-bm1/STATUS

record() {
  printf 'item=bench3-removal state=%s since=%s next=%s\n' "$1" "$(date -u +%FT%TZ)" "$2" > "$status"
}

if [[ $mode == cleanup ]]; then
  [[ -e $job/started ]] || exit 0
  if [[ -s $out/attempt.json ]]; then
    read -r source slot < <(python3 - "$out/attempt.json" <<'PY'
import json
from pathlib import Path
import sys

attempt = json.loads(Path(sys.argv[1]).read_bytes())
assert attempt["tag"] == "result"
print(attempt["source"], attempt["slot"])
PY
    )
    [[ $source == "$pin" && $slot =~ ^tx2-dxscale1-removal-[0-9a-f]{8}-[0-9a-f]{3}$ ]]
    cd "$build/repository"
    remaining=$(bash lab/experiments/EXP-DX1/stack/up.sh "$slot" --inventory)
    if [[ -n $remaining ]]; then
      timeout 60 bash lab/experiments/EXP-DX1/stack/down.sh "$slot" --volumes
    fi
    remaining=$(bash lab/experiments/EXP-DX1/stack/up.sh "$slot" --inventory)
    [[ -z $remaining ]]
  fi
  record terminal collect
  exit
fi

[[ $mode == run && ! -e $out && -z $(docker ps -q) ]]
date -u +%FT%TZ > "$job/started"
record preparing measure
timeout -k 15s 20m bash "$root/bench3-v01-build.sh" "$root" removal "$pin"
cd "$build/repository"
[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
export DX_V01_BUILD_RECEIPT="$build/BUILD-v0.1.json" TRIPLEX_DATOMIC_FAST_PATHS=save-wire
touch /var/tmp/triplex-bm1/dx-bm1-day.lock
node lab/bin/heavy.mjs --label DX-BM1-removal-copy -- bash "$root/bench3-prepare-copy.sh" "$root" removal internal
record running collect
exec node lab/bin/heavy.mjs --label DX-ERASE2 -- \
  flock --no-fork -n /var/tmp/triplex-bm1/dx-bm1-day.lock timeout --kill-after=90s 86m \
  taskset -c 9,10,11 node --experimental-transform-types lab/experiments/EXP-DX1/erase1/measure-server.ts \
  --profile server --credit-mode rolling6 --commit "$pin" \
  --seed "$root/seed-metadata/arm-d7-wfix-pool-seed" \
  --image-sha256 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  --transfer-sha256 1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pg-data "$job/prepared/cluster" --out "$out"

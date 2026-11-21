#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: run the pinned fair-import producer with a fresh disposable copy.
# Rejected: reusing the rolling arm's database or changing the matched import frame.
root=$1
mode=${2:-run}
pin=8ab8320936b646eb5f18fa893966137ad768fc40
[[ $root == /var/tmp/triplex-bm1/bench3 && $EUID == 0 && $(systemd-detect-virt) == none ]]
job=$root/queue/fair-import
build=$job/build
out=$job/result
wal=/mnt/triplex-bench3-wal/queue-fair-import
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export DX_BARE_METAL_ROOT="$job" PATH="$build/tools/bin:$PATH"
status=/var/tmp/triplex-bm1/STATUS

state() {
  printf 'item=bench3-fair-import state=%s since=%s next=%s\n' "$1" "$(date -u +%FT%TZ)" "$2" > "$status"
}

if [[ $mode == cleanup ]]; then
  if [[ -s $out/attempt.json ]]; then
    read -r source slot < <(python3 - "$out/attempt.json" <<'PY'
from pathlib import Path
import sys, json
a = json.loads(Path(sys.argv[1]).read_text())
print(a["source"], a["slot"])
PY
    )
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

[[ $mode == run && -z $(docker ps -q) ]]
state preparing measure
# [DX-BM1] Why: INT1 8ab832093 carries the prepared-copy writer clause that refused 52ad22640 (ha1/LAUNCH-GUARD.md).
# Rebuild right before the run, because later builds retag the shared image names.
# Rejected: reusing the refused attempt's build or copy.
rm -rf --one-file-system "$build" "$job/build-input"
bash "$root/bench3-v01-build.sh" "$root" fair-import "$pin"
cd "$build/repository"
[[ $(git rev-parse HEAD) == "$pin" ]]
export DX_V01_BUILD_RECEIPT="$build/BUILD-v0.1.json"
touch /var/tmp/triplex-bm1/dx-bm1-day.lock
node lab/bin/heavy.mjs --label DX-BM1-import-copy -- bash "$root/bench3-prepare-copy.sh" "$root" fair-import separate
# Dry run first (DX-HA1 ha1/launch-dry-run.sh from INT1 54d644fd6): the launcher's own checks and the stack guard run
# for real, and the first container create is refused. Only an ADMITTED verdict continues to the measured run.
state dry-run measure
bash "$root/tools/dry-run/launch-dry-run.sh" "$job/dry-run" -- \
  bash lab/experiments/EXP-DX1/load1/fair-server.sh "$pin" \
    "$root/seed-metadata/arm-d7-wfix-pool-seed" \
    77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
    1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
    "$root/verified-seed/cluster" "$job/dry-run-out" --pg-data "$job/prepared/cluster" \
    --wal-dir "$wal" --credit-mode rolling6 --frame-facts 32 --import-credits 1
[[ $(head -c 8 "$job/dry-run/verdict.txt") == ADMITTED ]]
[[ -z $(docker ps -aq --filter name=tx2-dxscale1-) ]]
state running collect
exec node lab/bin/heavy.mjs --label DX-BM1-fair-import -- \
  bash lab/experiments/EXP-DX1/load1/fair-server.sh "$pin" \
    "$root/seed-metadata/arm-d7-wfix-pool-seed" \
    77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
    1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
    "$root/verified-seed/cluster" "$out" --pg-data "$job/prepared/cluster" \
    --wal-dir "$wal" --credit-mode rolling6 --frame-facts 32 --import-credits 1

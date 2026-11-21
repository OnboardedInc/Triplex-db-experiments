#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: publish and independently verify the extended stopped copy before measuring it.
# Rejected: opening the pristine deep input for writes or timing an unverified extension.
root=$1
mode=${2:-run}
pin=8597e3ef7a73fc5ce81a448614c11c4e9e8db293
[[ $root == /var/tmp/triplex-bm1/bench3 && $EUID == 0 && $(systemd-detect-virt) == none ]]
job=$root/queue/realistic
build=$job/build
out=$job/result
data=$job/stopped/pgdata
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export DX_BARE_METAL_ROOT="$job" PATH="$build/tools/bin:$PATH"
status=/var/tmp/triplex-bm1/STATUS

record() {
  printf 'item=bench3-realistic state=%s since=%s next=%s\n' "$1" "$(date -u +%FT%TZ)" "$2" > "$status"
}

if [[ $mode == cleanup ]]; then
  [[ -e $job/started ]] || exit 0
  if [[ -s $job/stopped/real1-copy.json ]]; then
    read -r source slot nonce < <(python3 - "$job/stopped/real1-copy.json" <<'PY'
import json
from pathlib import Path
import sys

copy = json.loads(Path(sys.argv[1]).read_bytes())
print(copy["revision"], copy["slot"], copy["nonce"])
PY
    )
    [[ $source == "$pin" && $nonce =~ ^[0-9a-f-]{36}$ && $slot == "tx2-dxreal1-$nonce" ]]
    cd "$build/repository"
    remaining=$(bash lab/experiments/EXP-DX1/stack/up.sh "$slot" --inventory)
    if [[ -n $remaining ]]; then
      timeout 80 bash lab/experiments/EXP-DX1/stack/down.sh "$slot" --volumes
    fi
    remaining=$(bash lab/experiments/EXP-DX1/stack/up.sh "$slot" --inventory)
    [[ -z $remaining ]]
  fi
  record terminal collect
  exit
fi

[[ $mode == run && ! -e $out && ! -e $job/stopped && -z $(docker ps -q) ]]
date -u +%FT%TZ > "$job/started"
record preparing extend
# [DX-BM1] Why: every v01 build retags the shared tx2-datomic image names, so a build made before another item's
# build no longer matches its receipt's image IDs (removal2 refused at 19:05 UTC). Rebuild right before each run.
# Rejected: reusing a receipt whose tags a later build moved.
rm -rf --one-file-system "$build" "$job/build-input"
timeout -k 15s 20m bash "$root/bench3-v01-build.sh" "$root" realistic "$pin"
cd "$build/repository"
[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
export DX_V01_BUILD_RECEIPT="$build/BUILD-v0.1.json"
runner=lab/experiments/EXP-DX1/real1/server.ts
record building verify
node lab/bin/heavy.mjs --label DX-REAL1-extend -- \
  timeout --kill-after=90s 180m node --no-warnings --experimental-transform-types "$runner" extend \
  --commit "$pin" --profile first --seed "$root/seed-metadata/arm-d7-wfix-pool-seed" \
  --image-sha256 77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b \
  --transfer-sha256 1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154 \
  --pgdata-source "$root/verified-seed/cluster" \
  --pgdata-sha256 fc501b6a14066d711222dbe202febbc9d911d3b4121c862f550fac0d92a7b24a \
  --pgdata "$data" --out "$out" | tee "$job/extend.log"
[[ -s $out/image.json && -s $out/transfer.json && -z $(docker ps -q) ]]
read -r image transfer < <(tail -n 1 "$job/extend.log" | python3 -c '
import json, re, sys
seal = json.load(sys.stdin)
assert seal["pgdata"] == sys.argv[1]
assert all(re.fullmatch(r"[a-f0-9]{64}", seal[x]) for x in ("imagePin", "transferPin"))
print(seal["imagePin"], seal["transferPin"])
' "$data")
record verifying collect
node lab/bin/heavy.mjs --label DX-REAL1-verify -- \
  timeout --kill-after=20s 15m node --no-warnings --experimental-transform-types "$runner" verify \
  --commit "$pin" --seed "$out" --image-sha256 "$image" --transfer-sha256 "$transfer" \
  --pgdata-source "$data" > "$job/verify.json"
printf '%s  result/image.json\n%s  result/transfer.json\n' "$image" "$transfer" > "$job/verified-pins.sha256"

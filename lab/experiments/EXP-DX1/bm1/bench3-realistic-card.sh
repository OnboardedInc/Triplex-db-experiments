#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: run the published sequential card on exactly the verified realistic seal.
# Rejected: adopting an unverified extension or testing successive arms on the same writable copy.
root=$1
mode=${2:-run}
pin=a36c88e6c5eeb2dbc8cbcd66282939fdc1ebdab4
[[ $root == /var/tmp/triplex-bm1/bench3 && $EUID == 0 && $(systemd-detect-virt) == none ]]
job=$root/queue/realistic-card
build=$job/build
out=$job/result
extension=$root/queue/realistic
wal=/mnt/triplex-bench3-wal/realistic-card
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export DX_BARE_METAL_ROOT="$job" PATH="$build/tools/bin:$PATH"
status=/var/tmp/triplex-bm1/STATUS

record() {
  printf 'item=bench3-realistic-card state=%s since=%s next=%s\n' "$1" "$(date -u +%FT%TZ)" "$2" > "$status"
}

if [[ $mode == cleanup ]]; then
  [[ -e $job/started ]] || exit 0
  if [[ -d $out/campaign ]]; then
    cd "$build/repository"
    python3 - "$out/campaign" "$pin" > "$job/cleanup-slots.txt" <<'PY'
import json
from pathlib import Path
import re
import sys

for file in Path(sys.argv[1]).rglob("attempt.json"):
    a = json.loads(file.read_bytes())
    assert (a["source"], a["tag"]) == (sys.argv[2], file.parent.name)
    assert re.fullmatch(r"tx2-dxscale1-v01-[0-9a-f]{8}-[0-9a-f]{3}", a["slot"])
    assert a["slot"] == "tx2-dxscale1-v01-" + a["nonce"][:12]
    print(a["slot"])
PY
    while IFS= read -r slot; do
      remaining=$(bash lab/experiments/EXP-DX1/stack/up.sh "$slot" --inventory)
      if [[ -n $remaining ]]; then
        timeout 70 bash lab/experiments/EXP-DX1/stack/down.sh "$slot" --volumes
      fi
      remaining=$(bash lab/experiments/EXP-DX1/stack/up.sh "$slot" --inventory)
      [[ -z $remaining ]]
      if [[ -d $wal/$slot ]]; then
        [[ ! -L $wal/$slot && $(findmnt -nro SOURCE --target "$wal") == /dev/nvme1n1 ]]
        rm -r --one-file-system -- "$wal/$slot"
      fi
    done < "$job/cleanup-slots.txt"
  fi
  record terminal collect
  exit
fi

[[ $mode == run && ! -e $out && -s $extension/verify.json && -z $(docker ps -q) ]]
[[ $(findmnt -nro SOURCE --mountpoint "${wal%/*}") == /dev/nvme1n1 ]]
[[ ! -e $wal ]]
(cd "$extension" && sha256sum -c verified-pins.sha256)
mapfile -t pins < "$extension/verified-pins.sha256"
[[ ${#pins[@]} == 2 && ${pins[0]} =~ ^([a-f0-9]{64})\ \ result/image\.json$ ]]
image=${BASH_REMATCH[1]}
[[ ${pins[1]} =~ ^([a-f0-9]{64})\ \ result/transfer\.json$ ]]
transfer=${BASH_REMATCH[1]}
date -u +%FT%TZ > "$job/started"
record preparing arm-1
timeout -k 15s 20m bash "$root/bench3-v01-build.sh" "$root" realistic-card "$pin"
cd "$build/repository"
[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
export DX_V01_BUILD_RECEIPT="$build/BUILD-v0.1.json" DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0
mkdir -m 0700 "$wal"
data=$extension/stopped/pgdata
for arm in 1 2 3; do
  scratch=$job/copy-$arm
  [[ ! -e $scratch && ! -e $data/postmaster.pid && -z $(docker ps -q) ]]
  df -Pk "$job" | awk 'NR==2 {exit ($4 < 160000000)}'
  record copying "arm-$arm"
  node lab/bin/heavy.mjs --label "DX-V01-realistic-copy-$arm" -- cp -a --reflink=never -- "$data" "$scratch"
  record running "arm-$arm"
  node lab/bin/scorecard.mjs --commit "$pin" --out "$out" \
    --age realistic --arm "$arm" --window-seconds 300 --credit-mode rolling6 \
    --jvm j21-g1 --write-jvm j21-g1 --tx-jvm j25-zgc --wal-directory "$wal" \
    --seed "$extension/result" --image-sha256 "$image" --transfer-sha256 "$transfer" \
    --pgdata-source "$data" --pgdata "$scratch"
  [[ -s $scratch/.triplex-v01-used && ! -L $scratch && ! -e $scratch/postmaster.pid && -z $(docker ps -q) ]]
  cp -p "$scratch/.triplex-v01-used" "$job/used-$arm.json"
  rm -r --one-file-system -- "$scratch"
done
node lab/bin/scorecard.mjs --assemble --commit "$pin" --out "$out"

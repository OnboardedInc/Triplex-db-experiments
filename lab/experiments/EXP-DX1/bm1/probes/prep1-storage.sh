#!/usr/bin/env bash
set -euo pipefail

mode=${1:?run or cleanup}
base=/var/tmp/triplex-bm1
item=${2:-prep1-storage}
case $item in
  prep1-storage) root=$base/night-n20-prep-storage; pin=d3bd6a8b3e6924ebf5c1b53e77a5ca2d78d6b2f2 ;;
  prep1-ordered) root=$base/night-n20-prep-ordered; pin=df307c29c08a9045a4526769f5c917f66800eee4 ;;
  *) exit 2 ;;
esac
repo=$root/build/repository
seal=$base/day-n20-prep1-tenant/campaign
exp=lab/experiments/EXP-DX1
helper=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
export PATH="$root/build/tools/bin:$PATH"
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1 DX_NATIVE_BOOTSTRAP_CACHE=$base/day-p3r/checkout

status() {
  local tmp
  tmp=$(mktemp "$base/status-prep-storage.XXXXXX")
  printf 'item=%s state=%s since=%s next=erasure\n' "$item" "$1" "$(date -u +%FT%TZ)" > "$tmp"
  mv "$tmp" "$base/STATUS"
}

if [[ $mode == cleanup ]]; then
  for run in "$root/small" "$root/campaign"; do
    [[ -s $run/prefix ]] || continue
    read -r prefix < "$run/prefix"
    [[ $prefix =~ ^[0-9a-f]{8}$ && $(git -C "$repo" rev-parse HEAD) == "$pin" ]]
    names=$(docker ps -a --format '{{.Names}}' && docker network ls --format '{{.Name}}' && docker volume ls --format '{{.Name}}')
    for cell in 1-group-k 1-old-s 1-fixed-s 1-prefetch-s 1-cache-s 1-ordered-s; do
      slot=tx2-dxprep1-$prefix-$cell
      if grep -q "^$slot-" <<<"$names"; then (cd "$repo" && timeout 120s bash "$exp/stack/down.sh" "$slot" --volumes); fi
    done
    names=$(docker ps -a --format '{{.Names}}' && docker network ls --format '{{.Name}}' && docker volume ls --format '{{.Name}}')
    if grep -q "^tx2-dxprep1-$prefix-" <<<"$names"; then status cleanup-failed; exit 1; fi
  done
  if [[ ${SERVICE_RESULT:-success} != success ]]; then status incomplete; fi
  exit 0
fi

[[ $mode == run && -z $(docker ps -q) && -s $seal/SEAL.sha256 ]]
mkdir "$root"
status preparing
public=https://github.com/OnboardedInc/Triplex-db-experiments.git
git -c credential.helper= clone --quiet --single-branch --no-checkout --branch exp/DX-PREP1-parallel-prepare "$public" "$root/producer"
git -C "$root/producer" checkout --quiet --detach "$pin"
bash "$root/producer/$exp/t1/bare-metal.sh" --prepare "$pin" "$root/build"
cd "$repo"
python3 "$helper/prep1-storage.py" derive "$repo" "$pin" > "$root/adapter.json"
since=$(date +%s)
status checking-native-small
node lab/bin/heavy.mjs --label DX-BM1-prep-storage-small -- \
  timeout --kill-after=20s 1000s bash "$exp/prep1/.bm1-storage-server.sh" storage "$root/small" "$pin" "$seal"
python3 "$helper/prep1-storage.py" collect "$root/small" "$pin" 1 "$since" > "$root/small-agreement.json"
mv "$exp"/prep1/.bm1-storage-{server.sh,server-produce.ts,server-tape.ts,server-collect.py} "$root/"
[[ -z $(git status --porcelain --untracked-files=no) ]]
script=server.sh
if [[ $item == prep1-ordered ]]; then script=.bm1-storage-server-selected.sh; fi
since=$(date +%s)
status measuring
node lab/bin/heavy.mjs --label "DX-BM1-$item" -- bash "$exp/prep1/$script" storage "$root/campaign" "$pin" "$seal"
python3 "$helper/prep1-storage.py" collect "$root/campaign" "$pin" 60 "$since" > "$root/collector.json"
status measured

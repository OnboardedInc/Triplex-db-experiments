#!/usr/bin/env bash
set -euo pipefail

mode=${1:?run or cleanup}
base=/var/tmp/triplex-bm1
root=$base/night-n20-prep-followup
repo=$root/build/repository
sealed=$base/day-n20-prep1-tenant/campaign
control=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
pin=afd94a9fe0bc2e4485f200bab436c7cb58b289ed
public=https://github.com/OnboardedInc/Triplex-db-experiments.git
experiment=lab/experiments/EXP-DX1
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export DX_NATIVE_BOOTSTRAP_CACHE=$base/day-p3r/checkout
export PATH="$root/build/tools/bin:$PATH"

status() {
  local tmp
  tmp=$(mktemp "$base/status-prep-followup.XXXXXX")
  printf 'item=prep1-followup state=%s since=%s next=erasure\n' "$1" "$(date -u +%FT%TZ)" > "$tmp"
  mv "$tmp" "$base/STATUS"
}

if [[ $mode == cleanup ]]; then
  for location in "$root/small" "$root/campaign"; do
    [[ -s $location/prefix ]] || continue
    read -r prefix < "$location/prefix"
    [[ $prefix =~ ^[a-f0-9]{8}$ && $(git -C "$repo" rev-parse HEAD) == "$pin" ]]
    inventory=$(docker ps -a --format '{{.Names}}'; docker network ls --format '{{.Name}}'; docker volume ls --format '{{.Name}}')
    for cell in 1-group-k 1-old-s 1-fixed-s; do
      slot=tx2-dxprep1-$prefix-$cell
      if grep -q "^$slot-" <<<"$inventory"; then
        (cd "$repo" && timeout 120s bash "$experiment/stack/down.sh" "$slot" --volumes)
      fi
    done
  done
  if [[ ${SERVICE_RESULT:-success} != success ]]; then status incomplete; fi
  exit 0
fi
[[ $mode == run && -z $(docker ps -q) && -s $sealed/SEAL.sha256 ]]
mkdir "$root"
status checking-published-source
git -c credential.helper= clone --quiet --no-checkout --single-branch --branch exp/DX-PREP1-parallel-prepare "$public" "$root/producer"
current=$(git -C "$root/producer" rev-parse refs/remotes/origin/exp/DX-PREP1-parallel-prepare)
# [DX-BM1] Why: only use the numeric-owner fallback if the superseding producer has not been published.
# Rejected: silently using the fallback after a new PREP1 handoff appears.
[[ $current == 6ddbbf5b3* || $current == "$pin" ]]
git -C "$root/producer" checkout --quiet --detach "$pin"
bash "$root/producer/$experiment/t1/bare-metal.sh" --prepare "$pin" "$root/build"
cd "$repo"
python3 "$control/prep1-owner-source.py" derive "$repo" > "$root/adapter.json"
status checking-native-small
BM1_OWNER_SMALL=1 node lab/bin/heavy.mjs --label DX-BM1-prep-owner-small -- \
  timeout -k 20s 2520s bash "$experiment/prep1/.bm1-owner-server.sh" owner "$root/small" "$pin" "$sealed"
python3 "$control/prep1-owner-source.py" validate "$root/small" 1 > "$root/small-agreement.json"
status measuring235
node lab/bin/heavy.mjs --label DX-BM1-prep-owner -- \
  timeout -k 20s 2520s bash "$experiment/prep1/.bm1-owner-server.sh" owner "$root/campaign" "$pin" "$sealed"
python3 "$control/prep1-owner-source.py" validate "$root/campaign" 60 > "$root/collector.json"
status measured

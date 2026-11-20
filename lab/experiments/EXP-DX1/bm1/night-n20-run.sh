#!/usr/bin/env bash
set -euo pipefail

action=${1:?run or cleanup}
item=${2:?night queue item}
case $item in
  jvm25) branch=exp/DX-JVM1-settings; pin=608420dca067c93ef81a7595c65c8498836e5e35; entry=jvm1/server.ts ;;
  tail-backlog) branch=exp/DX-TAIL1-gc-pauses; pin=da4c34f48f3749afcacfe45ac51a727ab0a2160a; entry=tail1/backlog-server.ts ;;
  *) exit 2 ;;
esac
base=/var/tmp/triplex-bm1
root=$base/night-n20-$item
repo=$root/build/repository
seed=$base/day-n20-jvm1/seed
control=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
exp=lab/experiments/EXP-DX1
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export DX_NATIVE_BOOTSTRAP_CACHE=$base/day-p3r/checkout
export PATH="$root/build/tools/bin:$PATH"

status() {
  local tmp
  tmp=$(mktemp "$root/status.XXXXXX")
  printf 'item=%s state=%s since=%s next=%s\n' "$item" "$1" "$(date -u +%FT%TZ)" "$2" > "$tmp"
  mv "$tmp" "$base/STATUS"
}

cleanup() {
  local marker slot
  for marker in "$root/active-slot" "$root/small/active-slot" "$root/campaign/active-slot"; do
    [[ -s $marker ]] || continue
    read -r slot < "$marker"
    [[ $slot =~ ^tx2-dxt1-jvm1-[a-f0-9-]{36}$ && $(git -C "$repo" rev-parse HEAD) == "$pin" ]] || return 2
    (cd "$repo" && timeout 150s bash "$exp/stack/down.sh" "$slot" --volumes) || return 1
    if { docker ps -a --format '{{.Names}}'; docker network ls --format '{{.Name}}'; docker volume ls --format '{{.Name}}'; } | grep -q "^$slot-"; then return 1; fi
    mv "$marker" "$marker.cleaned"
  done
}

if [[ $action == cleanup ]]; then
  [[ -d $root ]] || exit 0
  if ! cleanup; then status cleanup-failed operator; exit 1; fi
  if [[ ${SERVICE_RESULT:-success} != success ]]; then status incomplete next-ready-item; fi
  exit 0
fi
[[ $action == run && $(id -u) == 0 && -z $(docker ps -q) ]]
mkdir "$root"
status preparing native-small
public=https://github.com/OnboardedInc/Triplex-db-experiments.git
git -c credential.helper= clone --quiet --no-checkout --single-branch --branch "$branch" "$public" "$root/producer"
git -C "$root/producer" checkout --quiet --detach "$pin"
DX_JAVA=25 bash "$root/producer/$exp/t1/bare-metal.sh" --prepare "$pin" "$root/build"
cd "$repo"
[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
python3 "$control/night-n20-source.py" "$item" "$repo" > "$root/adapter.json"
adapter="$exp/${entry%/*}/.bm1-n20-${entry##*/}"
mkdir "$root/restore-compat" "$root/restore-proofs"
install -m 755 "$control/jvm1-snapshot.py" "$root/restore-compat/docker"
export BM1_COLD_CAMPAIGN=$item PATH="$root/restore-compat:$PATH"
if [[ $item == jvm25 ]]; then
  run=(node --import tsx "$adapter" run-part2)
  tail=()
  small=(BM1_JVM25_SMALL=1)
else
  run=(node --import tsx "$adapter" run)
  tail=(j21-g1-writer2)
  small=(BM1_TAIL_SMALL=1)
fi
status checking-native-small campaign
env "${small[@]}" node lab/bin/heavy.mjs --label "DX-BM1-$item-small" -- \
  "${run[@]}" "$root/small" "$seed" "${tail[@]}"
python3 "$control/night-n20-read.py" "$item" "$repo" "$root/small" small > "$root/small-agreement.json"
status measuring next-ready-item
node lab/bin/heavy.mjs --label "DX-BM1-$item" -- "${run[@]}" "$root/campaign" "$seed" "${tail[@]}"
python3 "$control/night-n20-read.py" "$item" "$repo" "$root/campaign" full > "$root/collector.json"
status measured next-ready-item

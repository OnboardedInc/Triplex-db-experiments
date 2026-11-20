#!/usr/bin/env bash
set -euo pipefail

action=${1:?usage: prep1-run.sh run|cleanup ROOT}
root=${2:?}
[[ $root == /var/tmp/triplex-bm1/day-n20-prep1 ]]
source=7ca8525a9ea0c3810c7af6ba0b5a0e15552dd534
producer=$root/build/repository
base=lab/experiments/EXP-DX1
entry=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/prep1-small.py
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export PATH="$root/build/tools/bin:$PATH"

status() {
  local temp
  temp=$(mktemp "$root/status.XXXXXX")
  printf 'item=prep1 state=%s since=%s next=%s\n' "$1" "$(date -u +%FT%TZ)" "$2" > "$temp"
  mv "$temp" /var/tmp/triplex-bm1/STATUS
}

cleanup() {
  local directory tag names slot
  for directory in "$root/smoke" "$root/campaign"; do
    [[ -f $directory/prefix ]] || continue
    [[ $(git -C "$producer" rev-parse HEAD) == "$source" ]] || return 2
    read -r tag < "$directory/prefix"
    [[ $tag =~ ^[0-9a-f]{8}$ ]] || return 2
    names=$(docker ps -a --format '{{.Names}}' && docker network ls --format '{{.Name}}' && docker volume ls --format '{{.Name}}') || return 1
    # [DX-BM1] Why: the seed and every measured arm share this fresh PREP1 prefix.
    # Rejected: deleting a different producer's volumes or treating a killed child as clean.
    for cell in seed 1-{0-k,1-s,2-s,3-k} 2-{0-k,1-s,2-s,3-k} 4-{0-k,1-s,2-s,3-k}; do
      slot="tx2-dxprep1-$tag-$cell"
      if grep -q "^$slot-" <<<"$names"; then
        install -d "$directory/aborted-logs"
        for role in tx gw-w gw-w2 gw-w3 gw-w4 gw-r pg; do
          timeout 15s docker logs --timestamps "$slot-$role" > "$directory/aborted-logs/$slot-$role.log" 2>&1 || true
        done
        (cd "$producer" && timeout 120s bash "$base/stack/down.sh" "$slot" --volumes) || return 1
      fi
    done
    names=$(docker ps -a --format '{{.Names}}' && docker network ls --format '{{.Name}}' && docker volume ls --format '{{.Name}}') || return 1
    if grep -q "^tx2-dxprep1-$tag-" <<<"$names"; then return 1; fi
  done
}

if [[ $action == cleanup ]]; then
  if ! cleanup; then status cleanup-failed operator; exit 1; fi
  if [[ ${SERVICE_RESULT:-success} != success ]]; then status incomplete next-ready-item; fi
  exit 0
fi
[[ $action == run && $(id -u) == 0 && -z $(docker ps -q) ]]
cd "$producer"
[[ $(git rev-parse HEAD) == "$source" ]]
[[ -z $(git status --porcelain) ]]
mkdir "$root/adapter"
python3 "$entry" prepare "$producer" > "$root/adapter/source-files.json"
status checking-small campaign
node lab/bin/heavy.mjs --label DX-BM1-prep1-small -- \
  timeout -k 20s 1200s bash "$base/prep1/.bm1-small-server.sh" run "$root/smoke" "$source"
cleanup
python3 "$entry" check "$root/smoke" > "$root/native-small-agreement.json"
mv "$base"/prep1/.bm1-small-* "$root/adapter"
[[ -z $(git status --porcelain) ]]
status measuring next-ready-item
node lab/bin/heavy.mjs --label DX-BM1-prep1 -- \
  timeout -k 20s 25200s bash "$base/prep1/server.sh" run "$root/campaign" "$source"
cleanup
python3 - "$root/campaign" "$source" <<'PY'
import hashlib
import json
from pathlib import Path
import sys

root, source = Path(sys.argv[1]), sys.argv[2]
results = {}
for writers in (1,2,4):
    for cell in ("0-K","1-S","2-S","3-K"):
        name = f"{writers}-{cell}"
        file = root/name/"summary.json"
        body = json.loads(file.read_bytes())
        assert body["source"] == source and not body["fixture"] and len(body["cells"]) == 8
        results[name] = hashlib.sha256(file.read_bytes()).hexdigest()
with (root/"collector.json").open("x") as stream:
    json.dump(dict(source=source, results=results), stream, indent=2)
    stream.write("\n")
PY
status measured next-ready-item

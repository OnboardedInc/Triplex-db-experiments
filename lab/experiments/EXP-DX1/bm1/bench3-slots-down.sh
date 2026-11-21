#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: after a stop, release every stack slot that a run recorded under its output folder.
# Rejected: removing containers by name pattern, which could reach another item's slot.
repo=$1
out=$2
[[ -d $repo && -d $out ]] || exit 0
cd "$repo"
find "$out" -maxdepth 4 \( -name attempt.json -o -name pgdata.json \) -type f -print0 |
  xargs -0 -r python3 -c '
import json, sys
for name in sys.argv[1:]:
    slot = json.load(open(name)).get("slot")
    if isinstance(slot, str): print(slot)
' | sort -u | while read -r slot; do
  [[ $slot =~ ^tx2-dxscale1-v01-[a-z0-9-]+$ ]]
  remaining=$(bash lab/experiments/EXP-DX1/stack/up.sh "$slot" --inventory)
  if [[ -n $remaining ]]; then timeout 80 bash lab/experiments/EXP-DX1/stack/down.sh "$slot" --volumes; fi
  [[ -z $(bash lab/experiments/EXP-DX1/stack/up.sh "$slot" --inventory) ]]
done

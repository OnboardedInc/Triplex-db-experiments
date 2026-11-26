#!/usr/bin/env bash
# [DX-XQ10] The hint fix's cells (index gate G6 cost harness, 10,000 subjects padded to 30 facts, stride 33, 300 saves
# per arm, both hint options on), one ordinary heavy token each, image pinned by ID inside xq4/gate.sh:
#   DOCKER_HOST=<lab VM socket> bash lab/experiments/EXP-DX1/xq10/hints.sh OUT_ROOT "CELL ..." REPEATS
# CELL is <cache>:<fix>, fix = off | on (TX2_INDEX_HINTS); e.g. 32m:off 256m:on. (The follow-up's part cells, range,
# keys, decl and aevt, ran with a lab knob since removed: evidence/DX-XQ10/runs/hints2.)
set -uo pipefail
root=${1:?out root} cells=${2:?cells} reps=${3:-1}
here=$(cd "$(dirname "$0")" && pwd); repo=$(git -C "$here" rev-parse --show-toplevel)
for r in $(seq 1 "$reps"); do for cell in $cells; do
  cache=${cell%%:*} fix=${cell##*:} on=
  [[ $fix == on ]] && on=1
  d=$root/h-$cache-$fix-$r
  [[ -e $d ]] && continue
  XQ4_TX_CACHE=$cache XQ4_G6_SUBJECTS=10000 XQ4_G6_PAD=30 XQ4_COST_STRIDE=33 XQ4_COST_PER=300 XQ4_HINTS=1 \
    XQ4_INDEX_HINTS=$on \
    node "$repo/lab/bin/heavy.mjs" --label "DX-XQ10-h-$cache-$fix-$r" -- bash "$repo/lab/experiments/EXP-DX1/xq4/gate.sh" "$d" "g6" > /dev/null 2>&1
  echo "XQ10_HINT_CELL $cache $fix $r $(cat "$d/image-check" 2>/dev/null | cut -c1-40) $(date -u +%FT%TZ)"
done; done

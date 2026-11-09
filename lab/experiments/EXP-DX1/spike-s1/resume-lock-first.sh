#!/bin/bash
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
SRC=$(cd "$(dirname "$0")" && pwd)
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1
measure() {
  local label=$1; shift
  bash "$SRC/measure.sh" "$label" node lab/bin/heavy.mjs --label "DX-S1-$label" -- "$@" > "$OUT/$label-driver.log" 2>&1
}
measure q1-open-40-15-r3 bash "$SRC/peer.sh" q1-open-40-15-r3 2 open dxs1-write q1-open-40-15-r3 40 15 60
measure q1-pg-sample bash "$SRC/pg-sample.sh"
measure q2-cold bash "$SRC/peer.sh" cold 2 cold dxs1-world
measure q2-verify bash "$SRC/peer.sh" verify 2 verify dxs1-world
for variant in a b c; do
  measure "q2-$variant" bash "$SRC/peer.sh" "q2$variant" 2 read dxs1-world "$variant" "q2-$variant"
done
for variant in b c; do
  measure "q2-parallel-$variant" bash "$SRC/peer.sh" "q2p$variant" 2,3 parallel dxs1-world "$variant" "q2-parallel-$variant" 4 60
done
for condition in alone separate shared; do
  cpu=none
  if [ "$condition" = separate ]; then cpu=3; fi
  if [ "$condition" = shared ]; then cpu=2; fi
  measure "q4-$condition" bash "$SRC/isolation.sh" "q4-$condition" "$cpu"
done
measure q5 bash "$SRC/feed.sh"
measure q3 bash "$SRC/peer.sh" history 2 history dxs1-world
measure q6 bash "$SRC/durability.sh"

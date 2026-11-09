#!/bin/bash
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
SRC=$(cd "$(dirname "$0")" && pwd)
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1
# [DX-S1] Why: same database includes peer transaction ingestion; retain the earlier cross-database control separately. Rejected: presenting cross-database isolation as a same-database result.
for condition in alone separate shared; do
  cpu=none
  if [ "$condition" = separate ]; then cpu=3; fi
  if [ "$condition" = shared ]; then cpu=2; fi
  label="q4-samedb-$condition"
  bash "$SRC/measure.sh" "$label" node lab/bin/heavy.mjs --label "DX-S1-$label" -- bash "$SRC/isolation-same-db.sh" "$label" "$cpu" > "$OUT/$label-driver.log" 2>&1
done

#!/bin/bash
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
SRC=$(cd "$(dirname "$0")" && pwd)
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1
for target in tx pg; do
  label="q6-$target"
  bash "$SRC/peer.sh" "dur$target" 2 markers dxs1-write "$label" 100000 0 > "$OUT/$label-writer.log" 2>&1 &
  wpid=$!
  until [ -f "$OUT/$label-ack.csv" ] && [ "$(wc -l < "$OUT/$label-ack.csv")" -gt 500 ]; do kill -0 "$wpid"; sleep 0.1; done
  date -u > "$OUT/$label-stop.txt"
  docker kill -s KILL "tx2-dxs1-$target" >> "$OUT/$label-stop.txt"
  # [DX-S1] Why: stop the peer after the storage interruption to freeze the acknowledged set before recovery. Rejected: treating unacknowledged pending futures as lost commits.
  docker stop -t 2 "tx2-dxs1-dur$target" >> "$OUT/$label-stop.txt"
  wait "$wpid" || true
  docker start "tx2-dxs1-$target" >> "$OUT/$label-stop.txt"
  if [ "$target" = pg ]; then
    until docker exec tx2-dxs1-pg pg_isready -U postgres; do sleep 1; done
  fi
  sleep 10
  bash "$SRC/peer.sh" "check$target" 2 check dxs1-write "$label" > "$OUT/$label-check.log" 2>&1
 done

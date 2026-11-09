#!/bin/bash
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
SRC=$(cd "$(dirname "$0")" && pwd)
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1
label=$1; readercpu=$2
if [ "$readercpu" != none ]; then
  bash "$SRC/peer.sh" "${label}r" "$readercpu" load dxs1-world "$label" > "$OUT/$label-reader.log" 2>&1 &
  rpid=$!
  until [ -f "$OUT/$label-reader-ready" ]; do kill -0 "$rpid"; sleep 1; done
fi
bash "$SRC/peer.sh" "${label}w" 2 open dxs1-write "$label" 40 55 60 > "$OUT/$label-writer.log" 2>&1 &
wpid=$!
until [ -f "$OUT/$label-go" ]; do kill -0 "$wpid"; sleep 0.1; done
date -u > "$OUT/$label-transactor-cpu.txt"
docker exec tx2-dxs1-tx cat /sys/fs/cgroup/cpu.stat >> "$OUT/$label-transactor-cpu.txt"
until [ -f "$OUT/$label-done" ]; do kill -0 "$wpid"; sleep 0.1; done
date -u >> "$OUT/$label-transactor-cpu.txt"
docker exec tx2-dxs1-tx cat /sys/fs/cgroup/cpu.stat >> "$OUT/$label-transactor-cpu.txt"
wait "$wpid"
if [ "$readercpu" != none ]; then wait "$rpid"; fi

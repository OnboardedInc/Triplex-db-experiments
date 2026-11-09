#!/bin/bash
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
SRC=$(cd "$(dirname "$0")" && pwd)
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1
label=q5-feed
bash "$SRC/peer.sh" feedr 3 feed dxs1-write "$label" 2000 > "$OUT/q5-reader.log" 2>&1 &
rpid=$!
until [ -f "$OUT/$label-ready" ]; do kill -0 "$rpid"; sleep 1; done
bash "$SRC/peer.sh" feedw 2 markers dxs1-write "$label" 2000 20 > "$OUT/q5-writer.log" 2>&1
wait "$rpid"

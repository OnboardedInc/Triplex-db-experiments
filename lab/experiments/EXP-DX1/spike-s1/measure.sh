#!/bin/bash
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
# [DX-S1] Why: one lock across spikes keeps timed windows disjoint. Rejected: parallel timing (CPU/storage interference).
LOCK=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
until mkdir "$LOCK" 2>/dev/null; do sleep 5; done
trap 'rmdir "$LOCK"' EXIT
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1
label=$1; shift
available=$(df -Pk "$OUT" | awk 'NR==2 {print $4}')
if [ "$available" -lt 5242880 ]; then echo 'DX-S1: less than 5 GiB free; refusing heavy timing' >&2; exit 1; fi
date -u > "$OUT/$label-window.txt"
docker stats --no-stream >> "$OUT/$label-window.txt"
python3 "$(dirname "$0")/timed-command.py" "$@"
date -u >> "$OUT/$label-window.txt"
docker stats --no-stream >> "$OUT/$label-window.txt"

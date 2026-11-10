#!/usr/bin/env bash
# [DX-B5-L6] Why: keep the fixed host ports free before entering the shared measurement queue.
# Rejected: allowing a queued measurement to collide with an owned functional stack.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
while [[ -n $(docker ps -a --filter name=tx2-dxb5-final- --format '{{.Names}}') ]]; do sleep 5; done
exec node lab/bin/heavy.mjs --label DX-B5-L6-lean2 -- bash lab/experiments/EXP-DX1/b5/measure.sh lean

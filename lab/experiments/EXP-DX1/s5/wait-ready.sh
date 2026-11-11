#!/usr/bin/env bash
# [DX-S5] Why: execute the target-head readiness gate in the owned network with bounded fetches.
# Rejected: host ports and another daemon, which would not bind the observation to this slot.
set -euo pipefail
prefix=${1:?prefix}; db=${2:-}; minimum=${3:-0}; roles=${4:-w,r}
docker run --rm --pull never --name "$prefix-copy" --network "$prefix-net" \
 -v "$PWD/lab/experiments/EXP-DX1/s5:/s5:ro" node:22.23.2-bookworm-slim \
 node /s5/wait-ready.mjs "$prefix" "$db" "$minimum" "$roles"

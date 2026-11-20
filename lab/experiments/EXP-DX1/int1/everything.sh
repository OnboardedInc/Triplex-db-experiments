#!/usr/bin/env bash
# [DX-THIN1] Why: use the physical queue's existing exclusion for all four matched pairs and their preflight.
# Rejected: starting alongside a different campaign or leaving the producer and collector on different source checkouts.
set -euo pipefail
batch=${1:?batch name required}
cutoff=${2:?UTC cutoff required}
selection=${3:---both}
[[ $batch =~ ^[a-z][a-z0-9-]{2,24}$ && $cutoff =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]
[[ $selection == --both || $selection == --overnight || $selection == --scorecard ]]
[[ $EUID == 0 && $(uname -s) == Linux && $(systemd-detect-virt || true) == none ]]
export DOCKER_HOST=unix:///var/run/docker.sock
unset DOCKER_CONTEXT DOCKER_TLS DOCKER_TLS_VERIFY DOCKER_CERT_PATH
umask 077
queue=/var/tmp/triplex-bm1
out=/var/tmp/triplex-int1-all
mkdir -p "$queue" "$out"
exec 9>"$queue/dx-bm1-day.lock"
flock -n 9
exec node lab/bin/heavy.mjs --label DX-THIN1-physical -- node --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/int1/everything.ts --run "$out/$batch" "$cutoff" "$selection" "${@:4}"

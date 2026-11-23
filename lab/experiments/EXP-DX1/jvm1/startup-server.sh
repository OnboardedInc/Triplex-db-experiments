#!/usr/bin/env bash
# [DX-JVM1] Why: run the restart campaign (no read against the one-time start-up read) under the same physical queue,
# lock, environment and sender core as the cold-start trial.
# Rejected: a second queue that could silently admit concurrent runs.
set -euo pipefail
[[ $(uname -s) == Linux && $(id -u) == 0 && $# -ge 8 ]]
umask 077
mkdir -p /var/tmp/triplex-bm1
exec 9>/var/tmp/triplex-bm1/dx-bm1-day.lock
flock -n 9
# The runner sets its own work deadline from the arm count (22 minutes per arm, 26 with the aged bundle).
exec env -i PATH="$PATH" LC_ALL=C.UTF-8 "DX_V01_BUILD_RECEIPT=${DX_V01_BUILD_RECEIPT:?}" \
  DOCKER_HOST=unix:///var/run/docker.sock TRIPLEX_DATOMIC_FAST_PATHS=save-wire \
  GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 \
  timeout --kill-after=15s 110m taskset -c 9 node --max-old-space-size=4096 --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/jvm1/startup-server.ts "$@"

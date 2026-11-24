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
# [DX-THIN1] The dry-run variables pass through only when set, so a real launch keeps its clean environment.
# [DX-W4] So does the per-subject writer's hint option (default off), for the restart pair with hints on.
# The runner sets its own work deadline from the arm count (22 minutes per arm, 26 with the aged bundle).
exec env -i PATH="$PATH" LC_ALL=C.UTF-8 "DX_V01_BUILD_RECEIPT=${DX_V01_BUILD_RECEIPT:?}" \
  DOCKER_HOST=unix:///var/run/docker.sock TRIPLEX_DATOMIC_FAST_PATHS=save-wire \
  GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 \
  ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=$DX_DRY_RUN_FIRST_OFFER} \
  ${DX_DRY_RUN_LOG:+DX_DRY_RUN_LOG=$DX_DRY_RUN_LOG} ${DX_DRY_RUN_DOCKER:+DX_DRY_RUN_DOCKER=$DX_DRY_RUN_DOCKER} \
  ${DX_DRY_RUN_FAKE:+DX_DRY_RUN_FAKE=$DX_DRY_RUN_FAKE} \
  ${TX2_SUBJECT_HINTS:+TX2_SUBJECT_HINTS=$TX2_SUBJECT_HINTS} \
  timeout --kill-after=15s 110m taskset -c 9 node --max-old-space-size=4096 --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/jvm1/startup-server.ts "$@"

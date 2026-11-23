#!/usr/bin/env bash
# [DX-JVM1] Why: use the existing physical queue and bind the sender to its own CPU.
# Rejected: a second queue that could silently admit concurrent runs.
set -euo pipefail
[[ $(uname -s) == Linux && $(id -u) == 0 && ( $# == 8 || ( $# == 10 && ${9} == --credit-mode ) ) ]]
umask 077
mkdir -p /var/tmp/triplex-bm1
exec 9>/var/tmp/triplex-bm1/dx-bm1-day.lock
flock -n 9
exec env -i PATH="$PATH" LC_ALL=C.UTF-8 "DX_V01_BUILD_RECEIPT=${DX_V01_BUILD_RECEIPT:?}" \
  DOCKER_HOST=unix:///var/run/docker.sock TRIPLEX_DATOMIC_FAST_PATHS=save-wire \
  GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=$DX_DRY_RUN_FIRST_OFFER} \
  ${DX_DRY_RUN_LOG:+DX_DRY_RUN_LOG=$DX_DRY_RUN_LOG} ${DX_DRY_RUN_DOCKER:+DX_DRY_RUN_DOCKER=$DX_DRY_RUN_DOCKER} \
  ${DX_DRY_RUN_FAKE:+DX_DRY_RUN_FAKE=$DX_DRY_RUN_FAKE} \
  timeout --kill-after=15s 59m taskset -c 9 node --max-old-space-size=3072 --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/jvm1/cold-server.ts "$@"

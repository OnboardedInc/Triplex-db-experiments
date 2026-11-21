#!/usr/bin/env bash
# [DX-JVM1] Why: use the existing physical queue and bind the sender to its own CPU.
# Rejected: a second queue that could silently admit concurrent runs.
set -euo pipefail
[[ $(uname -s) == Linux && $(id -u) == 0 && $# == 8 ]]
export DOCKER_HOST=unix:///var/run/docker.sock TRIPLEX_DATOMIC_FAST_PATHS=save-wire
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
unset DOCKER_CONTEXT DOCKER_TLS DOCKER_TLS_VERIFY DOCKER_CERT_PATH
unset DX_PREP1_DUMP DX_JVM1_PG_RESTORE DX_BM1_WAL_MOUNT
umask 077
mkdir -p /var/tmp/triplex-bm1
exec 9>/var/tmp/triplex-bm1/dx-bm1-day.lock
flock -n 9
exec timeout --kill-after=15s 59m taskset -c 9 node --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/jvm1/cold-server.ts "$@"

#!/usr/bin/env bash
# [DX-V01] Why: reserve the same bare-metal queue as the native INT1 driver.
# Rejected: overlapping restores with other campaigns or exporting inherited Docker settings.
set -euo pipefail
export DOCKER_HOST=unix:///var/run/docker.sock
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
unset DOCKER_CONTEXT DOCKER_TLS DOCKER_TLS_VERIFY DOCKER_CERT_PATH
umask 077
mkdir -p /var/tmp/triplex-bm1
exec 9>/var/tmp/triplex-bm1/dx-bm1-day.lock
flock -n 9
exec node lab/bin/heavy.mjs --label DX-V01-adopted -- node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/adopted-server.ts "$@"

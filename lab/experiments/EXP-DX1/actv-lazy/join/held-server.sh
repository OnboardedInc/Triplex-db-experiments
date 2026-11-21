#!/usr/bin/env bash
# [DX-ACT1] Why: keep all roles and timing on the bare-metal queue with a bounded allocation.
# Rejected: taking the laptop measurement lease or falling back to a fresh roster build.
set -euo pipefail
[[ $(uname -s) == Linux && $# == 8 && -r ${DX_V01_BUILD_RECEIPT:?} ]]
exec 9<>/var/tmp/triplex-bm1/dx-bm1-day.lock
flock -xn 9
export DX_BARE_METAL=1 TRIPLEX_DATOMIC_LAYOUT=lean TRIPLEX_DATOMIC_FAST_PATHS=save-wire
export TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1 TX2_W0_RESTORE_INDEXED_JOURNAL=1
export DX_SERVER_RECORD_TIME=1 DX_STRICT_RECORD_CLOCKS=1
timeout --signal=TERM --kill-after=90s 87m node --max-old-space-size=8192 --experimental-transform-types \
  lab/experiments/EXP-DX1/actv-lazy/join/held-server.ts "$@"

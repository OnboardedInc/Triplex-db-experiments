#!/usr/bin/env bash
# [DX-ACT1] Why: keep all roles and timing on the bare-metal queue with a bounded allocation.
# Rejected: taking the laptop measurement lease or falling back to a fresh roster build.
set -euo pipefail
[[ $(uname -s) == Linux && $# == 8 && -r ${DX_V01_BUILD_RECEIPT:?} ]]
[[ -f /var/tmp/triplex-bm1/dx-bm1-day.lock ]]
exec 9<>/var/tmp/triplex-bm1/dx-bm1-day.lock
flock -xn 9
export DX_BARE_METAL=1 TRIPLEX_DATOMIC_LAYOUT=lean TRIPLEX_DATOMIC_FAST_PATHS=save-wire
export TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1 TX2_W0_RESTORE_INDEXED_JOURNAL=1
export DX_SERVER_RECORD_TIME=1 DX_STRICT_RECORD_CLOCKS=1
# [DX-ACT4] DX_HELD_MINUTES raises the runner's limit for a run that settles a large release first (default 87).
# [DX-ACT7] Up to 960: the settlement runs beside saves (SETTLEMENT-LIVE.md section 9, act7/RUN2.md) need 240 to 900;
# with the old cap of 180 the published commands with 240 and 420 exited at once with status 1 and no message.
minutes=${DX_HELD_MINUTES:-87}
[[ $minutes =~ ^[0-9]+$ ]] && (( minutes >= 30 && minutes <= 960 )) || { echo "DX_HELD_MINUTES is 30 to 960" >&2; exit 2; }
timeout --signal=TERM --kill-after=90s "${minutes}m" node --max-old-space-size=8192 --experimental-transform-types \
  lab/experiments/EXP-DX1/actv-lazy/join/held-server.ts "$@"

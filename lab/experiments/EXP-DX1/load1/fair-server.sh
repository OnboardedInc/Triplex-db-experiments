#!/usr/bin/env bash
# [DX-HA1] Why: run both credit selections on a single verified, disposable prepared copy.
# Rejected: reusing unbound live storage or procuring a second server for a sender-only arm.
set -euo pipefail
[[ $(uname -s) == Linux && $# -ge 11 && -r ${DX_V01_BUILD_RECEIPT:?} ]]
source_commit=$1 image=$2 image_pin=$3 transfer_pin=$4 template=$5 output=$6
shift 6
prepared= wal= rolling= width=32 credits=1 policy=fair memory_index=
while (( $# )); do
  [[ $# -ge 2 ]]
  case $1 in
    --pg-data) prepared=$2 ;;
    --wal-dir) wal=$2 ;;
    --credit-mode) rolling=$2 ;;
    --frame-facts) width=$2 ;;
    --import-credits) credits=$2 ;;
    --import-policy) policy=$2 ;;
    --memory-index) memory_index=$2 ;;
    *) exit 2 ;;
  esac
  shift 2
done
[[ -n $prepared && -n $wal && $rolling =~ ^rolling(6|8|12|16)$ && $policy =~ ^(fair|yield)$ ]]
# [DX-LOAD2] Why: keep the fair launch byte-for-byte as before; the yield launch adds one argument.
extra=()
[[ $policy == fair ]] || extra=("$policy")
# [DX-LOAD2] Why: the fewer-index-jobs arm is a separate launch on its own fresh copy (one yield width).
if [[ -n $memory_index ]]; then
  [[ $memory_index =~ ^[0-9]+[mg],[0-9]+[mg]$ && $policy == yield && $width != *,* ]]
  export DX_LOAD2_MEMORY_INDEX=$memory_index
fi
[[ -f /var/tmp/triplex-bm1/dx-bm1-day.lock ]]
exec 9<>/var/tmp/triplex-bm1/dx-bm1-day.lock
flock -xn 9
export DX_BARE_METAL=1 TRIPLEX_DATOMIC_LAYOUT=lean TRIPLEX_DATOMIC_FAST_PATHS=save-wire
export TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1 TX2_W0_RESTORE_INDEXED_JOURNAL=1
export DX_SERVER_RECORD_TIME=1 DX_STRICT_RECORD_CLOCKS=1
timeout --signal=TERM --kill-after=60s 57m node --max-old-space-size=8192 --experimental-transform-types \
  lab/experiments/EXP-DX1/actv-lazy/join/held-server.ts "$source_commit" "$image" "$image_pin" "$transfer_pin" \
  "$template" "$prepared" "$wal" "$output" --fair-import "$rolling" "$width" "$credits" ${extra[@]+"${extra[@]}"}

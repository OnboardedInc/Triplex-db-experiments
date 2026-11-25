#!/usr/bin/env bash
# [DX-ERA5] The fuzzer in series: era5/inproc.sh RUNS times (one ordinary heavy token each, so other builders
# interleave), seeds FIRST.., N schedules each:  bash lab/experiments/EXP-DX1/era5/series.sh OUT_ROOT RUNS N FIRST_SEED
set -uo pipefail
root=${1:?}; runs=${2:?}; n=${3:?}; first=${4:?}
here=$(cd "$(dirname "$0")" && pwd); repo=$(cd "$here/../../../.." && pwd)
mkdir -p "$root"
for k in $(seq 0 $((runs - 1))); do
  seed=$((first + k))
  ERA5_N=$n ERA5_BLOCK=100 ERA5_SEED=$seed ERA5_RUN="s$seed" node "$repo/lab/bin/heavy.mjs" --label "DX-ERA5-series-$seed" -- \
    bash "$here/inproc.sh" "$root/seed$seed" fuzz > "$root/seed$seed.out" 2>&1
  echo "$(date '+%H:%M:%S') seed $seed exit $? $(grep -h '^ERA5_SUMMARY' "$root/seed$seed/run.log" 2>/dev/null | cut -c1-120)" >> "$root/series.log"
done

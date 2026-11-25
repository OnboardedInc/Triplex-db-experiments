#!/usr/bin/env bash
# [DX-ERA4] Gate (e): era4/inproc.sh RUNS times in a row (one heavy token each, so other builders interleave), seeds
# FIRST.., N schedules each:  bash lab/experiments/EXP-DX1/era4/series.sh OUT_ROOT ARM RUNS N FIRST_SEED
set -uo pipefail
root=${1:?}; arm=${2:?}; runs=${3:?}; n=${4:?}; first=${5:?}
here=$(cd "$(dirname "$0")" && pwd); repo=$(cd "$here/../../../.." && pwd)
mkdir -p "$root"
for k in $(seq 0 $((runs - 1))); do
  seed=$((first + k))
  ERA4_N=$n ERA4_BLOCK=100 ERA4_SEED=$seed ERA4_RUN="s$seed" node "$repo/lab/bin/heavy.mjs" --label "DX-ERA4-series-$arm-$seed" -- \
    bash "$here/inproc.sh" "$root/$arm-seed$seed" "$arm" > "$root/$arm-seed$seed.out" 2>&1
  echo "$(date '+%H:%M:%S') seed $seed exit $? $(grep -h '^ERA4_SUMMARY' "$root/$arm-seed$seed/run.log" 2>/dev/null | cut -c1-120)" >> "$root/series.log"
done

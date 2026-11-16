#!/usr/bin/env bash
# [DX-T1-12] Why: first 100k readings are zero-reader diagnostics on a real memory budget, after 1k/10k qualification.
# Rejected: run 100k in this task, use a sealed W0 seed as the NS population, or silently grow the VM.
set -euo pipefail
mode=${1:---plan}; prefix=${2:-tx2-dxt1-first-100k}
[[ $mode == --plan || $mode == --execute ]] || exit 2
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
if [[ $mode == --plan ]]; then
  node lab/experiments/EXP-DX1/t1/scale-settings.mjs --subjects 100000 --guest-bytes 17179869184 --zero-readers
  exit
fi
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=28*1024**3'
export DX_TRANSACTION_CENSUS=1 DX_NS_PROFILE=smoke
for level in summary full; do
  for burst in 50 20; do
    # [DX-T1-12] Why: 600s deadline retains every diagnostic command; the 20x arm is labelled and never a verdict.
    # Rejected: expire and drop a slow burst, or pace the frozen verdict trace to pass it.
    TRIPLEX_TRACE_LEVEL=$level bash lab/experiments/EXP-DX1/t1/run.sh real "$prefix-$level-burst-$burst" \
      --rung 100k --zero-readers --match-duration-s 900 --writer-deadline-ms 600000 --burst-multiplier "$burst" --history-growth-subjects 4
  done
done

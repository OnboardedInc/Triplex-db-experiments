#!/usr/bin/env bash
# [DX-T1] Why: alternate off/full/full/off on the same source and frozen 200-second writer trace.
# Rejected: comparing a historical fast arm or mixing reader work into the tracing-cost denominator.
set -euo pipefail
prefix=${1:?tx2-dxt1-cost-TAG}; shift
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
i=0
for level in off full full off; do
  i=$((i+1))
  TRIPLEX_TRACE_LEVEL=$level bash lab/experiments/EXP-DX1/t1/run.sh real "$prefix-$i-$level" \
    --rung 10k --zero-readers --reader-ladder-only --max-readers 0 --level-s 20 --match-duration-s 200 "$@"
done
node lab/trace/cost.mjs "$DX_STACK_EVIDENCE" "$prefix"

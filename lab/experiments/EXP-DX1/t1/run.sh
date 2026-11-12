#!/usr/bin/env bash
# [DX-T1] Why: a single public entrypoint pins exact local reads and the permanent trace destination.
# Rejected: ad hoc per-command environment settings that can silently differ between matched arms.
set -euo pipefail
kind=${1:?functional|real|pair}; prefix=${2:?tx2-dxt1-TAG}; shift 2
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
export TRIPLEX_TRACE_LEVEL=${TRIPLEX_TRACE_LEVEL:-full}
export DX_READ_PATH=replica DX_STRICT_RECORD_CLOCKS=1
exec node lab/bin/heavy.mjs --label DX-T1-$prefix -- bash lab/experiments/EXP-DX1/h4/run.sh "$kind" "$prefix" "$@"

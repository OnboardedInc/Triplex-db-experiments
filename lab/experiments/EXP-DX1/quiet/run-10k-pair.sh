#!/usr/bin/env bash
# Orchestrator's verdict run for lane D at the 10,000-subject rung (Sam, 2026-11-10: skip the 2,000 rung).
# Waits for the Mac to be quiet (lab/bin/host-quiet.sh), then runs the paired north-star benchmark (zero-reader arm, then the
# ladder) inside the VM through h4/run.sh, records the host before and after, and renders the tables. No keep-awake.
# usage: run-10k-pair.sh <prefix like tx2-dxh4-q1> [max minutes to wait for quiet, default 360]
set -uo pipefail
prefix=${1:?prefix}; waitmin=${2:-360}
export TRIPLEX_TRACE_LEVEL=${TRIPLEX_TRACE_LEVEL:-full}
cd "$(git rev-parse --show-toplevel)"
E=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-H4}; mkdir -p "$E"
free=$(df -k /System/Volumes/Data | awk 'NR==2{print int($4/1048576)}'); [ "$free" -ge 15 ] || { echo "refusing: only ${free} GiB free"; exit 3; }
sh lab/bin/host-quiet.sh --wait "$waitmin" > "$E/$prefix-host-wait.jsonl"; quiet=$?
[[ $quiet == 0 ]] || { echo "quiet window unavailable; no measurement admitted"; exit 75; }
sh lab/bin/host-quiet.sh > "$E/$prefix-host-before.jsonl"
git rev-parse HEAD > "$E/$prefix-head.txt"
bash lab/experiments/EXP-DX1/h4/run.sh pair "$prefix" --rung 10k "${@:3}" > "$E/$prefix-pair.log" 2>&1; rc=$?
sh lab/bin/host-quiet.sh > "$E/$prefix-host-after.jsonl"
python3 lab/experiments/EXP-DX1/h4/summarize.py "$E/$prefix-ladder" > "$E/$prefix-TABLES.md" 2> "$E/$prefix-summarize.err"
echo "pair rc=$rc quietAtStart=$quiet"; cat "$E/$prefix-host-before.jsonl" "$E/$prefix-host-after.jsonl"; head -3 "$E/$prefix-TABLES.md"

# [DX-T1] Why: the caller must observe a failed/aborted pair, even when table rendering succeeds. Rejected: exit zero after printing rc=143.
exit "$rc"

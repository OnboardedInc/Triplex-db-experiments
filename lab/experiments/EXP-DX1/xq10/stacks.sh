#!/usr/bin/env bash
# [DX-XQ10] Every stack-based gate of the three pieces on the merged head, one after another (their ports overlap),
# each under its own ordinary heavy token, each followed by the image and source check of its recorded stack:
#   DOCKER_HOST=<lab VM socket> bash lab/experiments/EXP-DX1/xq10/stacks.sh "$PWD" NEW_OUT_DIR [STEPS]
# Steps (default all): xq3 xq6 xq9off xq9shapes xq7 reader refusal.
set -uo pipefail
repo=$1 out=$2 steps=${3:-"xq3 xq6 xq9off xq9shapes xq7 reader refusal"}
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
mkdir -p "$out"
heavy() { node "$repo/lab/bin/heavy.mjs" --label "DX-XQ10-$1" -- "${@:2}"; }
for step in $steps; do
  d=$out/$step
  echo "XQ10_STEP $step $(date -u +%FT%TZ)"
  case $step in
    xq3) heavy xq3 bash "$repo/lab/experiments/EXP-DX1/xq3/gate.sh" "$repo" "$d" ;;
    xq6) heavy xq6 bash "$repo/lab/experiments/EXP-DX1/xq6/gate.sh" "$repo" "$d" ;;
    xq9off) heavy xq9off bash "$repo/lab/experiments/EXP-DX1/xq9/gate.sh" "$repo" "$d" twin-off ;;
    xq9shapes) heavy xq9shapes bash "$repo/lab/experiments/EXP-DX1/xq9/gate.sh" "$repo" "$d" shapes ;;
    xq7) heavy xq7 bash "$repo/lab/experiments/EXP-DX1/xq7/gate.sh" "$repo" "$d" ;;
    reader) heavy reader bash "$repo/lab/experiments/EXP-DX1/xq10/reader.sh" "$repo" "$d" main ;;
    refusal) heavy refusal bash "$repo/lab/experiments/EXP-DX1/xq10/reader.sh" "$repo" "$d" refusal ;;
  esac
  echo "XQ10_STEP_EXIT $step $?"
  python3 -I "$repo/lab/experiments/EXP-DX1/xq10/stack-check.py" "$d/stack" x "$repo/packages/datomic/gateway" > "$d/stack-check.txt" 2>&1
  tail -1 "$d/stack-check.txt"
done

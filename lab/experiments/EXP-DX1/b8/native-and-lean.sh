#!/usr/bin/env bash
set -uo pipefail
bash lab/experiments/EXP-DX1/b8/native-tests.sh "${1:?prefix}"; native=$?
bash lab/experiments/EXP-DX1/b8/lean-reach.sh; lean=$?
printf 'B8_GATE_COMPONENTS native=%d leanReach=%d\n' "$native" "$lean"
[[ $native == 0 && $lean == 0 ]]

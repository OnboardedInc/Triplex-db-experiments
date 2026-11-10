#!/usr/bin/env bash
set -uo pipefail
# [DX-B8] Why: retain the original selftest failures without suppressing the new head and native package checks.
# Rejected: exit at the first unrelated stale fixture, leaving the actual mechanism untested.
prefix=${1:?prefix}
mode=${2:-base}
printf 'B8_SCOPE mode=%s nativeFocused=%s
' "$mode" "${B8_NATIVE_FOCUSED:-0}"
bash lab/experiments/EXP-DX1/b8/native-tests.sh "$prefix"; native=$?
bash lab/experiments/EXP-DX1/b8/suite.sh "$mode"; package=$?
printf 'B8_GATE_COMPONENTS native=%d package=%d\n' "$native" "$package"
[[ $native == 0 && $package == 0 ]]

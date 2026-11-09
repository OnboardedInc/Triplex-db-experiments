#!/usr/bin/env bash
# [DX-H1] Why: every direct NS attempt uses both lab admission and the measurement lock.
# Rejected: documenting a naked driver command (easy to overlap another measurement).
set -euo pipefail
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
cd "$repo"
exec node lab/bin/heavy.mjs --label DX-H1-NS -- node lab/experiments/EXP-DX1/h1/run.mjs "$@"

#!/usr/bin/env bash
# [DX-H2] Why: admission and a bounded measurement lease are mandatory for every arm. Rejected: naked driver commands.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
exec node lab/bin/heavy.mjs --label DX-H2-P5 -- node lab/experiments/EXP-DX1/h2/run.mjs "$@"

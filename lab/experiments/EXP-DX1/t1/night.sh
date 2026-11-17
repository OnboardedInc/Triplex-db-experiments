#!/usr/bin/env bash
# [DX-T1-13] Why: one entrypoint runs the two owned v3 studies and the optional CPU contrast only in the quiet window.
# Rejected: a daytime launch, manual inter-arm steps, or a background warmer.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
exec node --import tsx lab/experiments/EXP-DX1/t1/night.mjs "$@"

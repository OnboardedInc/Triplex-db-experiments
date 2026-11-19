#!/usr/bin/env bash
# [DX-T1-13] Why: one entrypoint runs the two owned v3 studies and the optional CPU contrast only in the quiet window.
# Rejected: a daytime launch, manual inter-arm steps, or a background warmer.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
# [DX-BM1] Why: saved evidence can be read with Node's erasable TypeScript support.
# Rejected: requiring a full workspace build to read historical data.
if [[ ${1:-} == --render-saved ]]; then
  exec node --experimental-strip-types lab/experiments/EXP-DX1/t1/night.mjs "$@"
fi
exec node --import tsx lab/experiments/EXP-DX1/t1/night.mjs "$@"

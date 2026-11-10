#!/usr/bin/env bash
# [DX-N1] Why: identical reduced B6/B7 clients on both operating systems. Rejected: different traces per arm.
set -euo pipefail
export B6_WRITES_ONLY=1 B7_PHASES='[["random",4],["random",64],["random",256]]' B7_DURATION_MS=5000 B7_WORKERS=3
node --experimental-strip-types lab/experiments/EXP-DX1/native/generated/lone-commit.mjs
node --experimental-strip-types lab/experiments/EXP-DX1/native/generated/pull-load.mjs

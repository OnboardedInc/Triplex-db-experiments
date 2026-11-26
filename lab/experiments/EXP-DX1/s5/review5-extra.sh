#!/usr/bin/env bash
# [DX-S5 fifth review] The counted runs added after lane a (on the second image, s5/image3.sh at its own head): the two
# tests added to attack5 (a database turned on before the bar; R4-2 in import and settlement frames) and the
# restart-read stack with idle restarts. One heavy job at a time, beside the fuzz lane.
#   DOCKER_HOST=<lab VM socket> DX_S5_IMAGE=<tag> bash lab/experiments/EXP-DX1/s5/review5-extra.sh OUT
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?output directory}
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
cd "$repo"
mkdir -p "$out"
heavy() { local label=$1; shift; node lab/bin/heavy.mjs --label "DX-S5R5-$label" --poll-ms 250 -- "$@"; }
echo "DX-S5R5_STEP attack5-extra $(date -u +%T)"
S5_ONLY=frozen,r42frames heavy attack5-extra bash lab/experiments/EXP-DX1/s5/clj-run3.sh "$out/attack5-extra" attack5 "accounts-on accounts-on-general accounts-on-serial group-accounts"
echo "DX-S5R5_STEP stack-restart-read2 $(date -u +%T)"
S5_ROUNDS=8 heavy stack-restart-read2 bash lab/experiments/EXP-DX1/s5/stack3.sh "$out/stack-restart-read2" stack7-run.sh
echo "DX-S5R5_LANE_DONE extra $(date -u +%T)"

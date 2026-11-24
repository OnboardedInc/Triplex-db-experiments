#!/usr/bin/env bash
# [DX-ACT9] One removal cell on the many-accounts miniature (scale2/mini.sh, its own toy stack in the lab VM, one heavy
# token; the caller sets DX_DATOMIC_IMAGE_RECEIPT so the stack starts this branch's image by ID):
#   DOCKER_HOST=<lab VM socket> DX_DATOMIC_IMAGE_RECEIPT=<receipt> node lab/bin/heavy.mjs --label DX-ACT9-cell -- \
#     bash lab/experiments/EXP-DX1/act9/cells.sh NEW_ABSOLUTE_DIR ARM RATE SHAPE
# ARM: before (the per-account removal rule, tickets without accounts: the Publish branch's callers) or after
# (TX2_ACCOUNT_TICKETS=1 on the client and the gateways). RATE: removals per second in the removing account.
# SHAPE: ten (ten publishing accounts A..J, A removes, two accounts enrol during the cell; gates b, c, d) or many (fifty
# publishing accounts at once, one round each, removals in a 51st, thin account; gate g).
# Diagnostic only: every time is a Mac time; the counts are the result.
set -euo pipefail
out=${1:?new absolute output directory}; arm=${2:?before or after}; rate=${3:?removals per second}; shape=${4:-ten}
[[ $arm == before || $arm == after ]] || exit 2
[[ $shape == ten || $shape == many ]] || exit 2
: "${DOCKER_HOST:?}" "${DX_DATOMIC_IMAGE_RECEIPT:?start the stack from the image of this branch, by ID}"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
gw="DX_SWEEP_GATE_EVICT=1 DX_XQ3_ERASURE_DIRECTORY=1 DX_REMOVAL_PER_ACCOUNT=1"
client=(TX2_REMOVAL_PER_ACCOUNT=1 TX2_PUBLISH_BESIDE=1 TX2_ENROL_BESIDE_SAVES=1 TRIPLEX_DATOMIC_SHARED_AGENT=1
  DX_SCALE2_REMOVAL=1 DX_SCALE2_LIVE_AT_ONCE=1 DX_ACT9_CELL=1 "DX_ACT9_RATE=$rate"
  DX_SCALE2_PORT_WRITE=${DX_ACT9_PORT_WRITE:-18941} DX_SCALE2_PORT_READ=${DX_ACT9_PORT_READ:-18945}
  DX_SCALE2_DEEP=2 DX_SCALE2_DEEP_PEOPLE=8 DX_SCALE2_WINDOW_S=10 DX_SCALE2_RATE=20 DX_SCALE2_BUSY_RATE=5 DX_SCALE2_QUIET_RATE=2
  DX_SCALE2_READERS=2 DX_SCALE2_SAMPLE=10)
if [[ $shape == ten ]]; then
  client+=(DX_SCALE2_THIN=60 DX_SCALE2_PUBLISH=12 DX_SCALE2_LIVE_PUBLISH=10 DX_SCALE2_LATE=2 DX_ACT9_REMOVER=first
    "DX_ACT9_SECONDS=${DX_ACT9_SECONDS:-30}")
else
  client+=(DX_SCALE2_THIN=100 DX_SCALE2_PUBLISH=52 DX_SCALE2_LIVE_PUBLISH=50 DX_SCALE2_LATE=2 DX_ACT9_REMOVER=thin
    DX_ACT9_ROUNDS=1 "DX_ACT9_SECONDS=${DX_ACT9_SECONDS:-60}")
fi
[[ $arm == after ]] && { gw+=" DX_ACCOUNT_TICKETS=1"; client+=(TX2_ACCOUNT_TICKETS=1); }
for kv in ${DX_ACT9_EXTRA_ENV:-}; do client+=("$kv"); done
cd "$repo"
env "${client[@]}" DX_SCALE2_GATEWAY_ENV="$gw" bash lab/experiments/EXP-DX1/scale2/mini.sh "$out"

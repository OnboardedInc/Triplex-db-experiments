#!/usr/bin/env bash
# [DX-S3] The several-owners product-path gates on in-memory gateways (Mac, correctness; times diagnostic), one token:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S3-gates -- \
#     bash lab/experiments/EXP-DX1/s3/run-gates.sh OUT [arms]
# arms (default "on off"): "on" the gateway's TX2_SUBJECT_SEVERAL_OWNERS=1, "off" =0, "on-hints" =1 with
# TX2_SUBJECT_HINTS=1. The SDK runs orderedSaves, saveSizeRule and severalOwners in every arm; the control's
# per-subject writer is off. Containers are removed when the run ends.
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}
arms=${2:-on off}
[[ ! -e $out ]] || { echo "run-gates.sh: $out exists" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
cd "$repo"
git rev-parse HEAD > "$out/source"
git status --short > "$out/dirty"
name=gates-$$ subject=18891 control=18892
trap 'bash "$here/mem-gateways.sh" down "$name"' EXIT
status=0
for arm in $arms; do
  case $arm in on) several=1 hints=0 ;; off) several=0 hints=0 ;; on-hints) several=1 hints=1 ;; *) echo "arm $arm?" >&2; exit 2 ;; esac
  bash "$here/mem-gateways.sh" up "$name" "$subject" "$control" "$several" "$hints" || exit 1
  node --no-warnings --experimental-transform-types "$here/gate.ts" "http://127.0.0.1:$subject" "http://127.0.0.1:$control" \
    "$several" "$out/gate-$arm.json" > "$out/gate-$arm.log" 2>&1 || status=1
  grep -E '^DX-S3_(GATE|UNEXPECTED)' "$out/gate-$arm.log" | head -20 || tail -n 20 "$out/gate-$arm.log"
  bash "$here/mem-gateways.sh" down "$name"
done
echo "DX-S3_GATES_EXIT $status"
exit "$status"

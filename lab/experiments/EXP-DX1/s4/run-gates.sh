#!/usr/bin/env bash
# [DX-S4] The creation-saves product-path gates on in-memory gateways (Mac, correctness; times diagnostic), one token:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S4-gates -- \
#     bash lab/experiments/EXP-DX1/s4/run-gates.sh OUT [arms]
# arms (default "before sdk-only after"): see s4/gate.ts. Every container's image ID is recorded and must be the pinned
# image's; containers are removed after each arm and when the run ends.
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}
arms=${2:-before sdk-only after}
[[ ! -e $out ]] || { echo "run-gates.sh: $out exists" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
cd "$repo"
git rev-parse HEAD > "$out/source"
git status --short > "$out/dirty"
name=gates-$$ subject=18941 control=18942 profile=18943
trap 'bash "$here/mem-gateways.sh" down "$name"' EXIT
status=0
for arm in $arms; do
  case $arm in after) create=1 ;; before|sdk-only) create=0 ;; *) echo "arm $arm?" >&2; exit 2 ;; esac
  bash "$here/mem-gateways.sh" up "$name" "$subject" "$control" "$profile" "$create" > "$out/gateways-$arm.log" 2>&1 \
    || { cat "$out/gateways-$arm.log"; exit 1; }
  grep -E '^DX-S4_CONTAINER' "$out/gateways-$arm.log"
  node --no-warnings --experimental-transform-types "$here/gate.ts" "http://127.0.0.1:$subject" "http://127.0.0.1:$control" \
    "http://127.0.0.1:$profile" "$arm" "$out/gate-$arm.json" > "$out/gate-$arm.log" 2>&1 || status=1
  grep -E '^DX-S4_(GATE|UNEXPECTED|DIFFER)' "$out/gate-$arm.log" | head -20 || tail -n 20 "$out/gate-$arm.log"
  grep -qE '^DX-S4_GATE' "$out/gate-$arm.log" || tail -n 30 "$out/gate-$arm.log"
  bash "$here/mem-gateways.sh" down "$name"
done
echo "DX-S4_GATES_EXIT $status"
exit "$status"

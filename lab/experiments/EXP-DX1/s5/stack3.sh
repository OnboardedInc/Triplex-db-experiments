#!/usr/bin/env bash
# [DX-S5 third review] Launches a stack run inside the reviewer's image (s5/image3.sh) by image ID; only the output
# directory is mounted. RUNNER: stack3-run.sh (the transition with real builds), stack2-run.sh (the mixed fleet of the
# second review), u1-run.sh (U1).
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S5R3-stack -- bash lab/experiments/EXP-DX1/s5/stack3.sh OUT RUNNER
set -uo pipefail
out=${1:?absolute new output directory under /Users}
runner=${2:?runner script name}
[[ $out == /Users/* && ! -e $out ]] || { echo "stack3.sh: give a new absolute output directory under /Users" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
head=$(git -C "$repo" rev-parse HEAD)
ref=${DX_S5_IMAGE:-tx2-dxs5r3:${head:0:12}}
image_id=$(docker image inspect -f '{{.Id}}' "$ref") || { echo "stack3.sh: build $ref with s5/image3.sh first" >&2; exit 2; }
source=$(docker image inspect -f '{{index .Config.Labels "tx2.dx-s5r3.source"}}' "$image_id")
mkdir -p "$out"
echo "DX-S5R3_IMAGE $ref $image_id source $source head $head runner $runner" | tee "$out/image"
git -C "$repo" status --short > "$out/dirty"
line="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1 TX2_PREDECESSOR_LOOKUP=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TX2_GROUP_COMMIT=0 TX2_LIVE_PRIORITY=0 TRIPLEX_TRACE_LEVEL=off"
envs=(); for kv in $line; do envs+=(-e "$kv"); done
docker run --rm --name "tx2-dxs5r3-stack-$$" --label dx-s5r3=stack --pull never --memory 4500m --entrypoint /bin/bash "${envs[@]}" \
  -e S5_ROUNDS -e U1_PAIRS -e U1_ROWS -v "$out:/out" "$image_id" "/exp/s5/$runner" > "$out/stack.log" 2>&1
status=$?
grep -E '^DX-S5R(2|3)_' "$out/stack.log" | cut -c1-2000
echo "DX-S5R3_STACK_EXIT $status"
exit "$status"

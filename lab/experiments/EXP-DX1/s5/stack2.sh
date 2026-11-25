#!/usr/bin/env bash
# [DX-S5 second review] The mixed-fleet fence check (s5/stack2-run.sh, s5/mixed-fleet.ts) in the lab VM, by image ID on
# the reviewer's image built from the committed head (s5/image2.sh); only the output directory is mounted.
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S5R2-stack -- bash lab/experiments/EXP-DX1/s5/stack2.sh OUT
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "stack2.sh: give a new absolute output directory under /Users" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
head=$(git -C "$repo" rev-parse HEAD)
ref=${DX_S5_IMAGE:-tx2-dxs5:${head:0:12}}
image_id=$(docker image inspect -f '{{.Id}}' "$ref") || { echo "stack2.sh: build $ref with s5/image2.sh first" >&2; exit 2; }
source=$(docker image inspect -f '{{index .Config.Labels "tx2.dx-s5.source"}}' "$image_id")
mkdir -p "$out"
echo "DX-S5R2_IMAGE $ref $image_id source $source head $head" | tee "$out/image"
git -C "$repo" status --short > "$out/dirty"
line="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1 TX2_PREDECESSOR_LOOKUP=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TX2_GROUP_COMMIT=0 TX2_LIVE_PRIORITY=0 TRIPLEX_TRACE_LEVEL=off"
envs=(); for kv in $line; do envs+=(-e "$kv"); done
docker run --rm --name "tx2-dxs5r2-stack-$$" --label dx-s5=stack2 --pull never --memory 3500m --entrypoint /bin/bash "${envs[@]}" \
  -e S5_ROUNDS -v "$out:/out" "$image_id" /exp/s5/stack2-run.sh > "$out/stack.log" 2>&1
status=$?
grep -E '^DX-S5R2_(SQL|TX|GATEWAYS|ACTIONS|CASE|DONE|STACK)' "$out/stack.log" | cut -c1-3000
echo "DX-S5R2_STACK_EXIT $status"
exit "$status"

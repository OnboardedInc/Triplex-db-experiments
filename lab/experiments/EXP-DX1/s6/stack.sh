#!/usr/bin/env bash
# [DX-S6] F1 on the PostgreSQL stack (s6/stack-run.sh) in the lab VM, by image ID on the image s6/image.sh built from
# the committed head; only the bundled driver and the output directory are mounted. One ordinary heavy token:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S6-stack -- bash lab/experiments/EXP-DX1/s6/stack.sh OUT [SETTING]
# SETTING: server (every per-subject writer on, as the S5 stack) or general (every per-subject writer off).
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
setting=${2:-server}
[[ $out == /Users/* && ! -e $out ]] || { echo "stack.sh: give a new absolute output directory under /Users" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
head=$(git -C "$repo" rev-parse HEAD)
ref=${DX_S6_IMAGE:-tx2-dxs6:${head:0:12}}
image_id=$(docker image inspect -f '{{.Id}}' "$ref") || { echo "stack.sh: build $ref with s6/image.sh first" >&2; exit 2; }
source=$(docker image inspect -f '{{index .Config.Labels "tx2.dx-s6.source"}}' "$image_id")
mkdir -p "$out"
echo "DX-S6_IMAGE $ref $image_id source $source head $head" | tee "$out/image"
git -C "$repo" status --short > "$out/dirty"
esbuild="$repo/node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild"
(cd "$repo" && "$esbuild" lab/experiments/EXP-DX1/s6/sdk-stack.ts --bundle --platform=node --format=esm --log-level=warning \
  "--banner:js=import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);" --outfile="$out/sdk-stack.mjs") || exit 2
base="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1 TX2_PREDECESSOR_LOOKUP=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TX2_GROUP_COMMIT=0 TX2_LIVE_PRIORITY=0 TRIPLEX_TRACE_LEVEL=off"
case $setting in
  server) line=$base ;;
  general) line="TX2_SUBJECT_SAVE=0 TX2_PREDECESSOR_LOOKUP=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TX2_GROUP_COMMIT=0 TX2_LIVE_PRIORITY=0 TRIPLEX_TRACE_LEVEL=off" ;;
  *) echo "setting $setting?" >&2; exit 2 ;;
esac
envs=(); for kv in $line; do envs+=(-e "$kv"); done
name=tx2-dxs6-stack-$$
docker run --rm --name "$name" --label dx-s6=stack --pull never --memory 3500m --entrypoint /bin/bash "${envs[@]}" \
  -e S6_SEED -e S6_SECONDS -e S6_SAVES -e S6_DROP -e S6_WORKERS \
  -v "$here/stack-run.sh:/opt/s6/stack-run.sh:ro" -v "$out:/out" "$image_id" /opt/s6/stack-run.sh > "$out/stack.log" 2>&1
status=$?
grep -E '^DX-S6_(SQL|TX|GATEWAYS|QUIET|FAULTS|READY|FAULTED_PHASE|VERIFY|CONSTRAINTS|DONE|STACK)' "$out/stack.log" | cut -c1-4000
echo "DX-S6_STACK_EXIT $status"
exit "$status"

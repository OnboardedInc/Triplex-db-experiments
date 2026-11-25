#!/usr/bin/env bash
# [DX-S5] The reviewer's PostgreSQL stack check (s5/stack-run.sh) in the lab VM, one ordinary heavy token:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S5-stack -- bash lab/experiments/EXP-DX1/s5/stack.sh OUT [SETTING]
# SETTING: server (default), serial-hints.
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
setting=${2:-server}
[[ $out == /Users/* && ! -e $out ]] || { echo "stack.sh: give a new absolute output directory under /Users" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
ref=${DX_S5_IMAGE_REF:-tx2-datomic:dx-s4-runtime}
image_id=$(docker image inspect -f '{{.Id}}' "$ref")
mkdir -p "$out"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --short > "$out/dirty"
echo "DX-S5_IMAGE $ref $image_id" | tee "$out/image"
base="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1 TX2_PREDECESSOR_LOOKUP=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TX2_GROUP_COMMIT=0 TX2_LIVE_PRIORITY=0 TRIPLEX_TRACE_LEVEL=off"
case $setting in
  server) line=$base ;;
  serial-hints) line="$base TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1 TX2_SUBJECT_HINTS=1" ;;
  *) echo "setting $setting?" >&2; exit 2 ;;
esac
envs=(); for kv in $line; do envs+=(-e "$kv"); done
name=tx2-dxs5-stack-$$
docker run --rm --name "$name" --label dx-s5=stack --pull never --memory 3g --entrypoint /bin/bash "${envs[@]}" \
  -e S5_STACK_SEED -e S5_STACK_PER_THREAD -e S5_KILL_AT -e S5_RESTART_AT \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
  -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
  -v "$repo/lab/experiments/EXP-DX1:/exp:ro" -v "$out:/out" "$image_id" /exp/s5/stack-run.sh > "$out/stack.log" 2>&1
status=$?
grep -E '^DX-S5_(SQL|TX|KILL|WRITERS|STACK)' "$out/stack.log" | cut -c1-3000
echo "DX-S5_STACK_EXIT $status"
exit "$status"

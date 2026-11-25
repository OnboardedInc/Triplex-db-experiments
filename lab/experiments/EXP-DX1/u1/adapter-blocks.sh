#!/usr/bin/env bash
# [DX-INT5] The adapter-level U1 check (u1/adapter-blocks.ts) on S2's in-memory write gateway with the wide per-subject
# writer, by image ID (DX_S2_IMAGE), under one ordinary heavy token taken by the caller:
#   DOCKER_HOST=<lab VM socket> DX_S2_IMAGE=<image id> bash lab/experiments/EXP-DX1/u1/adapter-blocks.sh NEW_OUT_DIR
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}
[[ ! -e $out ]] || { echo "adapter-blocks.sh: $out exists" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
git -C "$repo" rev-parse HEAD > "$out/source"
name=u1-blocks-$$ subject=18881 control=18882
trap 'bash "$here/../s2/mem-gateways.sh" down "$name"' EXIT
bash "$here/../s2/mem-gateways.sh" up "$name" "$subject" "$control" 1 || exit 1
docker inspect --format '{{.Name}} {{.Image}}' "tx2-dxs2-$name-subject" > "$out/image-ran.txt"
(cd "$repo" && node --no-warnings --experimental-transform-types "$here/adapter-blocks.ts" "http://127.0.0.1:$subject" "$out/result.json") > "$out/run.log" 2>&1
status=$?
tail -n 2 "$out/run.log"
exit $status

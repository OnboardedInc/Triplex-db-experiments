#!/usr/bin/env bash
# [DX-S5 second review] Builds the reviewer's image from this branch's committed head: the pinned lab runtime image
# with the head's gateway sources, codec spec, the in-memory gate and attack files (wfix1, w2, s3, s4, s5, s6) and the
# bundled SDK stack drivers baked in. Runs start it by image ID with no source or test mounts (only an output
# directory). Refuses a dirty tree for everything it copies. Prints "DX-S5R2_IMAGE <tag> <id> source <head>".
# One ordinary heavy token:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S5-image -- bash lab/experiments/EXP-DX1/s5/image2.sh
set -euo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
paths=(packages/datomic/gateway/src packages/datomic/src packages/core/src lab/experiments/EXP-DX1/wfix1 lab/experiments/EXP-DX1/w2
       lab/experiments/EXP-DX1/s3 lab/experiments/EXP-DX1/s4 lab/experiments/EXP-DX1/s5 lab/experiments/EXP-DX1/s6)
[[ -z $(git -C "$repo" status --short -- "${paths[@]}") ]] || { echo "image2.sh: commit the copied files first" >&2; exit 2; }
head=$(git -C "$repo" rev-parse HEAD)
base=$(docker image inspect -f '{{.Id}}' "${DX_S5_BASE:-tx2-datomic:dx-s4-runtime}")
ctx=$(mktemp -d)
pin=tx2-dxs5-base:${head:0:12}
docker tag "$base" "$pin"
trap 'rm -rf "$ctx"; docker rmi "$pin" >/dev/null 2>&1' EXIT
git -C "$repo" archive "$head" packages/datomic/gateway/src packages/datomic/src/codec-spec.json \
  lab/experiments/EXP-DX1/wfix1 lab/experiments/EXP-DX1/w2 lab/experiments/EXP-DX1/s3 lab/experiments/EXP-DX1/s4 \
  lab/experiments/EXP-DX1/s5 lab/experiments/EXP-DX1/s6 | tar -x -C "$ctx"
# The SDK drivers, bundled from the committed head's TypeScript (the working tree equals it for these paths).
esbuild="$repo/node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild"
mkdir -p "$ctx/drivers"
for d in mixed-fleet; do
  [[ -f "$repo/lab/experiments/EXP-DX1/s5/$d.ts" ]] || continue
  (cd "$repo" && "$esbuild" "lab/experiments/EXP-DX1/s5/$d.ts" --bundle --platform=node --format=esm --log-level=warning \
    "--banner:js=import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);" --outfile="$ctx/drivers/$d.mjs")
done
cat > "$ctx/Dockerfile" <<DOCKER
FROM $pin
RUN rm -rf /opt/gateway/src
COPY packages/datomic/gateway/src /opt/gateway/src
COPY packages/datomic/src/codec-spec.json /opt/gateway/codec-spec.json
COPY lab/experiments/EXP-DX1 /exp
COPY drivers /opt/s5
LABEL tx2.dx-s5.source=$head
DOCKER
tag=tx2-dxs5:${head:0:12}
docker build -q -t "$tag" "$ctx" >/dev/null
echo "DX-S5R2_IMAGE $tag $(docker image inspect -f '{{.Id}}' "$tag") source $head base $base"

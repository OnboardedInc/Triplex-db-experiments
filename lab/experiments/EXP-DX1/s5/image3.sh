#!/usr/bin/env bash
# [DX-S5 third review] The reviewer's image, built from this branch's committed head on the pinned lab runtime, with
# everything a run needs copied in (runs mount nothing but an output directory):
#   /opt/gateway/src          the head's gateway (the build under review) and its codec spec
#   /opt/builds/<name>/src    other builds' gateways, from their commits: s6a = a6d02225c (the save line before S6b),
#                             base = 23b7df344 (the base), era2 = 03bb49cd3 (the removal branch); each with its codec spec
#   /exp                      the in-memory gates and attacks (wfix1, w2, s3, s4, s5, s6)
#   /opt/s5                   the bundled SDK drivers (s5/*.ts listed below)
# Tag tx2-dxs5r3:<head12>, label tx2.dx-s5r3.source. Refuses a dirty tree for everything it copies.
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S5R3-image -- bash lab/experiments/EXP-DX1/s5/image3.sh
set -euo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
paths=(packages/datomic/gateway/src packages/datomic/src packages/core/src lab/experiments/EXP-DX1/wfix1 lab/experiments/EXP-DX1/w2
       lab/experiments/EXP-DX1/s3 lab/experiments/EXP-DX1/s4 lab/experiments/EXP-DX1/s5 lab/experiments/EXP-DX1/s6)
[[ -z $(git -C "$repo" status --short -- "${paths[@]}") ]] || { echo "image3.sh: commit the copied files first" >&2; exit 2; }
head=$(git -C "$repo" rev-parse HEAD)
base=$(docker image inspect -f '{{.Id}}' "${DX_S5_BASE:-tx2-datomic:dx-s4-runtime}")
ctx=$(mktemp -d)
pin=tx2-dxs5r3-base:${head:0:12}
docker tag "$base" "$pin"
trap 'rm -rf "$ctx"; docker rmi "$pin" >/dev/null 2>&1' EXIT
git -C "$repo" archive "$head" packages/datomic/gateway/src packages/datomic/src/codec-spec.json \
  lab/experiments/EXP-DX1/wfix1 lab/experiments/EXP-DX1/w2 lab/experiments/EXP-DX1/s3 lab/experiments/EXP-DX1/s4 \
  lab/experiments/EXP-DX1/s5 lab/experiments/EXP-DX1/s6 | tar -x -C "$ctx"
for b in s6a:a6d02225c base:23b7df344 era2:03bb49cd3; do
  name=${b%%:*} commit=${b#*:}
  mkdir -p "$ctx/builds/$name"
  git -C "$repo" archive "$commit" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$ctx/builds/$name"
  echo "$commit" > "$ctx/builds/$name/commit"
done
esbuild="$repo/node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild"
mkdir -p "$ctx/drivers"
for d in mixed-fleet transition u1; do
  [[ -f "$repo/lab/experiments/EXP-DX1/s5/$d.ts" ]] || continue
  (cd "$repo" && "$esbuild" "lab/experiments/EXP-DX1/s5/$d.ts" --bundle --platform=node --format=esm --log-level=warning \
    "--banner:js=import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);" --outfile="$ctx/drivers/$d.mjs")
done
cat > "$ctx/Dockerfile" <<DOCKER
FROM $pin
RUN rm -rf /opt/gateway/src
COPY packages/datomic/gateway/src /opt/gateway/src
COPY packages/datomic/src/codec-spec.json /opt/gateway/codec-spec.json
COPY builds /opt/builds
COPY lab/experiments/EXP-DX1 /exp
COPY drivers /opt/s5
LABEL tx2.dx-s5r3.source=$head
DOCKER
tag=tx2-dxs5r3:${head:0:12}
docker build -q -t "$tag" "$ctx" >/dev/null
echo "DX-S5R3_IMAGE $tag $(docker image inspect -f '{{.Id}}' "$tag") source $head base $base"

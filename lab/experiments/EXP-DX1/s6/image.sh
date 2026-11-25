#!/usr/bin/env bash
# [DX-S6] Builds the gateway image for this branch's committed head: the pinned lab Datomic runtime image with this
# head's gateway sources and codec spec copied in (no source mounts at run time). Prints "DX-S6_IMAGE <tag> <id>".
# One ordinary heavy token:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S6-image -- bash lab/experiments/EXP-DX1/s6/image.sh
set -euo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
[[ -z $(git -C "$repo" status --short -- packages/datomic/gateway/src packages/datomic/src/codec-spec.json) ]] \
  || { echo "image.sh: commit the gateway sources first" >&2; exit 2; }
head=$(git -C "$repo" rev-parse HEAD)
base=$(docker image inspect -f '{{.Id}}' "${DX_S6_BASE:-tx2-datomic:dx-s4-runtime}")
ctx=$(mktemp -d)
# BuildKit resolves FROM by name only: a private tag on the pinned base ID for the build, removed afterwards.
pin=tx2-dxs6-base:${head:0:12}
docker tag "$base" "$pin"
trap 'rm -rf "$ctx"; docker rmi "$pin" >/dev/null 2>&1' EXIT
git -C "$repo" archive "$head" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$ctx"
cat > "$ctx/Dockerfile" <<DOCKER
FROM $pin
RUN rm -rf /opt/gateway/src
COPY packages/datomic/gateway/src /opt/gateway/src
COPY packages/datomic/src/codec-spec.json /opt/gateway/codec-spec.json
LABEL tx2.dx-s6.source=$head
DOCKER
tag=tx2-dxs6:${head:0:12}
docker build -q -t "$tag" "$ctx" >/dev/null
echo "DX-S6_IMAGE $tag $(docker image inspect -f '{{.Id}}' "$tag") source $head base $base"

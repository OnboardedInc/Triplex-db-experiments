#!/usr/bin/env bash
# [DX-API1] Mac run for API-call-shaped reads, under one ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-API1-gate -- bash lab/experiments/EXP-DX1/api1/gate.sh NEW_ABSOLUTE_OUT [PHASES]
# PHASES (comma-separated, default gate,counts,straddle): gate = exactness of the batch and the loader against single reads;
# counts = round trips, storage loads, reader CPU per shape and port, warm and cold, 1/16/64 callers; straddle = unpinned
# calls under saves. Seeds a deep toy first. Times are diagnostic; counts are results.
# API1_DRIVER: the Mac driver (default run.ts; cache-gate.ts for the parsed-entity cache gate, the shared-entity toy and
# the request costs). API1_READER_ENV: settings for both readers.
# API1_IMAGE: an image ID (default: the ID the runtime tag named when this was written, checked by gate-image.sh).
set -uo pipefail
out=${1:?absolute new output directory}
phases=${2:-gate,counts,straddle}
[[ $out == /* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory" >&2; exit 2; }
export DOCKER_HOST=${DOCKER_HOST:-unix://$HOME/.colima/triplex2/docker.sock}
repo=$(git rev-parse --show-toplevel)
here=$repo/lab/experiments/EXP-DX1/api1
name=${API1_NAME:-tx2-dxapi1-gate} base=${API1_PORT:-18761}
[[ $name =~ ^tx2-dx[a-z0-9-]+$ && $base =~ ^1[0-9]{4}$ ]] || exit 2
mkdir -p "$out/out"
. "$repo/lab/bin/gate-image.sh"
image=$(gate_image "${API1_IMAGE:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}" "$out/image.json") || exit 2
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway/src packages/datomic/src lab/experiments/EXP-DX1/api1 > "$out/source-dirty"
docker rm -f "$name" >/dev/null 2>&1
# API1_COLD_ENV: more settings for the cold reader (8082), for example TX2_ENTITY_CACHE_BYTES=0; empty by default.
docker run -d --name "$name" --memory 6g --cpus 4 -e "API1_COLD_ENV=${API1_COLD_ENV:-}" -e "API1_READER_ENV=${API1_READER_ENV:-}" -p 127.0.0.1:$base:8080 -p 127.0.0.1:$((base+1)):8081 -p 127.0.0.1:$((base+2)):8082 \
  --entrypoint /bin/bash -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$here:/gate:ro" -v "$out/out:/out" \
  "$image" /gate/container.sh >/dev/null
gate_image_ran "$name" "$image" "$out/image.json" || { docker rm -f "$name" >/dev/null; exit 2; }
(cd "$repo" && API1_CONTAINER=$name API1_PHASES=$phases node --no-warnings --experimental-transform-types "lab/experiments/EXP-DX1/api1/${API1_DRIVER:-run.ts}" "$out/out" \
  http://127.0.0.1:$base http://127.0.0.1:$((base+1)) http://127.0.0.1:$((base+2))) 2>&1 | tee "$out/driver.log"
status=${PIPESTATUS[0]}
touch "$out/out/done"
for ((i=0; i<60; i++)); do [[ -f $out/out/finished ]] && break; docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null | grep -q true || break; sleep 1; done
docker logs "$name" > "$out/out/container.log" 2>&1
docker rm -f "$name" >/dev/null
exit "$status"

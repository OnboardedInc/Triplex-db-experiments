#!/usr/bin/env bash
# [DX-INT1] Mac toy for the card's production cells on a loader-aged database, under one ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-INT1-production-aged -- bash lab/experiments/EXP-DX1/v01/production-aged-toy.sh NEW_DIR
# PREP1's aged-live container (prep1/aged-live/container.sh) holds the database; v01/production-aged-toy.ts drives it.
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "production-aged-toy.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
image=${DX_V01_AGED_TOY_IMAGE:-tx2-datomic:dx-prep1-subject-query}
mkdir -p "$out/out" "$out/age1src"
git -C "$repo" archive 5cda4ab204b9736e32960843bee8cbc47d5ca74d -- packages/datomic/gateway/src packages/datomic/src/codec-spec.json \
  lab/experiments/EXP-DX1/age1/src | tar -x -C "$out/age1src"
git -C "$repo" rev-parse HEAD > "$out/source"
name=tx2-dxint1-production-aged
docker rm -f "$name" >/dev/null 2>&1
docker run -d --name "$name" --memory 3g -p 127.0.0.1:18604:8080 --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$out/age1src:/age:ro" \
  -v "$repo/lab/experiments/EXP-DX1/prep1/aged-live:/gate:ro" -v "$out/out:/out" "$image" /gate/container.sh >/dev/null
(cd "$repo" && node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/production-aged-toy.ts "$out/out" \
  http://127.0.0.1:18604) 2>&1 | tee "$out/driver.log"
status=${PIPESTATUS[0]}
docker logs "$name" > "$out/out/container.log" 2>&1
docker rm -f "$name" >/dev/null
rm -rf "$out/age1src"
exit "$status"

#!/usr/bin/env bash
# [DX-RD3] Mac gate for the pinned arm with saves, under one ordinary heavy token (timings diagnostic):
#   node lab/bin/heavy.mjs --label DX-RD3-saves-gate -- bash lab/experiments/EXP-DX1/rd1/saves-gate/gate.sh NEW_DIR
# PREP1's aged-live container (PostgreSQL, a transactor, this branch's gateway with both pinned options, three read
# permits and the early filter) holds a loader-aged toy; gate.ts drives the card's production cells with the arm's
# pinned windows beside them, then plants wrong values to show the checks catch them.
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
image=${DX_RD3_GATE_IMAGE:-tx2-datomic:dx-prep1-subject-query}
mkdir -p "$out/out" "$out/age1src"
git -C "$repo" archive 5cda4ab204b9736e32960843bee8cbc47d5ca74d -- packages/datomic/gateway/src packages/datomic/src/codec-spec.json \
  lab/experiments/EXP-DX1/age1/src | tar -x -C "$out/age1src"
git -C "$repo" rev-parse HEAD > "$out/source"
name=tx2-dxrd3-saves-gate
docker rm -f "$name" >/dev/null 2>&1
docker run -d --name "$name" --memory 3g -p 127.0.0.1:18605:8080 --entrypoint /bin/bash \
  -e TX2_PINNED_SHORTCUT=1 -e TX2_PINNED_CUT_LOOKUP=1 -e TX2_READ_PERMITS=3 -e TX2_READ_FILTER_EARLY=1 \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$out/age1src:/age:ro" \
  -v "$repo/lab/experiments/EXP-DX1/prep1/aged-live:/gate:ro" -v "$out/out:/out" "$image" /gate/container.sh >/dev/null
(cd "$repo" && node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/rd1/saves-gate/gate.ts "$out/out" \
  http://127.0.0.1:18605) 2>&1 | tee "$out/driver.log"
status=${PIPESTATUS[0]}
docker logs "$name" > "$out/out/container.log" 2>&1
docker rm -f "$name" >/dev/null
rm -rf "$out/age1src"
exit "$status"

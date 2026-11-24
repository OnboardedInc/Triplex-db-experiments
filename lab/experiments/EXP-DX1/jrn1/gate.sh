#!/usr/bin/env bash
# [DX-JRN1] Mac live gate for the bounded journal routes and the field-history page on a loader-aged toy: one lab
# container (PREP1's aged-live layout: PostgreSQL, transactor, this branch's gateway; AGE1's native renders at its load
# pin age the toy), driven by jrn1/gate.ts. One ordinary heavy token, no lease:
#   node lab/bin/heavy.mjs --label DX-JRN1-gate -- bash lab/experiments/EXP-DX1/jrn1/gate.sh OUT ['people perAccount singles saves group run']
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
args=${2:-"50 5 200 1200 8 3000"}
[[ $out == /Users/* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
image=${DX_JRN1_GATE_IMAGE:-tx2-datomic:dx-real2-production}
port=${DX_JRN1_GATE_PORT:-18597}
mkdir -p "$out/out" "$out/age1src"
# AGE1 at its load pin: its transactor functions, codec spec and aging code, nothing from this branch.
git -C "$repo" archive 5cda4ab204b9736e32960843bee8cbc47d5ca74d -- packages/datomic/gateway/src packages/datomic/src/codec-spec.json \
  lab/experiments/EXP-DX1/age1/src | tar -x -C "$out/age1src"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain > "$out/source-status"
name=tx2-dxjrn1-aged
docker rm -f "$name" >/dev/null 2>&1
docker run -d --name "$name" --memory 3g -p 127.0.0.1:$port:8080 --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$out/age1src:/age:ro" \
  -v "$repo/lab/experiments/EXP-DX1/jrn1:/gate:ro" -v "$out/out:/out" "$image" /gate/container.sh >/dev/null
(cd "$repo" && node --import tsx lab/experiments/EXP-DX1/jrn1/gate.ts "$out/out" "http://127.0.0.1:$port" "$args") 2>&1 | tee "$out/driver.log"
status=${PIPESTATUS[0]}
docker logs "$name" > "$out/out/container.log" 2>&1
docker rm -f "$name" >/dev/null
rm -rf "$out/age1src"
exit "$status"

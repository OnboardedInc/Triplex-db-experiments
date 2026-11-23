#!/usr/bin/env bash
# [DX-REAL2] Mac live gate for production-aged: PREP1's aged-live container (PostgreSQL, transactor, this branch's
# gateway; AGE1's own code at its load pin ages the toy), driven by real2/aged-gate.ts. One ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-REAL2-aged-live -- bash lab/experiments/EXP-DX1/real2/aged-gate.sh OUT
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "aged-gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
image=${DX_REAL2_GATE_IMAGE:-tx2-datomic:dx-real2-production}
mkdir -p "$out/out" "$out/age1src"
# AGE1 at its load pin: its transactor functions, codec spec and aging code, nothing from this branch.
git -C "$repo" archive 5cda4ab204b9736e32960843bee8cbc47d5ca74d -- packages/datomic/gateway/src packages/datomic/src/codec-spec.json \
  lab/experiments/EXP-DX1/age1/src | tar -x -C "$out/age1src"
git -C "$repo" rev-parse HEAD > "$out/source"
name=tx2-dxreal2-aged-live
docker rm -f "$name" >/dev/null 2>&1
docker run -d --name "$name" --memory 3g -p 127.0.0.1:18592:8080 --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$out/age1src:/age:ro" \
  -v "$repo/lab/experiments/EXP-DX1/prep1/aged-live:/gate:ro" -v "$out/out:/out" "$image" /gate/container.sh >/dev/null
(cd "$repo" && DX_PREP1_LIBRARY=1 DX_PREP1_CAMPAIGN=rolling DX_REAL2_SET=aged DX_PREP1_AGED=1 \
  node --import tsx lab/experiments/EXP-DX1/real2/aged-gate.ts "$out/out" http://127.0.0.1:18592) 2>&1 | tee "$out/driver.log"
status=${PIPESTATUS[0]}
docker logs "$name" > "$out/out/container.log" 2>&1
docker rm -f "$name" >/dev/null
rm -rf "$out/age1src"
exit "$status"

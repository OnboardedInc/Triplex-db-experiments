#!/usr/bin/env bash
# [DX-RD2] Mac live gate for TX2_PINNED_SHORTCUT under one ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-RD2-shortcut-gate -- bash lab/experiments/EXP-DX1/rd1/shortcut-gate/gate.sh NEW_ABSOLUTE_OUT
set -uo pipefail
out=${1:?absolute new output directory}
[[ $out == /* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
here=$repo/lab/experiments/EXP-DX1/rd1/shortcut-gate
image=${RD2_GATE_IMAGE:-tx2-datomic:1.0.7745-da00}
mkdir -p "$out/out" "$out/age1src"
# AGE1 at its load pin: its transactor functions, codec spec and aging code, nothing from this branch.
git -C "$repo" archive 5cda4ab204b9736e32960843bee8cbc47d5ca74d -- packages/datomic/gateway/src packages/datomic/src/codec-spec.json \
  lab/experiments/EXP-DX1/age1/src | tar -x -C "$out/age1src"
git -C "$repo" rev-parse HEAD > "$out/source"
# [DX-THIN1] Name and ports can be moved so two builders never remove each other's gate container.
name=${RD2_GATE_NAME:-tx2-dxrd2-shortcut-gate} base=${RD2_GATE_PORT:-18595}
[[ $name =~ ^tx2-dx[a-z0-9-]+$ && $base =~ ^1[0-9]{4}$ ]] || exit 2
docker rm -f "$name" >/dev/null 2>&1
docker run -d --name "$name" --memory 6g -p 127.0.0.1:$base:8080 -p 127.0.0.1:$((base+1)):8081 -p 127.0.0.1:$((base+2)):8082 -p 127.0.0.1:$((base+3)):8083 --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$out/age1src:/age:ro" \
  -v "$repo/lab/experiments/EXP-DX1/prep1/aged-live:/aged:ro" -v "$here:/gate:ro" -v "$out/out:/out" "$image" /gate/container.sh >/dev/null
(cd "$repo" && RD2_GATE_OWNER_HEAD=${RD2_GATE_OWNER_HEAD:-1} node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/rd1/shortcut-gate/gate.ts "$out/out" \
  http://127.0.0.1:$base http://127.0.0.1:$base http://127.0.0.1:$((base+1)) http://127.0.0.1:$((base+2)) http://127.0.0.1:$((base+3))) 2>&1 | tee "$out/driver.log"
status=${PIPESTATUS[0]}
docker logs "$name" > "$out/out/container.log" 2>&1
docker rm -f "$name" >/dev/null
rm -rf "$out/age1src"
exit "$status"

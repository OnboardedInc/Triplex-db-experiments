#!/usr/bin/env bash
# [DX-SRV2] Mac toy for the two pinned read options at a pin far behind the head (read-cost.ts), in the shortcut gate's
# container (rd1/shortcut-gate/container.sh, unchanged), under one ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-SRV2-read-cost -- bash lab/experiments/EXP-DX1/srv2/read-cost.sh NEW_ABSOLUTE_OUT
# Environment: SRV2_COST_SAVE_SECONDS (240), SRV2_COST_SAVE_SEATS (16), SRV2_COST_PROBE_READS (300), SRV2_COST_LOAD_SECONDS (20).
# Timings are Mac diagnostics. Container tx2-dxsrv2-read-cost, ports 18695..18698 on 127.0.0.1.
set -uo pipefail
out=${1:?absolute new output directory}
[[ $out == /* && ! -e $out ]] || { echo "read-cost.sh: give a new absolute output directory" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
gate=$repo/lab/experiments/EXP-DX1/rd1/shortcut-gate
mkdir -p "$out/out" "$out/age1src"
. "$repo/lab/bin/gate-image.sh"
image=$(gate_image "${SRV2_GATE_IMAGE:-tx2-datomic:1.0.7745-da00}" "$out/image.json") || exit 2
git -C "$repo" archive 5cda4ab204b9736e32960843bee8cbc47d5ca74d -- packages/datomic/gateway/src packages/datomic/src/codec-spec.json \
  lab/experiments/EXP-DX1/age1/src | tar -x -C "$out/age1src"
git -C "$repo" rev-parse HEAD > "$out/source"
name=tx2-dxsrv2-read-cost base=18695
docker rm -f "$name" >/dev/null 2>&1
docker run -d --name "$name" --label tx2.holder=DX-SRV2 --memory 6g -p 127.0.0.1:$base:8080 -p 127.0.0.1:$((base+1)):8081 -p 127.0.0.1:$((base+2)):8082 -p 127.0.0.1:$((base+3)):8083 --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$out/age1src:/age:ro" \
  -v "$repo/lab/experiments/EXP-DX1/prep1/aged-live:/aged:ro" -v "$gate:/gate:ro" -v "$out/out:/out" "$image" /gate/container.sh >/dev/null
gate_image_ran "$name" "$image" "$out/image.json" || { docker rm -f "$name" >/dev/null; exit 2; }
(cd "$repo" && node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/srv2/read-cost.ts "$out/out" \
  http://127.0.0.1:$base http://127.0.0.1:$base http://127.0.0.1:$((base+1)) http://127.0.0.1:$((base+2)) http://127.0.0.1:$((base+3))) 2>&1 | tee "$out/driver.log"
status=${PIPESTATUS[0]}
docker logs "$name" > "$out/out/container.log" 2>&1
docker rm -f "$name" >/dev/null
rm -rf "$out/age1src"
exit "$status"

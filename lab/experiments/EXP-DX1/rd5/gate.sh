#!/usr/bin/env bash
# [DX-RD5] Mac gate for the uncached pinned read, under one ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-RD5-gate -- bash lab/experiments/EXP-DX1/rd5/gate.sh NEW_ABSOLUTE_OUT
# Seeds a deep toy, compares the readers with the options off and on, then runs the four probes. Diagnostic times.
set -uo pipefail
out=${1:?absolute new output directory}
[[ $out == /* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
here=$repo/lab/experiments/EXP-DX1/rd5
name=${RD5_GATE_NAME:-tx2-dxrd5-uncached-gate} base=${RD5_GATE_PORT:-18641}
[[ $name =~ ^tx2-dx[a-z0-9-]+$ && $base =~ ^1[0-9]{4}$ ]] || exit 2
mkdir -p "$out/out"
# [DX-INT4] Start from one image ID, never a fixed shared tag another builder can retag (lab/bin/gate-image.sh).
. "$repo/lab/bin/gate-image.sh"
image=$(gate_image "${RD5_GATE_IMAGE:-tx2-datomic:1.0.7745-da00}" "$out/image.json") || exit 2
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway/src lab/experiments/EXP-DX1/rd5 > "$out/source-dirty"
docker rm -f "$name" >/dev/null 2>&1
# [DX-INT4] RD5_TREATMENT_ENV: more gateway settings for the two treatment readers (8082, 8083), for example the
# waiting-read bound; empty (the default) leaves them as before.
docker run -d --name "$name" --memory 6g --cpus 4 -e "RD5_TREATMENT_ENV=${RD5_TREATMENT_ENV:-}" -p 127.0.0.1:$base:8080 -p 127.0.0.1:$((base+1)):8081 -p 127.0.0.1:$((base+2)):8082 \
  -p 127.0.0.1:$((base+3)):8083 --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$here:/gate:ro" -v "$out/out:/out" "$image" /gate/container.sh >/dev/null
gate_image_ran "$name" "$image" "$out/image.json" || { docker rm -f "$name" >/dev/null; exit 2; }
(cd "$repo" && node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/rd5/gate.ts "$out/out" \
  http://127.0.0.1:$base http://127.0.0.1:$((base+1)) http://127.0.0.1:$((base+2)) http://127.0.0.1:$((base+3))) 2>&1 | tee "$out/driver.log"
status=${PIPESTATUS[0]}
if [[ -f $out/out/compare-done ]]; then
  for ((i=0; i<1800; i++)); do [[ -f $out/out/finished ]] && break; docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null | grep -q true || break; sleep 1; done
fi
docker logs "$name" > "$out/out/container.log" 2>&1
docker rm -f "$name" >/dev/null
[[ -f $out/out/finished ]] || status=1
exit "$status"

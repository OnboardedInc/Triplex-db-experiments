#!/usr/bin/env bash
# [DX-RD6] Mixed fleet on the Mac toy (rd6/fleet.clj inside rd6/fleet-container.sh), one ordinary heavy token:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-RD6-fleet -- bash lab/experiments/EXP-DX1/rd6/fleet.sh NEW_ABSOLUTE_OUT
# RD6_PHASES (default per-subject,grouped,append) and RD6_SECONDS (default 90) per phase. Correctness only.
set -uo pipefail
out=${1:?new absolute output directory}
[[ $out == /* && ! -e $out ]] || { echo "fleet.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
image=${DX_RD6_STACK_IMAGE:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
mkdir -p "$out/out"
docker image inspect -f '{{.Id}}' "$image" > "$out/image" || exit 2
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic > "$out/dirty"
[[ -s $out/dirty ]] && { echo "fleet.sh: the gateway sources differ from HEAD" >&2; exit 2; }
mkdir -p "$out/src" "$out/exp"
cp -R "$repo/packages/datomic/gateway/src/." "$out/src/"; cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
cp -R "$repo/lab/experiments/EXP-DX1/wfix1" "$repo/lab/experiments/EXP-DX1/w2" "$repo/lab/experiments/EXP-DX1/s5" "$repo/lab/experiments/EXP-DX1/rd6" "$repo/lab/experiments/EXP-DX1/rd7" "$out/exp/"
name=tx2-dxrd6-fleet-$$
echo "$(date '+%F %T %Z') start $name" >> "$out/runs.log"
docker run --name "$name" --label dx-rd6=fleet --pull never --memory 6g --cpus 4 \
  -e RD6_PHASES="${RD6_PHASES:-per-subject,grouped,append}" -e RD6_SECONDS="${RD6_SECONDS:-90}" \
  -e RD6_DRIVER="${RD6_DRIVER:-http}" -e RD6_READER_MODE="${RD6_READER_MODE:-explicit}" \
  -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/gateway/codec-spec.json:ro" -v "$out/exp:/exp:ro" \
  -v "$out/out:/out" --entrypoint /bin/bash "$image" /exp/rd6/fleet-container.sh
status=$?
ran=$(docker container inspect -f '{{.Image}}' "$name")
echo "ran $ran" >> "$out/image"
docker logs "$name" > "$out/out/container.log" 2>&1
docker rm "$name" >/dev/null
echo "$(date '+%F %T %Z') end $name status $status" >> "$out/runs.log"
rm -rf "$out/src" "$out/exp" "$out/out/erasure"
grep -E '^DX-RD6_FLEET' "$out/out/driver.log" | cut -c1-600
exit "$status"

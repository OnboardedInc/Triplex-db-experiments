#!/usr/bin/env bash
# [DX-S1] Mac toy run of the save-size ladder (diagnostic timings), one ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-S1-ladder -- bash lab/experiments/EXP-DX1/s1/ladder.sh OUT
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "ladder.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
image=${DX_S1_IMAGE:-tx2-datomic:dx-real2-production}
mkdir -p "$out"
git -C "$repo" rev-parse HEAD > "$out/source"
name=tx2-dxs1-ladder
docker rm -f "$name" >/dev/null 2>&1
docker run --name "$name" --memory 4g --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
  -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
  -v "$repo/lab/experiments/EXP-DX1:/exp:ro" -v "$out:/out" "$image" /exp/s1/ladder-run.sh > "$out/ladder.log" 2>&1
status=$?
docker rm -f "$name" >/dev/null 2>&1
grep '^DX-S1_COMMIT ' "$out/ladder.log" | sed 's/^DX-S1_COMMIT //' > "$out/commits.jsonl"
exit "$status"

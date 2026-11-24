#!/usr/bin/env bash
# [DX-S1] Mac correctness suites (s1/suites-run.sh), one ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-S1-suites -- bash lab/experiments/EXP-DX1/s1/suites.sh OUT
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "suites.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
image=${DX_S1_IMAGE:-tx2-datomic:dx-real2-production}
mkdir -p "$out"
git -C "$repo" rev-parse HEAD > "$out/source"
name=tx2-dxs1-suites
docker rm -f "$name" >/dev/null 2>&1
docker run --name "$name" --memory 4g --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
  -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
  -v "$repo/lab/experiments/EXP-DX1:/exp:ro" -v "$out:/out" "$image" /exp/s1/suites-run.sh > "$out/suites.log" 2>&1
status=$?
docker rm -f "$name" >/dev/null 2>&1
grep -E '^DX-S1_(SUITE|WIDE_GATE)' "$out/suites.log"
exit "$status"

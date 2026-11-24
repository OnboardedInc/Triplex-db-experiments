#!/usr/bin/env bash
# [DX-JRN1] The SDK's live suite (DATOMIC_INTEGRATION=1, packages/datomic) against this branch's gateway with its
# defaults, twice: as it stands, and with every SDK adapter on bounded journal pages (TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1)
# against a gateway whose examine bound is 2 entries (TX2_JOURNAL_EXAMINE_ENTRIES=2), so cursors are followed constantly.
# One ordinary heavy token per arm:
#   node lab/bin/heavy.mjs --label DX-JRN1-suite -- bash lab/experiments/EXP-DX1/jrn1/suite.sh OUT ARM   (ARM: plain | bounded)
set -uo pipefail
out=${1:?absolute new output directory under /Users}; arm=${2:?plain or bounded}
[[ $out == /Users/* && ! -e $out ]] || { echo "suite.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
image=${DX_JRN1_GATE_IMAGE:-tx2-datomic:dx-real2-production}
port=${DX_JRN1_GATE_PORT:-18598}
mkdir -p "$out/out"; touch "$out/out/plain"
git -C "$repo" rev-parse HEAD > "$out/source"; git -C "$repo" status --porcelain > "$out/source-status"
name=tx2-dxjrn1-suite
bound=4096; sdk=0
[[ $arm == bounded ]] && { bound=2; sdk=1; }
docker rm -f "$name" >/dev/null 2>&1
docker run -d --name "$name" --memory 3g -p 127.0.0.1:$port:8080 -e TX2_JOURNAL_EXAMINE_ENTRIES=$bound --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
  -v "$repo/lab/experiments/EXP-DX1/jrn1:/gate:ro" -v "$out/out:/out" "$image" /gate/container.sh >/dev/null
for ((i=0; i<600 && ! -f $out/out/ready; i++)); do sleep .5; done
(cd "$repo/packages/datomic" && DATOMIC_INTEGRATION=1 DATOMIC_GATEWAY_URL=http://127.0.0.1:$port TRIPLEX_DATOMIC_BOUNDED_JOURNAL=$sdk \
  npx vitest run --reporter verbose 2>&1) > "$out/suite.log"
status=$?
touch "$out/out/finished"
curl -s http://127.0.0.1:$port/v2/admin/scan-stats > "$out/scan-stats.json"
docker logs "$name" > "$out/out/container.log" 2>&1
docker rm -f "$name" >/dev/null
grep -E "Test Files|Tests " "$out/suite.log"
exit "$status"

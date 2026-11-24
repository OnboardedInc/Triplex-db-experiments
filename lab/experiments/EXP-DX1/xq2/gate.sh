#!/usr/bin/env bash
# [DX-XQ2] Mac native gate for the attribute index spike. One ordinary heavy token per run:
#   node lab/bin/heavy.mjs --label DX-XQ2-gate -- bash lab/experiments/EXP-DX1/xq2/gate.sh NEW_ABSOLUTE_DIR
# Uses REAL2's production image (PostgreSQL, Node, Datomic) with this branch's gateway source mounted read-only.
# XQ2_PHASES ("cost gate edge"), XQ2_ARMS ("n0 n1 n5 n20"), XQ2_COST_SUBJECTS, XQ2_GATE_SUBJECTS, XQ2_EDGE_SUBJECTS size it.
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
image=${DX_XQ2_IMAGE:-tx2-datomic:dx-real2-production}
mkdir -p "$out/out" "$out/stage/gateway" "$out/stage/xq2/xq2"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/xq2 > "$out/dirty"
x=$repo/lab/experiments/EXP-DX1
cp -R "$repo/packages/datomic/gateway/src" "$out/stage/gateway/src"
cp "$x"/xq2/*.clj "$x"/xq2/*.sh "$out/stage/xq2/xq2/"
name=tx2-dxxq2-gate
docker rm -f "$name" >/dev/null 2>&1
docker run --name "$name" --memory 4g --cpus 2 --entrypoint /bin/bash \
  -e "XQ2_PHASES=${XQ2_PHASES:-cost gate edge}" -e "XQ2_ARMS=${XQ2_ARMS:-n0 n1 n5 n20}" -e "XQ2_RUN=$(basename "$out")" \
  -e "XQ2_COST_SUBJECTS=${XQ2_COST_SUBJECTS:-2000}" -e "XQ2_FIELDS=${XQ2_FIELDS:-160}" -e "XQ2_COST_EACH=${XQ2_COST_EACH:-200}" \
  -e "XQ2_GATE_SUBJECTS=${XQ2_GATE_SUBJECTS:-20000}" -e "XQ2_EDGE_SUBJECTS=${XQ2_EDGE_SUBJECTS:-100000}" \
  -v "$out/stage/gateway/src:/opt/gateway/src:ro" -v "$out/stage/xq2:/xq2:ro" \
  -v "$out/out:/out" "$image" /xq2/xq2/container.sh > "$out/container.log" 2>&1
status=$?
docker rm -f "$name" >/dev/null 2>&1
rm -rf "$out/stage/gateway"
grep -E '^XQ2_|FAIL in|ERROR in|Exception|expected:|actual:' "$out/container.log" | cut -c1-4000
exit "$status"

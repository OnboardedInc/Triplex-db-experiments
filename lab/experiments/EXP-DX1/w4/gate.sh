#!/usr/bin/env bash
# [DX-W4] Mac native gate for the per-subject writer's hints with ordered IDs. One ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-W4-gate -- bash lab/experiments/EXP-DX1/w4/gate.sh NEW_ABSOLUTE_DIR
# Uses REAL2's production image (PostgreSQL, Node, Datomic) with this branch's gateway source mounted read-only.
# W4_PHASES (default "seed probe off late early compare tests") picks phases; W4_SUBJECTS / W4_EDITS size the toy.
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
image=${DX_W4_IMAGE:-tx2-datomic:dx-real2-production}
mkdir -p "$out/out" "$out/stage/gateway" "$out/stage/w4/w4" "$out/stage/w4/wfix1" "$out/stage/w4/prep1"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/w4 > "$out/dirty"
# A private copy of everything the container runs, so later edits in the worktree cannot reach a running gate.
x=$repo/lab/experiments/EXP-DX1
cp -R "$repo/packages/datomic/gateway/src" "$out/stage/gateway/src"
cp "$x"/w4/*.clj "$x"/w4/*.sh "$out/stage/w4/w4/"
cp "$x/wfix1/regression.clj" "$out/stage/w4/wfix1/"
cp "$x/prep1/subject_gate.clj" "$x/prep1/subject_conflicts.clj" "$out/stage/w4/prep1/"
name=tx2-dxw4-gate
docker rm -f "$name" >/dev/null 2>&1
docker run --name "$name" --memory 3g --cpus 2 --entrypoint /bin/bash \
  -e "W4_SUBJECTS=${W4_SUBJECTS:-2000}" -e "W4_EDITS=${W4_EDITS:-200}" -e "W4_IN_FLIGHT=${W4_IN_FLIGHT:-8}" \
  -e "W4_TX_CACHE=${W4_TX_CACHE:-128m}" -e "W4_SEED_BATCH=${W4_SEED_BATCH:-1}" \
  -e "W4_PHASES=${W4_PHASES:-seed probe off late early compare tests}" \
  -v "$out/stage/gateway/src:/opt/gateway/src:ro" -v "$out/stage/w4:/w4:ro" \
  -v "$out/out:/out" "$image" /w4/w4/container.sh > "$out/container.log" 2>&1
status=$?
docker rm -f "$name" >/dev/null 2>&1
rm -rf "$out/stage/gateway"
grep -E '^W4_|FAIL in|ERROR in|expected:|actual:' "$out/container.log" | cut -c1-3000
exit "$status"

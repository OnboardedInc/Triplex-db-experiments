#!/usr/bin/env bash
# [DX-XQ4] Mac gate for the commit-time index. One ordinary heavy token per run (never a measurement lease):
#   node lab/bin/heavy.mjs --label DX-XQ4-gate -- bash lab/experiments/EXP-DX1/xq4/gate.sh NEW_ABSOLUTE_DIR "world replay"
# Uses REAL2's production image (PostgreSQL, Node, Datomic) with a gateway source mounted read-only:
# this branch's by default, or XQ4_SRC (for G8's log hash on the base gateway).
# Phases: g8log g8logon g3 pinned g6 g7 world replay. XQ4_SUBJECTS (per account), XQ4_MIXED, XQ4_QUESTIONS size it.
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
phases=${2:-"g3 g6 world replay"}
[[ $out == /Users/* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
# The lab VM's Docker endpoint comes from the environment (never written here).
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM Docker endpoint}"
repo=$(git rev-parse --show-toplevel)
image=${DX_XQ4_IMAGE:-tx2-datomic:dx-real2-production}
# [DX-XQ10] Shared tags are rebuilt by other builders' gates: start by the image ID resolved now, record it, and check
# that the container ran it; the gateway code is the mounted tree below, whose hash the container prints.
image=$(docker image inspect --format '{{.Id}}' "$image") || exit 1
src=${XQ4_SRC:-$repo/packages/datomic/gateway/src}
mkdir -p "$out/out" "$out/stage/gateway" "$out/stage/xq4/xq4"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/xq4 > "$out/dirty"
cp -R "$src" "$out/stage/gateway/src"
(cd "$out/stage/gateway/src" && find . -type f -name '*.clj' | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256 | cut -d' ' -f1) > "$out/source-tree-sha256"
cp "$repo"/lab/experiments/EXP-DX1/xq4/gate.clj "$repo"/lab/experiments/EXP-DX1/xq4/container.sh "$out/stage/xq4/xq4/"
# [DX-XQ10] The agreement gate's phases, staged only when asked for (phase "agree").
if [[ " $phases " == *" agree "* ]]; then cp "$repo"/lab/experiments/EXP-DX1/xq10/agree.clj "$out/stage/xq4/xq4/"; fi
name=tx2-dxxq4-gate-$$
docker rm -f "$name" >/dev/null 2>&1
docker run --name "$name" --memory "${XQ4_CONTAINER_MEMORY:-4g}" --cpus 2 --entrypoint /bin/bash \
  -e "XQ4_PHASES=$phases" -e "XQ4_RUN=$(basename "$out")" \
  -e "XQ4_SUBJECTS=${XQ4_SUBJECTS:-6667}" -e "XQ4_MIXED=${XQ4_MIXED:-3000}" -e "XQ4_QUESTIONS=${XQ4_QUESTIONS:-25}" \
  -e "XQ4_G6_SUBJECTS=${XQ4_G6_SUBJECTS:-1500}" -e "XQ4_G6_PAD=${XQ4_G6_PAD:-0}" -e "XQ4_COST_PER=${XQ4_COST_PER:-100}" -e "XQ4_COST_STRIDE=${XQ4_COST_STRIDE:-1}" -e "XQ4_G3_SEALED=${XQ4_G3_SEALED:-0}" \
  -e "XQ4_QUESTION_SEED=${XQ4_QUESTION_SEED:-20261124}" \
  -e "XQ4_HINTS=${XQ4_HINTS:-0}" -e "XQ4_SWEEP_SHAPES=${XQ4_SWEEP_SHAPES:-}" -e "XQ4_LIST_QUEUE_MS=${XQ4_LIST_QUEUE_MS:-}" -e "XQ4_INDEX_HINTS=${XQ4_INDEX_HINTS:-}" -e "XQ10_WORLD_QUESTIONS=${XQ10_WORLD_QUESTIONS:-12}" -e "XQ4_TX_CACHE=${XQ4_TX_CACHE:-128m}" -e "XQ4_GATE_JAVA_OPTS=${XQ4_GATE_JAVA_OPTS:-}" -e "XQ4_SWEEP=${XQ4_SWEEP:-0}" -e "XQ4_SWEEP_QUESTIONS=${XQ4_SWEEP_QUESTIONS:-8}" \
  -v "$out/stage/gateway/src:/opt/gateway/src:ro" -v "$out/stage/xq4:/xq4:ro" -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
  -v "$out/out:/out" "$image" /xq4/xq4/container.sh > "$out/container.log" 2>&1
status=$?
docker inspect --format '{{.Image}}' "$name" > "$out/container-image" 2>/dev/null
echo "$image" > "$out/image-id"
ran=$(cat "$out/container-image" 2>/dev/null) inside=$(grep '^XQ10_SOURCE_TREE ' "$out/container.log" | cut -d' ' -f2)
if [[ $ran == "$image" && $inside == "$(cat "$out/source-tree-sha256")" ]]; then echo "XQ10_IMAGE_CHECK pass image=$image source=$inside" | tee "$out/image-check"
else echo "XQ10_IMAGE_CHECK FAIL pinned=$image ran=$ran source=$inside staged=$(cat "$out/source-tree-sha256")" | tee "$out/image-check"; status=1; fi
docker rm -f "$name" >/dev/null 2>&1
rm -rf "$out/stage/gateway"
grep -E '^XQ4_|FAIL in|ERROR in|Exception|expected:|actual:' "$out/container.log" | cut -c1-3000
exit "$status"

#!/usr/bin/env bash
# [DX-W3] Mac native gate for general-writer hints, read placement and refusals. One ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-W3-gate -- bash lab/experiments/EXP-DX1/w3/gate.sh NEW_ABSOLUTE_DIR
# Uses REAL2's production image (PostgreSQL, Node, Datomic) with this branch's gateway source mounted read-only.
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
image=${DX_W3_IMAGE:-tx2-datomic:dx-real2-production}
mkdir -p "$out/out" "$out/stage/gateway" "$out/stage/w3/w3" "$out/stage/w3/wfix1" "$out/stage/w3/prep1"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/w3 > "$out/dirty"
# A private copy of everything the container runs, so later edits in the worktree cannot reach a running gate.
x=$repo/lab/experiments/EXP-DX1
cp -R "$repo/packages/datomic/gateway/src" "$out/stage/gateway/src"
cp "$x"/w3/*.clj "$x"/w3/*.sh "$x"/w3/*.mjs "$out/stage/w3/w3/"
cp "$x/wfix1/regression.clj" "$out/stage/w3/wfix1/"
cp "$x/prep1/subject_gate.clj" "$x/prep1/subject_conflicts.clj" "$out/stage/w3/prep1/"
name=tx2-dxw3-${W3_MODE:-hints}
docker rm -f "$name" >/dev/null 2>&1
docker run --name "$name" --memory 3g --cpus 2 --entrypoint /bin/bash \
  -e "W3_SUBJECTS=${W3_SUBJECTS:-1200}" -e "W3_EDITS=${W3_EDITS:-120}" -e "W3_IN_FLIGHT=${W3_IN_FLIGHT:-8}" \
  -e "W3_TX_CACHE=${W3_TX_CACHE:-128m}" -e "W3_MODE=${W3_MODE:-hints}" -e "W3_RQ_SUBJECTS=${W3_RQ_SUBJECTS:-400}" \
  -e "W3_HTTP_THREADS=${W3_HTTP_THREADS:-16}" -e "W3_READ_WAIT_LIMIT=${W3_READ_WAIT_LIMIT:-4}" \
  -e "W3_FLOOD_SECONDS=${W3_FLOOD_SECONDS:-8}" -e "W3_FLOOD_CLIENTS=${W3_FLOOD_CLIENTS:-64}" \
  -e "W3_SEED_BATCH=${W3_SEED_BATCH:-1}" \
  -v "$out/stage/gateway/src:/opt/gateway/src:ro" -v "$out/stage/w3:/w3:ro" \
  -v "$out/out:/out" "$image" /w3/w3/container.sh > "$out/container.log" 2>&1
status=$?
docker rm -f "$name" >/dev/null 2>&1
rm -rf "$out/stage/gateway"
grep -E '^W3_|FAIL in|ERROR in' "$out/container.log" | cut -c1-2000
exit "$status"

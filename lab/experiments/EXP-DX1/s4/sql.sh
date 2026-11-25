#!/usr/bin/env bash
# [DX-S4] (copied from s3/sql.sh) Counted work of each kind of real save (s4/sql-run.sh) in the lab VM, one ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-S4-sql -- bash lab/experiments/EXP-DX1/s4/sql.sh OUT
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "sql.sh: give a new absolute output directory under /Users" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
image=${DX_S4_IMAGE:-tx2-datomic:dx-s4-runtime}
image_id=$(docker image inspect -f '{{.Id}}' "$image")
mkdir -p "$out"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --short > "$out/dirty"
name=tx2-dxs4-sql-$$
docker rm -f "$name" >/dev/null 2>&1
echo "DX-S4_IMAGE $image $image_id" | tee "$out/image"
docker run --rm --name "$name" --label dx-s4=sql --pull never --memory 3g --entrypoint /bin/bash -e DX_S4_OBJECT_CACHE -e DX_S4_INDEX_THRESHOLD \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
  -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
  -v "$repo/lab/experiments/EXP-DX1:/exp:ro" "$image_id" /exp/s4/sql-run.sh > "$out/sql.log" 2>&1
status=$?
grep -E '^DX-S4_(SQL|SEED|WAL|VERIFY|DONE)' "$out/sql.log"
echo "DX-S4_SQL_EXIT $status"
exit "$status"

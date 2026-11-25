#!/usr/bin/env bash
# [DX-S3] Counted work of a two-owner form save (s3/sql-run.sh) in the lab VM, one ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-S3-sql -- bash lab/experiments/EXP-DX1/s3/sql.sh OUT
set -uo pipefail
out=${1:?absolute new output directory under /Users (the lab VM shares only that tree)}
[[ $out == /Users/* && ! -e $out ]] || { echo "sql.sh: give a new absolute output directory under /Users" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
image=${DX_S3_IMAGE:-tx2-datomic:dx-real2-production}
mkdir -p "$out"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --short > "$out/dirty"
name=tx2-dxs3-sql-$$
docker rm -f "$name" >/dev/null 2>&1
docker run --rm --name "$name" --pull never --memory 3g --entrypoint /bin/bash \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
  -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
  -v "$repo/lab/experiments/EXP-DX1:/exp:ro" "$image" /exp/s3/sql-run.sh > "$out/sql.log" 2>&1
status=$?
grep -E '^DX-S3_(SQL|SEED|WAL|VERIFY|DONE)' "$out/sql.log"
echo "DX-S3_SQL_EXIT $status"
exit "$status"

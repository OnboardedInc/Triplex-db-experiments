#!/usr/bin/env bash
# [DX-RD6, second review] rd6/restore-container.sh in one lab container, gateway sources of this checkout (or RD6_SRC).
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-RD6-restore -- bash lab/experiments/EXP-DX1/rd6/restore-run.sh OUT
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new absolute output directory}
[[ $out == /* && ! -e $out ]] || { echo "restore-run.sh: give a new absolute output directory" >&2; exit 2; }
here=$(cd "$(dirname "$0")" && pwd); repo=$(git -C "$here" rev-parse --show-toplevel); src=${RD6_SRC:-$repo}
image=${DX_RD6_STACK_IMAGE:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
mkdir -p "$out/out" "$out/src" "$out/exp"
docker image inspect -f '{{.Id}}' "$image" > "$out/image" || exit 2
{ echo "harness $(git -C "$repo" rev-parse HEAD)"; echo "sources $(git -C "$src" rev-parse HEAD)"; } > "$out/source"
[[ -z $(git -C "$src" status --porcelain -- packages/datomic) ]] || { echo "restore-run.sh: dirty sources" >&2; exit 2; }
cp -R "$src/packages/datomic/gateway/src/." "$out/src/"; cp "$src/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
for d in wfix1 w2 s5 rd6 rd7; do cp -R "$repo/lab/experiments/EXP-DX1/$d" "$out/exp/"; done
name=tx2-dxrd6-restore-$$
echo "$(date '+%F %T %Z') start $name" >> "$out/runs.log"
docker run --rm --name "$name" --label dx-rd6=restore --pull never --memory 4g --cpus 2 -e TRIPLEX_TRACE_LEVEL=off \
  -e TX2_SUBJECT_SAVE=0 -e TX2_GROUP_COMMIT=1 -e TX2_GROUP_STAGE_CLOCK=1 -e TX2_GROUP_FAST_REPLY=1 -e TX2_GROUP_REUSE_PREPARED=1 \
  -e TX2_LIVE_PRIORITY=1 -e TX2_GROUP_MAX_MEMBERS=32 -e TX2_SMALL_ROWS=1 -e TX2_SAVE_LEDGER=1 -e TX2_PREDECESSOR_LOOKUP=1 \
  -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/gateway/codec-spec.json:ro" -v "$out/exp:/exp:ro" -v "$out/out:/out" \
  --entrypoint /bin/bash "$image" /exp/rd6/restore-container.sh > "$out/container.log" 2>&1
status=$?
echo "$(date '+%F %T %Z') end $name status $status" >> "$out/runs.log"
rm -rf "$out/src" "$out/exp"
grep -h "^DX-RD6R2" "$out/container.log" | cut -c1-600
exit $status

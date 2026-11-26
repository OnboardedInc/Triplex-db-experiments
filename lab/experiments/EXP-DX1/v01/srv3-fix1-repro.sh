#!/usr/bin/env bash
# [DX-SRV3-fix1] The reproduction of the scorecard's stop at 1 billion (cell p6-50-loaded) on the Mac: one in-memory write
# gateway with the run's writer options (TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1, the per-subject
# writer with numeric owners and ordered IDs, predecessor lookup on), this checkout's gateway sources mounted read-only,
# then v01/srv3-fix1-repro.ts. Correctness only; one ordinary heavy token around the whole run:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-SRV3-fix1 -- bash lab/experiments/EXP-DX1/v01/srv3-fix1-repro.sh NEW_OUT_DIR [facts]
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
export DOCKER_HOST
out=${1:?new output directory}
facts=${2:-80}
[[ ! -e $out ]] || { echo "srv3-fix1-repro.sh: $out exists" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --short > "$out/dirty"
image=${DX_S2_IMAGE:-tx2-datomic:dx-real2-production}
name=tx2-dxsrv3fix1-$$ port=18891
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
docker run -d --pull never --name "$name" --label dx-srv3-fix1=repro --memory 2g --memory-swap 2g -p "127.0.0.1:$port:8080" \
  -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
  -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
  -e 'DATOMIC_URI_TEMPLATE=datomic:mem://{db}' -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
  -e 'DATOMIC_JAVA_OPTS=-Xms128m -Xmx1200m -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json' \
  -e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e TX2_SUBJECT_PREFETCH=0 \
  -e TX2_SUBJECT_WIDE=1 -e TX2_SUBJECT_HINTS=1 -e TX2_GENERAL_PREFETCH=1 -e TX2_PREDECESSOR_LOOKUP=1 \
  -e TX2_GROUP_COMMIT=0 -e TX2_LIVE_PRIORITY=0 -e TX2_LEAN_NATIVE_QUERY=1 -e TX2_LEAN_NATIVE_LOG=1 -e TRIPLEX_TRACE_LEVEL=off \
  --entrypoint /opt/datomic/bin/run "$image" -m triplex.gateway.main > "$out/container" || exit 1
docker image inspect -f '{{.Id}}' "$image" > "$out/image"
for ((i = 0; i < 240; i++)); do
  node -e "fetch('http://127.0.0.1:$port/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" && break
  sleep 0.5
done
(cd "$repo" && node --no-warnings --experimental-transform-types "$here/srv3-fix1-repro.ts" "http://127.0.0.1:$port" "$out/result.json" "$facts") > "$out/run.log" 2>&1
status=$?
docker logs "$name" > "$out/gateway.log" 2>&1
grep -E '^SRV3_FIX1_' "$out/run.log" | cut -c1-1200
echo "SRV3_FIX1_EXIT $status"
exit $status

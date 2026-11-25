#!/usr/bin/env bash
# [DX-ERA5] The derived routes' cost (era5/cost5.clj) with the file authority or the PostgreSQL authority: one container
# from the pinned runtime image (by ID), in-memory Datomic, every option on; for `pg` a PostgreSQL container of its own
# (postgres image by ID) on a network of its own, a throwaway password and wrapping key made here and never written to
# disk. Times are diagnostic. One ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA5-cost -- \
#     bash lab/experiments/EXP-DX1/era5/cost.sh NEW_ABSOLUTE_DIR file|pg [MAIN]
# MAIN: era5-cost (default) or era5-pending-pg (era5/pending5.clj; needs pg; shred grace ERA5_GRACE_MS, default 4000).
set -uo pipefail
out=${1:?absolute new output directory}; authority=${2:?file or pg}; main=${3:-era5-cost}
[[ $main == era5-cost || $main == era5-pending-pg ]] || exit 2
grace=0
[[ $main == era5-pending-pg ]] && grace=${ERA5_GRACE_MS:-4000}
[[ $out == /* && ! -e $out ]] || { echo "cost.sh: give a new absolute output directory" >&2; exit 2; }
[[ $authority == file || $authority == pg ]] || exit 2
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/src" "$out/lab"
git -C "$repo" rev-parse HEAD > "$out/source"
cp -R "$repo/packages/datomic/gateway/src/." "$out/src/"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
cp "$x/wfix1/regression.clj" "$x/era2/gate.clj" "$x/era3/attack.clj" "$x/act9/tickets.clj" "$x/era4/races.clj" "$x/era5/attack5.clj" "$x/era5/cost5.clj" "$x/era5/pending5.clj" "$out/lab/"
image=${DX_ERA5_RUNTIME_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
pgimage=${DX_ERA5_PG_ID:-sha256:526f86d93c6ea08fd3f1fe5605650cacc781b2c6013169a0ad8f42c7d3d84f32}
for i in "$image" "$pgimage"; do
  [[ $(docker image inspect --format '{{.Id}}' "$i") == "$i" ]] || { echo "cost.sh: image $i not present" >&2; exit 2; }
done
name="tx2-dxera5-cost-$$-$authority"; net="tx2-dxera5-net-$$"; pg="tx2-dxera5-pg-$$"
env=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e TX2_REMOVAL_PER_ACCOUNT=1
     -e TX2_REMOVAL_SUBJECT_CHECK=1 -e TX2_ACCOUNT_TICKETS=1 -e ACT9_ARM=after -e TX2_DERIVED_SEAL=1 -e ERA4_ARM=on
     -e TRIPLEX_ERASURE_DIRECTORY=/tmp/era5-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
     -e "TRIPLEX_ERASURE_SHRED_GRACE_MS=$grace" -e DF01_RECORDED_PAGE=/tmp/recorded-page.json)
cleanup() {
  docker rm -f "$name" > /dev/null 2>&1 || true
  docker rm -f "$pg" > /dev/null 2>&1 || true
  docker network rm "$net" > /dev/null 2>&1 || true
  rm -rf "$out/src"
}
trap cleanup EXIT
netargs=()
if [[ $authority == pg ]]; then
  password=$(openssl rand -hex 16)
  docker network create "$net" > /dev/null || exit 1
  docker run -d --pull never --name "$pg" --network "$net" -e "POSTGRES_PASSWORD=$password" --memory 1g "$pgimage" > /dev/null || exit 1
  docker inspect --format '{{.Image}}' "$pg" > "$out/pg-image-ran"
  for i in $(seq 1 60); do docker exec "$pg" pg_isready -U postgres > /dev/null 2>&1 && break; sleep 1; done
  sleep 2
  env+=(-e "TRIPLEX_ERASURE_JDBC=jdbc:postgresql://$pg:5432/postgres?user=postgres&password=$password"
        -e "TRIPLEX_ERASURE_WRAPPING_KEY=$(openssl rand -base64 32)")
  netargs=(--network "$net")
fi
printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/tickets.clj") (load-file "/lab/races.clj") (load-file "/lab/attack5.clj") (load-file "/lab/cost5.clj") (load-file "/lab/pending5.clj") '"($main/main)" > "$out/run.clj"
started=$(date +%s)
docker run -d --pull never --name "$name" ${netargs[@]+"${netargs[@]}"} --memory 3g --cpus 2 \
  -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" \
  -v "$out/lab:/lab:ro" -v "$out/run.clj:/opt/run.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
  'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' > "$out/container" || exit 1
docker inspect --format '{{.Image}}' "$name" > "$out/image-ran"
status=$(docker wait "$name")
# The environment holds the throwaway password and wrapping key: keep only the log.
docker logs "$name" > "$out/run.log" 2>&1
echo "$(( $(date +%s) - started ))" > "$out/seconds"
[[ $(cat "$out/image-ran") == "$image" ]] || { echo "cost.sh: the container ran $(cat "$out/image-ran"), not $image" >&2; status=3; }
grep -E "^ERA5_(COST|SUMMARY|CASE|VIOLATIONS)|ERA3_VIOLATION|Exception in|CompilerException|Syntax error" "$out/run.log" | cut -c1-2500 | tail -20
exit "$status"

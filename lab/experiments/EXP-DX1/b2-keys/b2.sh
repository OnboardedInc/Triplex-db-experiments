#!/usr/bin/env bash
# [DX-B2] B2 (one pending removal stops every key deletion) in process, b2-keys/b2.clj, on any gateway source. Copied from
# DX-ERA2's era2/b2.sh; on this branch only the mode `off` (every option off, today's database-wide rule) applies:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-B2-b2 -- \
#     bash lab/experiments/EXP-DX1/b2-keys/b2.sh NEW_ABSOLUTE_DIR [REF] [MODES]
# REF: a commit whose gateway source is tested (default: this worktree's files). MODES: default off.
# Every container runs the pinned runtime image by ID; the shred grace is B2_GRACE_MS (default 2000).
# B2_AUTHORITY=pg: the PostgreSQL removal authority, a postgres container (image by ID) on a network of its own per
# mode, a throwaway password and wrapping key made here and never written to disk (era5/cost.sh's pattern).
set -uo pipefail
out=${1:?absolute new output directory}; ref=${2:-worktree}; modes=${3:-off}
[[ $out == /* && ! -e $out ]] || { echo "b2.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/src" "$out/lab"
if [[ $ref == worktree ]]; then
  git -C "$repo" rev-parse HEAD > "$out/source"
  git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/b2-keys > "$out/dirty"
  cp -R "$repo/packages/datomic/gateway/src/." "$out/src/"; cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
else
  git -C "$repo" rev-parse "$ref" > "$out/source"
  mkdir -p "$out/tmp"; git -C "$repo" archive "$ref" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$out/tmp"
  cp -R "$out/tmp/packages/datomic/gateway/src/." "$out/src/"; cp "$out/tmp/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"; rm -rf "$out/tmp"
fi
cp "$x/wfix1/regression.clj" "$x/b2-keys/b2.clj" "$out/lab/"
image=${DX_B2_IMAGE_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "b2.sh: image $image not present" >&2; exit 2; }
echo "$image" > "$out/image"
pgimage=${DX_B2_PG_ID:-sha256:526f86d93c6ea08fd3f1fe5605650cacc781b2c6013169a0ad8f42c7d3d84f32}
authority=${B2_AUTHORITY:-file}
if [[ $authority == pg ]]; then
  [[ $(docker image inspect --format '{{.Id}}' "$pgimage") == "$pgimage" ]] || { echo "b2.sh: image $pgimage not present" >&2; exit 2; }
fi
pgs=(); nets=()
cleanup() {
  for c in ${pgs[@]+"${pgs[@]}"}; do docker rm -f "$c" > /dev/null 2>&1 || true; done
  for n in ${nets[@]+"${nets[@]}"}; do docker network rm "$n" > /dev/null 2>&1 || true; done
  rm -rf "$out/src"
}
trap cleanup EXIT
status=0
for mode in $modes; do
  env=(-e TRIPLEX_ERASURE_DIRECTORY=/tmp/era2-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
       -e DF01_RECORDED_PAGE=/tmp/recorded-page.json -e "TRIPLEX_ERASURE_SHRED_GRACE_MS=${B2_GRACE_MS:-2000}"
       -e "ERA2_B2_SOURCE=$(cut -c1-9 "$out/source") $mode" -e "ERA2_B2_HOLD_MS=${B2_HOLD_MS:-3000}")
  [[ $mode != off && $mode != *-worker ]] && env+=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e TX2_REMOVAL_PER_ACCOUNT=1)
  [[ $mode == subject || $mode == commit ]] && env+=(-e TX2_REMOVAL_SUBJECT_CHECK=1)
  [[ $mode == commit ]] && env+=(-e TX2_REMOVAL_COMMIT_BOUNDARY=1)
  # off-worker, subject-worker: the shred worker completes a removal left pending 3 s (TX2_REMOVAL_WORKER_COMPLETE_MS)
  [[ $mode == subject-worker ]] && env+=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e TX2_REMOVAL_PER_ACCOUNT=1 -e TX2_REMOVAL_SUBJECT_CHECK=1)
  [[ $mode == *-worker ]] && env+=(-e TX2_REMOVAL_WORKER_COMPLETE_MS=3000)
  netargs=()
  if [[ $authority == pg ]]; then
    net="tx2-dxb2-net-$$-$mode"; pg="tx2-dxb2-pg-$$-$mode"; password=$(openssl rand -hex 16)
    docker network create "$net" > /dev/null || exit 1; nets+=("$net")
    docker run -d --pull never --name "$pg" --network "$net" -e "POSTGRES_PASSWORD=$password" --memory 1g "$pgimage" > /dev/null || exit 1
    pgs+=("$pg")
    docker inspect --format '{{.Image}}' "$pg" > "$out/pg-image-ran-$mode"
    for i in $(seq 1 60); do docker exec "$pg" pg_isready -U postgres > /dev/null 2>&1 && break; sleep 1; done
    sleep 2
    env+=(-e "TRIPLEX_ERASURE_JDBC=jdbc:postgresql://$pg:5432/postgres?user=postgres&password=$password"
          -e "TRIPLEX_ERASURE_WRAPPING_KEY=$(openssl rand -base64 32)")
    netargs=(--network "$net")
  fi
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/b2.clj") (era2-b2/main)' > "$out/run.clj"
  docker run --rm --pull never --name "tx2-dxb2-b2-$$-$mode" ${netargs[@]+"${netargs[@]}"} --memory 3g --cpus 2 \
    -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" \
    -v "$out/lab:/lab:ro" -v "$out/run.clj:/opt/run.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
    > "$out/b2-$mode.log" 2>&1 || status=1
  echo "$mode $image $authority" >> "$out/images-ran"
  [[ $authority == pg ]] && { docker rm -f "$pg" > /dev/null 2>&1; docker network rm "$net" > /dev/null 2>&1; }
  grep -E "ERA2_B2|^FAIL|Exception" "$out/b2-$mode.log" | cut -c1-1500 | head -20
done
exit $status

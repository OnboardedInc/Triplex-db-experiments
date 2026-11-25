#!/usr/bin/env bash
# [DX-ERA5] The review's in-process attacks (era5/attack5.clj): one container from the pinned runtime image (by ID), an
# in-memory Datomic, the file removal authority, this checkout's gateway source (a private copy); no stack. Every option
# on, as DX-ERA4's gate (e): per-account removal, subject check, account tickets, TX2_DERIVED_SEAL. One ordinary heavy
# token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA5-inproc -- \
#     bash lab/experiments/EXP-DX1/era5/inproc.sh NEW_ABSOLUTE_DIR PHASE
# PHASE: cases, pending (sets the shred grace to ERA5_GRACE_MS, default 4000) or fuzz (ERA5_N, ERA5_BLOCK, ERA5_SEED,
# ERA5_RUN). ERA5_EXTRA_ENV="K=V ..." adds options (for example TX2_REMOVAL_COMMIT_BOUNDARY=1 on a composed branch).
set -uo pipefail
out=${1:?absolute new output directory}; phase=${2:?cases, pending or fuzz}
[[ $out == /* && ! -e $out ]] || { echo "inproc.sh: give a new absolute output directory" >&2; exit 2; }
[[ $phase == cases || $phase == pending || $phase == fuzz ]] || exit 2
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/src" "$out/lab" "$out/run.out"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/era5 > "$out/dirty"
cp -R "$repo/packages/datomic/gateway/src/." "$out/src/"
(cd "$out/src" && find . -type f -name '*.clj' | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256 | cut -c1-64) > "$out/gateway-source-sha"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
cp "$x/wfix1/regression.clj" "$x/era2/gate.clj" "$x/era3/attack.clj" "$x/act9/tickets.clj" "$x/era4/races.clj" "$x/era5/attack5.clj" "$out/lab/"
image=${DX_ERA5_RUNTIME_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
[[ $image =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "inproc.sh: DX_ERA5_RUNTIME_ID must be an image ID" >&2; exit 2; }
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "inproc.sh: image $image not present" >&2; exit 2; }
grace=0
[[ $phase == pending ]] && grace=${ERA5_GRACE_MS:-4000}
env=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e TX2_REMOVAL_PER_ACCOUNT=1
     -e TX2_REMOVAL_SUBJECT_CHECK=1 -e TX2_ACCOUNT_TICKETS=1 -e ACT9_ARM=after -e TX2_DERIVED_SEAL=1 -e ERA4_ARM=on
     -e TRIPLEX_ERASURE_DIRECTORY=/tmp/era5-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
     -e "TRIPLEX_ERASURE_SHRED_GRACE_MS=$grace" -e DF01_RECORDED_PAGE=/tmp/recorded-page.json
     -e "ERA5_PHASE=$phase" -e "ERA5_N=${ERA5_N:-200}" -e "ERA5_BLOCK=${ERA5_BLOCK:-100}" -e "ERA5_SEED=${ERA5_SEED:-1}"
     -e "ERA5_RUN=${ERA5_RUN:-f0}")
for kv in ${ERA5_EXTRA_ENV:-}; do env+=(-e "$kv"); done
printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/tickets.clj") (load-file "/lab/races.clj") (load-file "/lab/attack5.clj") (era5-attack/main)' > "$out/run.clj"
name="tx2-dxera5-inproc-$$-$phase"
started=$(date +%s)
docker run -d --pull never --name "$name" --memory 3g --cpus 2 -v "$out/run.out:/out" \
  -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" \
  -v "$out/lab:/lab:ro" -v "$out/run.clj:/opt/run.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
  'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' > "$out/container" || exit 1
docker inspect --format '{{.Image}}' "$name" > "$out/image-ran"
status=$(docker wait "$name")
docker logs "$name" > "$out/run.log" 2>&1
docker rm "$name" > /dev/null
echo "$(( $(date +%s) - started ))" > "$out/seconds"
[[ $(cat "$out/image-ran") == "$image" ]] || { echo "inproc.sh: the container ran $(cat "$out/image-ran"), not $image" >&2; status=3; }
grep -E "^ERA5_(SUMMARY|TALLY|PROGRESS|VIOLATIONS|VIOLATION|CASE)|ERA3_VIOLATION|Exception in|CompilerException|Syntax error" "$out/run.log" | cut -c1-2500 | tail -60
rm -rf "$out/src"
exit "$status"

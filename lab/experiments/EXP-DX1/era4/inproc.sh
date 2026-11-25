#!/usr/bin/env bash
# [DX-ERA4] Gate (e) in-process (era4/races.clj, on DX-ACT9's act9/tickets.clj): one container from a pinned runtime image (by ID), an in-memory
# Datomic, a file removal authority, this checkout's gateway source (a private copy); no stack. One ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA4-inproc -- \
#     bash lab/experiments/EXP-DX1/era4/inproc.sh NEW_ABSOLUTE_DIR ARM
# ARM: on (TX2_DERIVED_SEAL=1: derived copies sealed) or off (in clear, as today). Both run on a sealed database with the
# per-account removal rule, the subject check and account tickets (every option on together); ERA4_EXTRA_ENV="K=V ..."
# adds more. Passed through: ERA4_N, ERA4_BLOCK, ERA4_SEED, ERA4_RUN.
set -uo pipefail
out=${1:?absolute new output directory}; arm=${2:?before or after}
[[ $out == /* && ! -e $out ]] || { echo "inproc.sh: give a new absolute output directory" >&2; exit 2; }
[[ $arm == on || $arm == off ]] || exit 2
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/src" "$out/lab" "$out/run.out"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/era4 lab/experiments/EXP-DX1/act9 > "$out/dirty"
cp -R "$repo/packages/datomic/gateway/src/." "$out/src/"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
cp "$x/wfix1/regression.clj" "$x/era2/gate.clj" "$x/era3/attack.clj" "$x/act9/tickets.clj" "$x/era4/races.clj" "$out/lab/"
image=${DX_ERA4_RUNTIME_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
[[ $image =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "inproc.sh: DX_ACT9_RUNTIME_ID must be an image ID" >&2; exit 2; }
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "inproc.sh: image $image not present" >&2; exit 2; }
env=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e TX2_REMOVAL_PER_ACCOUNT=1
     -e TX2_REMOVAL_SUBJECT_CHECK=1
     -e TRIPLEX_ERASURE_DIRECTORY=/tmp/era4-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
     -e TRIPLEX_ERASURE_SHRED_GRACE_MS=0 -e TX2_ACCOUNT_TICKETS=1 -e ACT9_ARM=after
     -e DF01_RECORDED_PAGE=/tmp/recorded-page.json -e "ERA4_ARM=$arm" -e "ERA4_PHASE=${ERA4_PHASE:-fuzz}"
     -e "ERA4_N=${ERA4_N:-200}" -e "ERA4_BLOCK=${ERA4_BLOCK:-50}" -e "ERA4_SEED=${ERA4_SEED:-1}" -e "ERA4_RUN=${ERA4_RUN:-e0}")
[[ $arm == on ]] && env+=(-e TX2_DERIVED_SEAL=1)
for kv in ${ERA4_EXTRA_ENV:-}; do env+=(-e "$kv"); done
printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/tickets.clj") (load-file "/lab/races.clj") (era4-races/main)' > "$out/run.clj"
name="tx2-dxera4-inproc-$$-$arm"
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
grep -E "^ERA4_(SUMMARY|TALLY|PROGRESS|VIOLATIONS|VIOLATION)|ERA3_VIOLATION|Exception in|CompilerException|Syntax error" "$out/run.log" | cut -c1-1500 | tail -40
rm -rf "$out/src"
exit "$status"

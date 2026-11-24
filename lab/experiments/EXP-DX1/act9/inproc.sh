#!/usr/bin/env bash
# [DX-ACT9] Gate (e) in-process (act9/tickets.clj): one container from a pinned runtime image (by ID), an in-memory
# Datomic, a file removal authority, this checkout's gateway source (a private copy); no stack. One ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ACT9-inproc -- \
#     bash lab/experiments/EXP-DX1/act9/inproc.sh NEW_ABSOLUTE_DIR ARM
# ARM: before (tickets as the Publish branch sends them; gateway without TX2_ACCOUNT_TICKETS) or after (named accounts;
# gateway with it). Both run the per-account removal rule. ACT9_EXTRA_ENV="K=V ..." adds options (every option on
# together: TX2_IMPORT_WHOLE_SUBJECT=1). Passed through: ACT9_N, ACT9_BLOCK, ACT9_SEED, ACT9_RUN.
set -uo pipefail
out=${1:?absolute new output directory}; arm=${2:?before or after}
[[ $out == /* && ! -e $out ]] || { echo "inproc.sh: give a new absolute output directory" >&2; exit 2; }
[[ $arm == before || $arm == after ]] || exit 2
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/src" "$out/lab" "$out/run.out"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/act9 > "$out/dirty"
cp -R "$repo/packages/datomic/gateway/src/." "$out/src/"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
cp "$x/wfix1/regression.clj" "$x/era2/gate.clj" "$x/era3/attack.clj" "$x/act9/tickets.clj" "$out/lab/"
image=${DX_ACT9_RUNTIME_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
[[ $image =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "inproc.sh: DX_ACT9_RUNTIME_ID must be an image ID" >&2; exit 2; }
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "inproc.sh: image $image not present" >&2; exit 2; }
env=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e TX2_REMOVAL_PER_ACCOUNT=1
     -e TX2_REMOVAL_SUBJECT_CHECK=1
     -e TRIPLEX_ERASURE_DIRECTORY=/tmp/act9-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
     -e DF01_RECORDED_PAGE=/tmp/recorded-page.json -e "ACT9_ARM=$arm"
     -e "ACT9_N=${ACT9_N:-200}" -e "ACT9_BLOCK=${ACT9_BLOCK:-50}" -e "ACT9_SEED=${ACT9_SEED:-1}" -e "ACT9_RUN=${ACT9_RUN:-k0}")
[[ $arm == after ]] && env+=(-e TX2_ACCOUNT_TICKETS=1)
for kv in ${ACT9_EXTRA_ENV:-}; do env+=(-e "$kv"); done
printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/tickets.clj") (act9-tickets/main)' > "$out/run.clj"
name="tx2-dxact9-inproc-$$-$arm"
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
grep -E "^ACT9_(SUMMARY|TALLY|PROGRESS)|ERA3_VIOLATION|Exception in|CompilerException|Syntax error" "$out/run.log" | cut -c1-1500 | tail -40
rm -rf "$out/src"
exit "$status"

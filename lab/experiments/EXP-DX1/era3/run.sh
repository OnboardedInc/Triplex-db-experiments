#!/usr/bin/env bash
# [DX-ERA3] The review's in-process attacks and schedule fuzzer (era3/attack.clj): one container from the pinned
# runtime image (by ID), an in-memory Datomic, a file removal authority; no stack. One ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA3 -- \
#     bash lab/experiments/EXP-DX1/era3/run.sh NEW_ABSOLUTE_DIR MODE ["PHASES"]
# MODE: off (database-wide, today's rule), on (per account, head check), subject (per account, subject check).
# PHASES: any of d1 d2 d3 d4 d5 fuzz (default all). Passed through: ERA3_N, ERA3_BLOCK, ERA3_SEED, ERA3_RUN, ERA3_SEALED.
# ERA3_MAIN=2: the second review's cases instead (era3/attack2.clj): e1 e2 e3 e4 e5 e6 e7 e7b e8 e9 fuzz2 bodies2.
# ERA3_MAIN=3: the third review's cases (era3/attack3.clj): k2 k3 k4 k5 k6 k7 k8 k9 k10 k12 fuzz3.
# ERA3_MAIN=4: the fourth review's cases (era3/attack4.clj): q1 q2 q3 q4 q5 q7 q8 q9 q10 q11 r22 fuzz4.
# ERA3_MAIN=5: the fifth review's cases (era3/attack5.clj): w1 w2 w3 w4 p1 p2 c1 z s t fuzz5 (ERA3_BOUNDARY log, commit or move).
# Every container carries the label tx2.holder=DX-ERA3 (ERA3_HOLDER names another holder).
# ERA3_SOURCE: a checkout whose gateway source runs (default this one), e.g. a local merge with another branch.
# ERA3_SOURCE_REF: a commit whose gateway source runs instead, archived from this checkout (no second checkout).
set -uo pipefail
out=${1:?absolute new output directory}; mode=${2:?off, on or subject}; phases=${3:-d1 d2 d3 d4 d5 fuzz}
[[ $out == /* && ! -e $out ]] || { echo "run.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
source_repo=${ERA3_SOURCE:-$repo}
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/src" "$out/lab" "$out/run.out"
git -C "$repo" rev-parse HEAD > "$out/tests"
if [[ -n ${ERA3_SOURCE_REF:-} ]]; then
  # ERA3_SOURCE_REF: run another commit's gateway source (e.g. the builder's newer head), archived from this checkout
  git -C "$repo" rev-parse "$ERA3_SOURCE_REF^{commit}" > "$out/source"
  : > "$out/dirty"
  mkdir -p "$out/refsrc"
  git -C "$repo" archive "$ERA3_SOURCE_REF" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$out/refsrc"
  cp -R "$out/refsrc/packages/datomic/gateway/src/." "$out/src/"
  cp "$out/refsrc/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
  rm -rf "$out/refsrc"
else
  git -C "$source_repo" rev-parse HEAD > "$out/source"
  git -C "$source_repo" status --porcelain -- packages/datomic/gateway > "$out/dirty"
  cp -R "$source_repo/packages/datomic/gateway/src/." "$out/src/"
  cp "$source_repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
fi
# ERA3_PATCH=1: apply the review's proposed fix (era3/fix-proposal.py) to this private copy only.
if [[ ${ERA3_PATCH:-0} == 1 ]]; then python3 "$x/era3/fix-proposal.py" "$out/src" > "$out/patch.log" || exit 2; fi
echo "patch=${ERA3_PATCH:-0}" > "$out/patched"
cp "$x/wfix1/regression.clj" "$x/era2/gate.clj" "$x/era3/attack.clj" "$x/era3/attack2.clj" "$x/era3/attack3.clj" "$x/era3/attack4.clj" "$x/era3/attack5.clj" "$out/lab/"
image=${DX_ERA3_IMAGE_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
[[ $image =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "run.sh: DX_ERA3_IMAGE_ID must be an image ID" >&2; exit 2; }
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "run.sh: image $image not present" >&2; exit 2; }
env=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1
     -e TRIPLEX_ERASURE_DIRECTORY=/tmp/era3-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
     -e DF01_RECORDED_PAGE=/tmp/recorded-page.json -e "ERA3_PHASES=$phases"
     -e "ERA3_SEALED=${ERA3_SEALED:-0}" -e "ERA3_N=${ERA3_N:-200}" -e "ERA3_BLOCK=${ERA3_BLOCK:-100}" -e "ERA3_SEED=${ERA3_SEED:-1}" -e "ERA3_RUN=${ERA3_RUN:-r0}" -e "ERA3_BOUNDARY=${ERA3_BOUNDARY:-log}")
[[ $mode == on || $mode == subject ]] && env+=(-e TX2_REMOVAL_PER_ACCOUNT=1)
[[ $mode == subject ]] && env+=(-e TX2_REMOVAL_SUBJECT_CHECK=1)
[[ -n ${ERA3_EXTRA_ENV:-} ]] && for kv in $ERA3_EXTRA_ENV; do env+=(-e "$kv"); done
# ERA3_MAIN=2: the second review's attacks (era3/attack2.clj), loaded after the first review's.
if [[ ${ERA3_MAIN:-1} == 5 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (load-file "/lab/attack4.clj") (load-file "/lab/attack5.clj") (era3-attack5/main)' > "$out/run.clj"
elif [[ ${ERA3_MAIN:-1} == 4 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (load-file "/lab/attack4.clj") (era3-attack4/main)' > "$out/run.clj"
elif [[ ${ERA3_MAIN:-1} == 3 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (load-file "/lab/attack3.clj") (era3-attack3/main)' > "$out/run.clj"
elif [[ ${ERA3_MAIN:-1} == 2 ]]; then
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (load-file "/lab/attack2.clj") (era3-attack2/main)' > "$out/run.clj"
else
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/gate.clj") (load-file "/lab/attack.clj") (era3-attack/main)' > "$out/run.clj"
fi
name="tx2-dxera3-$$-$mode"
started=$(date +%s)
docker run -d --pull never --name "$name" --label "tx2.holder=${ERA3_HOLDER:-DX-ERA3}" --memory 3g --cpus 2 -v "$out/run.out:/out" \
  -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" \
  -v "$out/lab:/lab:ro" -v "$out/run.clj:/opt/run.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
  'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' > "$out/container" || exit 1
# The image this container actually ran, read back from the container itself.
docker inspect --format '{{.Image}}' "$name" > "$out/image-ran"
status=$(docker wait "$name")
docker logs "$name" > "$out/run.log" 2>&1
docker rm "$name" > /dev/null
echo "$(( $(date +%s) - started ))" > "$out/seconds"
[[ $(cat "$out/image-ran") == "$image" ]] || { echo "run.sh: the container ran $(cat "$out/image-ran"), not $image" >&2; status=3; }
grep -E "^ERA3_(SUMMARY|TALLY|PROGRESS)|ERA3_VIOLATION|Exception in|CompilerException|Syntax error" "$out/run.log" | cut -c1-1500 | tail -60
rm -rf "$out/src"
exit "$status"

#!/usr/bin/env bash
# [DX-ERA2 fifth pass] B2 (a pending removal stops every key deletion) in process, era2/b2.clj, on any gateway source:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA2-b2 -- \
#     bash lab/experiments/EXP-DX1/era2/b2.sh NEW_ABSOLUTE_DIR [REF] [MODES]
# REF: a commit whose gateway source is tested (default: this worktree's files). MODES: any of off (every option off:
# no TX2_ variable at all), on (per account), subject (per account, subject check), commit (and the commit boundary).
# Every container runs the pinned runtime image by ID; the shred grace is ERA2_B2_GRACE_MS (default 2000).
set -uo pipefail
out=${1:?absolute new output directory}; ref=${2:-worktree}; modes=${3:-off on subject commit}
[[ $out == /* && ! -e $out ]] || { echo "b2.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/src" "$out/lab"
if [[ $ref == worktree ]]; then
  git -C "$repo" rev-parse HEAD > "$out/source"
  git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/era2 > "$out/dirty"
  cp -R "$repo/packages/datomic/gateway/src/." "$out/src/"; cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
else
  git -C "$repo" rev-parse "$ref" > "$out/source"
  mkdir -p "$out/tmp"; git -C "$repo" archive "$ref" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$out/tmp"
  cp -R "$out/tmp/packages/datomic/gateway/src/." "$out/src/"; cp "$out/tmp/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"; rm -rf "$out/tmp"
fi
cp "$x/wfix1/regression.clj" "$x/era2/b2.clj" "$out/lab/"
image=${DX_ERA2_IMAGE_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "b2.sh: image $image not present" >&2; exit 2; }
echo "$image" > "$out/image"
status=0
for mode in $modes; do
  env=(-e TRIPLEX_ERASURE_DIRECTORY=/tmp/era2-authority -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}'
       -e DF01_RECORDED_PAGE=/tmp/recorded-page.json -e "TRIPLEX_ERASURE_SHRED_GRACE_MS=${ERA2_B2_GRACE_MS:-2000}"
       -e "ERA2_B2_SOURCE=$(cut -c1-9 "$out/source") $mode" -e "ERA2_B2_HOLD_MS=${ERA2_B2_HOLD_MS:-3000}")
  [[ $mode != off && $mode != *-worker ]] && env+=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e TX2_REMOVAL_PER_ACCOUNT=1)
  [[ $mode == subject || $mode == commit ]] && env+=(-e TX2_REMOVAL_SUBJECT_CHECK=1)
  [[ $mode == commit ]] && env+=(-e TX2_REMOVAL_COMMIT_BOUNDARY=1)
  # off-worker, subject-worker: the shred worker completes a removal left pending 3 s (TX2_REMOVAL_WORKER_COMPLETE_MS)
  [[ $mode == subject-worker ]] && env+=(-e TX2_SUBJECT_SAVE=1 -e TX2_SUBJECT_NUMERIC_OWNER=1 -e TX2_SUBJECT_ORDERED_IDS=1 -e TX2_REMOVAL_PER_ACCOUNT=1 -e TX2_REMOVAL_SUBJECT_CHECK=1)
  [[ $mode == *-worker ]] && env+=(-e TX2_REMOVAL_WORKER_COMPLETE_MS=3000)
  printf '%s\n' '(load-file "/lab/regression.clj") (load-file "/lab/b2.clj") (era2-b2/main)' > "$out/run.clj"
  docker run --rm --pull never --name "tx2-dxera2-b2-$$-$mode" --memory 3g --cpus 2 \
    -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" \
    -v "$out/lab:/lab:ro" -v "$out/run.clj:/opt/run.clj:ro" "${env[@]}" --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
    > "$out/b2-$mode.log" 2>&1 || status=1
  echo "$mode $image" >> "$out/images-ran"
  grep -E "ERA2_B2|^FAIL|Exception" "$out/b2-$mode.log" | cut -c1-1500 | head -20
done
rm -rf "$out/src"
exit $status

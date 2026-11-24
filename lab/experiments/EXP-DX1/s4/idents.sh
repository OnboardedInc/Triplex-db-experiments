#!/usr/bin/env bash
# [DX-S4] (copied from s3/idents.sh, which stays as it was) Stored-function identities of a gateway source tree under several writer settings (Mac, lab VM, seconds):
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S3-idents -- \
#     bash lab/experiments/EXP-DX1/s4/idents.sh <gateway src dir> <out.jsonl>
# One line per setting: {"setting": ..., "idents": {...}} from s3/idents.clj. Compare two trees with s3/compare-idents.py.
set -euo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
src=$(cd "${1:?gateway src dir}" && pwd)
out=${2:?out.jsonl}
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
# [DX-S4] Why: the shared tag is rebuilt by other builders' gates; run one pinned image and record its ID.
image=${DX_S4_IMAGE:-tx2-datomic:dx-s4-runtime}
image_id=$(docker image inspect -f '{{.Id}}' "$image")
echo "DX-S4_IMAGE $image $image_id"
name=tx2-dxs4-idents-$$
: > "$out"
# The server card's writer settings, then the options on top; "several" sets the new option.
settings=(
  "base:TX2_SUBJECT_SAVE=0"
  "server:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1"
  "server-wide:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1"
  "server-wide-hints:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"
  "serial-retire:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "owner-head:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_OWNER_HEAD=1"
  "several:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1"
  "several-serial:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "import-whole:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1 TX2_IMPORT_WHOLE_SUBJECT=1"
)
# [DX-S4] The creation option's settings exist only on trees that have it (DX_S4_CREATE_SETTINGS=1).
if [[ ${DX_S4_CREATE_SETTINGS:-0} == 1 ]]; then settings+=(
  "create:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1"
  "create-serial:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
); fi
for entry in "${settings[@]}"; do
  label=${entry%%:*} envs=()
  for kv in ${entry#*:}; do envs+=(-e "$kv"); done
  line=$(docker run --rm --name "$name" --pull never --label dx-s4=idents --memory 1500m "${envs[@]}" \
    -e TX2_PREDECESSOR_LOOKUP=1 -e TRIPLEX_TRACE_LEVEL=off \
    -v "$src:/opt/gateway/src:ro" -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
    -v "$here/../s3/idents.clj:/opt/s3/idents.clj:ro" --entrypoint /bin/bash "$image_id" -c \
    'cd /opt/datomic && java -Xmx1g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "/opt/gateway/src:$(bin/classpath)" clojure.main /opt/s3/idents.clj 2>&1' \
    | grep '^DX-S3_IDENTS ' | cut -d' ' -f2-)
  [[ -n $line ]] || { echo "idents.sh: no output for $label" >&2; exit 1; }
  printf '{"setting":"%s","idents":%s}\n' "$label" "$line" >> "$out"
  echo "DX-S4_IDENTS_DONE $label $(printf '%s' "$line" | wc -c | tr -d ' ') bytes"
done

#!/usr/bin/env bash
# [DX-XQ10] Stored-function identities of a gateway source tree under several writer settings (s3/idents.sh's method,
# exp/DX-S3-several-owners; Mac, lab VM, seconds each):
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-XQ10-idents -- \
#     bash lab/experiments/EXP-DX1/xq10/idents.sh <gateway src dir> <out.jsonl>
# Compare two trees with xq10/compare-idents.py. "index-hints-fix" sets this branch's TX2_INDEX_HINTS=1: the two hint
# functions' code and idents must change there and only there.
set -euo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
src=$(cd "${1:?gateway src dir}" && pwd)
out=${2:?out.jsonl}
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
image=${DX_XQ10_IMAGE:-tx2-datomic:dx-real2-production}
image=$(docker image inspect --format '{{.Id}}' "$image")  # by ID: shared tags are rebuilt by other builders
name=tx2-dxxq10-idents-$$
: > "$out"
server="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1"
settings=(
  "base:TX2_SUBJECT_SAVE=0"
  "server:$server"
  "server-wide:$server TX2_SUBJECT_WIDE=1"
  "server-wide-hints:$server TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"
  "serial-retire:$server TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "owner-head:$server TX2_SUBJECT_OWNER_HEAD=1"
  "questions:$server TX2_ID_LISTS=1 TX2_SWEEP=1 TX2_SWEEP_SHAPES=all TX2_ID_LIST_QUEUE_MS=100"
  "index:$server TX2_CROSS_INDEX=1"
  "index-hints:$server TX2_CROSS_INDEX=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"
  "index-hints-fix:$server TX2_CROSS_INDEX=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1 TX2_INDEX_HINTS=1"
)
for entry in "${settings[@]}"; do
  label=${entry%%:*} envs=()
  if [[ -n ${XQ10_ONLY:-} && " $XQ10_ONLY " != *" $label "* ]]; then continue; fi
  for kv in ${entry#*:}; do envs+=(-e "$kv"); done
  line=$(docker run --name "$name" --pull never --memory 1500m "${envs[@]}" \
    -e TX2_PREDECESSOR_LOOKUP=1 -e TRIPLEX_TRACE_LEVEL=off \
    -v "$src:/opt/gateway/src:ro" -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
    -v "$here/idents.clj:/opt/xq10/idents.clj:ro" --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx1g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "/opt/gateway/src:$(bin/classpath)" clojure.main /opt/xq10/idents.clj 2>&1' \
    | grep '^DX-XQ10_IDENTS ' | cut -d' ' -f2-)
  img=$(docker inspect --format '{{.Image}}' "$name"); docker rm -f "$name" >/dev/null
  [[ $img == "$image" ]] || { echo "idents.sh: container ran $img, pinned $image" >&2; exit 1; }
  [[ -n $line ]] || { echo "idents.sh: no output for $label" >&2; exit 1; }
  printf '{"setting":"%s","image":"%s","idents":%s}\n' "$label" "$img" "$line" >> "$out"
  echo "DX-XQ10_IDENTS_DONE $label $(printf '%s' "$line" | wc -c | tr -d ' ') bytes image $img"
done

#!/usr/bin/env bash
# [DX-ACT9, from DX-S3 s3/idents.sh] Stored-function identities of a gateway source tree under several writer settings.
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-ACT9-idents -- \
#     bash lab/experiments/EXP-DX1/act9/idents.sh <tree root> <image id> <out.jsonl>
# <tree root> is a checkout (its packages/datomic/gateway/src and codec-spec.json are mounted read-only).
# <image id> is a local image ID (sha256:... or its 12-hex prefix); the same ID must be used for both trees compared,
# because the generated names inside stored functions depend on everything the JVM read before them.
# Why: the option-off proof that no stored function changed across this branch's merges. Rejected: a fixed shared tag
# (another builder can retag it between the two runs).
set -euo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
tree=$(cd "${1:?tree root}" && pwd)
image=${2:?image id}
out=${3:?out.jsonl}
here=$(cd "$(dirname "$0")" && pwd)
[[ $image =~ ^(sha256:)?[0-9a-f]{12,64}$ ]] || { echo "idents.sh: give an image ID, not a tag" >&2; exit 2; }
name=tx2-dxact9-idents-$$
: > "$out"
# Every option of the merged branches off, then the writer settings of the server card, then this branch's options on
# top (their identities may differ; only the settings without them must be equal to the base's).
settings=(
  "base:TX2_SUBJECT_SAVE=0"
  "server:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1"
  "server-wide:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1"
  "server-wide-hints:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"
  "serial-retire:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "owner-head:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_OWNER_HEAD=1"
  "on-all:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_REMOVAL_PER_ACCOUNT=1 TX2_REMOVAL_SUBJECT_CHECK=1 TX2_IMPORT_WHOLE_SUBJECT=1 TX2_ACCOUNT_TICKETS=1"
)
for entry in "${settings[@]}"; do
  label=${entry%%:*} envs=()
  for kv in ${entry#*:}; do envs+=(-e "$kv"); done
  line=$(docker run --rm --name "$name" --pull never --memory 1500m "${envs[@]}" \
    -e TX2_PREDECESSOR_LOOKUP=1 -e TRIPLEX_TRACE_LEVEL=off \
    -v "$tree/packages/datomic/gateway/src:/opt/gateway/src:ro" \
    -v "$tree/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
    -v "$here/idents.clj:/opt/s3/idents.clj:ro" --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx1g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "/opt/gateway/src:$(bin/classpath)" clojure.main /opt/s3/idents.clj 2>&1' \
    | grep '^DX-S3_IDENTS ' | cut -d' ' -f2-)
  [[ -n $line ]] || { echo "idents.sh: no output for $label" >&2; exit 1; }
  printf '{"setting":"%s","idents":%s}\n' "$label" "$line" >> "$out"
  echo "DX-ACT9_IDENTS_DONE $label $(printf '%s' "$line" | wc -c | tr -d ' ') bytes"
done

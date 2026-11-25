#!/usr/bin/env bash
# [DX-INT5] Stored-function identities of a checkout tree (s3/idents.sh and xq10/idents.sh, by image ID), one line per writer
# setting. usage: idents.sh <tree root with packages/datomic/...> <out.jsonl> [image id]
set -euo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
root=$(cd "${1:?tree}" && pwd); out=${2:?out}
image=${3:-sha256:58970a61d426654f5011613e885675c35089d3c8282d713e8a4578775a739a15}
image=$(docker image inspect --format '{{.Id}}' "$image")
here=$(cd "$(dirname "$0")" && pwd)
name=tx2-dxint5-idents-$$
: > "$out"
server="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1"
settings=(
  "base:TX2_SUBJECT_SAVE=0"
  "server:$server"
  "server-wide:$server TX2_SUBJECT_WIDE=1"
  "server-wide-hints:$server TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"
  "serial-retire:$server TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "owner-head:$server TX2_SUBJECT_OWNER_HEAD=1"
  "questions:$server TX2_ID_LISTS=1 TX2_SWEEP=1"
  "prefetch:$server TX2_READ_PREFETCH=1"
  ${INT5_EXTRA_SETTINGS:-}
)
for entry in "${settings[@]}"; do
  label=${entry%%:*} envs=()
  if [[ -n ${INT5_ONLY:-} && " $INT5_ONLY " != *" $label "* ]]; then continue; fi
  for kv in ${entry#*:}; do envs+=(-e "$kv"); done
  line=$(docker run --name "$name" --pull never --memory 1500m "${envs[@]}" \
    -e TX2_PREDECESSOR_LOOKUP=1 -e TRIPLEX_TRACE_LEVEL=off \
    -v "$root/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$root/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
    -v "$here/idents.clj:/opt/int5/idents.clj:ro" --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx1g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "/opt/gateway/src:$(bin/classpath)" clojure.main /opt/int5/idents.clj 2>&1' \
    | grep '^DX-XQ10_IDENTS ' | cut -d' ' -f2-)
  img=$(docker inspect --format '{{.Image}}' "$name"); docker rm -f "$name" >/dev/null
  [[ $img == "$image" ]] || { echo "idents.sh: container ran $img, pinned $image" >&2; exit 1; }
  [[ -n $line ]] || { echo "idents.sh: no output for $label" >&2; exit 1; }
  printf '{"setting":"%s","image":"%s","idents":%s}\n' "$label" "$img" "$line" >> "$out"
  echo "INT5_IDENTS_DONE $label $(printf '%s' "$line" | wc -c | tr -d ' ') bytes image $img"
done

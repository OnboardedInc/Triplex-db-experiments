#!/usr/bin/env bash
# [DX-ERA3, seventh review] Stored-function identities (s3/idents.clj, taken from the reference commit) of several
# gateway commits under every writer setting, each against the reference (the one branch's head), with the
# compare script of s3. One ordinary heavy token; every container carries tx2.holder=DX-ERA3:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA3-idents -- \
#     bash lab/experiments/EXP-DX1/era3/idents7.sh NEW_ABSOLUTE_DIR REFERENCE COMMIT [COMMIT ...]
set -uo pipefail
out=${1:?absolute new output directory}; ref=${2:?reference commit}; shift 2
[[ $out == /* && ! -e $out ]] || { echo "idents7.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
image=${DX_ERA3_IMAGE_ID:-sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be}
[[ $(docker image inspect --format '{{.Id}}' "$image") == "$image" ]] || { echo "idents7.sh: image $image not present" >&2; exit 2; }
mkdir -p "$out/tools"
git -C "$repo" archive "$ref" lab/experiments/EXP-DX1/s3/idents.clj lab/experiments/EXP-DX1/s3/compare-idents.py | tar -x -C "$out/tools"
tools=$out/tools/lab/experiments/EXP-DX1/s3
server="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1"
settings=(
  "base:TX2_SUBJECT_SAVE=0"
  "server:$server"
  "server-wide:$server TX2_SUBJECT_WIDE=1"
  "server-wide-hints:$server TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"
  "serial-retire:$server TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "owner-head:$server TX2_SUBJECT_OWNER_HEAD=1"
  "several:$server TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1"
  "create:$server TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1"
  "questions:$server TX2_ID_LISTS=1 TX2_SWEEP=1"
  "index:$server TX2_CROSS_INDEX=1"
  "accounts:$server TX2_SUBJECT_WIDE=1 TX2_ACCOUNT_CLAIMS=1"
)
idents() { # COMMIT OUT.jsonl
  local commit=$1 file=$2 tree=$out/tree-$1
  mkdir -p "$tree"; git -C "$repo" archive "$commit" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$tree"
  : > "$file"
  for entry in "${settings[@]}"; do
    local label=${entry%%:*} envs=() line
    for kv in ${entry#*:}; do envs+=(-e "$kv"); done
    line=$(docker run --rm --name "tx2-dxera3-idents-$$-$label" --label tx2.holder=DX-ERA3 --pull never --memory 1500m "${envs[@]}" \
      -e TX2_PREDECESSOR_LOOKUP=1 -e TRIPLEX_TRACE_LEVEL=off \
      -v "$tree/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$tree/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
      -v "$tools/idents.clj:/opt/s3/idents.clj:ro" --entrypoint /bin/bash "$image" -c \
      'cd /opt/datomic && java -Xmx1g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "/opt/gateway/src:$(bin/classpath)" clojure.main /opt/s3/idents.clj 2>&1' \
      | grep -E '^DX-(S3|XQ10)_IDENTS ' | cut -d' ' -f2-)
    if [[ -z $line ]]; then echo "{\"setting\":\"$label\",\"idents\":{}}" >> "$file"; echo "IDENTS7 $commit $label no output"; continue; fi
    printf '{"setting":"%s","idents":%s}\n' "$label" "$line" >> "$file"
  done
  rm -rf "$tree"
  echo "IDENTS7 $commit done $(wc -l < "$file") settings"
}
git -C "$repo" rev-parse "$ref" > "$out/reference"
idents "$(git -C "$repo" rev-parse --short=9 "$ref")" "$out/ref.jsonl"
for c in "$@"; do
  short=$(git -C "$repo" rev-parse --short=9 "$c")
  idents "$short" "$out/$short.jsonl"
  echo "== $short against the reference $(cat "$out/reference" | cut -c1-9)" | tee -a "$out/compare.txt"
  python3 -I "$tools/compare-idents.py" "$out/ref.jsonl" "$out/$short.jsonl" >> "$out/compare.txt" 2>&1; echo "exit $?" >> "$out/compare.txt"
done
echo "$image" > "$out/image"
grep -E "^==|before, .* after|DIFFER|MISSING|COMPARE|^exit" "$out/compare.txt" | cut -c1-200

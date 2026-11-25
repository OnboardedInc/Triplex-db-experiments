#!/usr/bin/env bash
# [DX-S5 second review] In-memory runs on the reviewer's image (s5/image2.sh): gateway sources and test files are baked
# in, the container is started by image ID and mounts nothing but an output directory. One writer setting per JVM.
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S5-clj -- bash lab/experiments/EXP-DX1/s5/clj-run2.sh OUT MODE SETTINGS
# MODE: fuzz (s5/fuzz.clj; S5_FAULTS=1 adds the fault dimension, S5_ACCOUNTS=1 the second account), attack2
# (s5/attack2_gate.clj). Development only, never counted: S5_DEV_TESTS=1 mounts the working tree's test files.
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}
mode=${2:?mode}
wanted=${3:-server}
[[ ! -e $out ]] || { echo "clj-run2.sh: $out exists" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
head=$(git -C "$repo" rev-parse HEAD)
ref=${DX_S5_IMAGE:-tx2-dxs5:${head:0:12}}
image_id=$(docker image inspect -f '{{.Id}}' "$ref") || { echo "clj-run2.sh: build $ref with s5/image2.sh first" >&2; exit 2; }
source=$(docker image inspect -f '{{index .Config.Labels "tx2.dx-s5.source"}}' "$image_id")
dev=()
[[ ${S5_DEV_TESTS:-0} == 1 ]] && dev=(-v "$repo/lab/experiments/EXP-DX1:/exp:ro")
echo "DX-S5R2_IMAGE $ref $image_id source ${source:-none} head $head devTests ${S5_DEV_TESTS:-0}" | tee "$out/image"
git -C "$repo" status --short > "$out/dirty"
base="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1"
settings=(
  "server:$base"
  "serial:$base TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "hints:$base TX2_SUBJECT_HINTS=1"
  "plainowner:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=0 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1"
  "prefetch:$base TX2_SUBJECT_PREFETCH=1"
  "general:TX2_SUBJECT_SAVE=0"
  "bound:$base TX2_IMPORT_WHOLE_SUBJECT=1 TX2_REMOVAL_COST_READBACK=1 TX2_READ_SET_BOUND=1"
  "accounts-off:$base"
  "accounts-on:$base TX2_ACCOUNT_CLAIMS=1"
  "accounts-on-serial:$base TX2_ACCOUNT_CLAIMS=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "accounts-on-general:TX2_SUBJECT_SAVE=0 TX2_ACCOUNT_CLAIMS=1"
)
s5="-i /exp/s5/fuzz.clj"
case $mode in
  fuzz) files="$s5"; expr="(s5-fuzz/main)" ;;
  attack2) files="$s5 -i /exp/s5/attack_gate.clj -i /exp/s5/attack2_gate.clj"; expr="(s5-attack2/main)" ;;
  *) echo "mode $mode?" >&2; exit 2 ;;
esac
status=0
for entry in $wanted; do
  line=
  for s in "${settings[@]}"; do [[ ${s%%:*} == "$entry" ]] && line=${s#*:}; done
  [[ -n $line ]] || { echo "unknown setting $entry" >&2; exit 2; }
  envs=(); for kv in $line; do envs+=(-e "$kv"); done
  name=tx2-dxs5r2-clj-$$-$entry
  docker run --rm --name "$name" --label dx-s5=clj2 --pull never --memory 3g "${envs[@]}" \
    -e TX2_GROUP_COMMIT=0 -e TX2_LIVE_PRIORITY=0 -e TX2_PREDECESSOR_LOOKUP=1 -e TX2_LEAN_NATIVE_QUERY=1 -e TX2_LEAN_NATIVE_LOG=1 \
    -e TRIPLEX_TRACE_LEVEL=off -e TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure -e PREP1_ATTEMPT=dx-s5r2-clj \
    -e S5_SEEDS -e S5_STEPS -e S5_ROUNDS -e S5_THREADS -e S5_PER_THREAD -e S5_FAULTS -e S5_ACCOUNTS -e S5_ONLY \
    ${dev[@]+"${dev[@]}"} --entrypoint /bin/bash "$image_id" -c "
      mkdir -p /tmp/erasure && cd /opt/datomic && java -Xmx2g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
        -cp \"/opt/gateway/src:\$(bin/classpath)\" clojure.main -i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj $files \
        -e '$expr'" > "$out/$mode-$entry.log" 2>&1 || status=1
  echo "$entry: $(grep -E '^DX-S5(R2)?_RESULT ' "$out/$mode-$entry.log" | cut -c1-600 || echo 'no summary')"
done
echo "DX-S5R2_CLJ_EXIT $status"
exit "$status"

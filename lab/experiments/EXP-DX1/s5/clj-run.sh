#!/usr/bin/env bash
# [DX-S5] The reviewer's in-memory differential fuzzer (s5/fuzz.clj) and targeted attacks (s5/attack_gate.clj), inside the
# pinned lab Datomic runtime image (this branch's gateway sources mounted read-only), one writer setting per JVM.
# One ordinary heavy token per call:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S5-clj -- bash lab/experiments/EXP-DX1/s5/clj-run.sh OUT MODE SETTINGS
# MODE: fuzz (S5_SEEDS, S5_STEPS, S5_ROUNDS, S5_THREADS, S5_PER_THREAD) or attack.
# SETTINGS: space-separated names from the table below. Times printed are diagnostic.
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}
mode=${2:?fuzz or attack}
wanted=${3:-server}
[[ ! -e $out ]] || { echo "clj-run.sh: $out exists" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
image_id=$(docker image inspect -f '{{.Id}}' "${DX_S5_IMAGE_REF:-tx2-datomic:dx-s4-runtime}")
echo "DX-S5_IMAGE ${DX_S5_IMAGE_REF:-tx2-datomic:dx-s4-runtime} $image_id" | tee "$out/image"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --short > "$out/dirty"
base="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1"
settings=(
  "server:$base"
  "serial:$base TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "hints:$base TX2_SUBJECT_HINTS=1"
  "import:$base TX2_IMPORT_WHOLE_SUBJECT=1 TX2_REMOVAL_COST_READBACK=1"
  "plainowner:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=0 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1"
  "prefetch:$base TX2_SUBJECT_PREFETCH=1"
  "readback:$base TX2_REMOVAL_COST_READBACK=1"
)
case $mode in
  fuzz) files="-i /exp/s5/fuzz.clj"; expr="(s5-fuzz/main)" ;;
  attack) files="-i /exp/s5/fuzz.clj -i /exp/s5/attack_gate.clj"; expr="(s5-attack/main)" ;;
  *) echo "mode $mode?" >&2; exit 2 ;;
esac
status=0
for entry in $wanted; do
  line=
  for s in "${settings[@]}"; do [[ ${s%%:*} == "$entry" ]] && line=${s#*:}; done
  [[ -n $line ]] || { echo "unknown setting $entry" >&2; exit 2; }
  envs=(); for kv in $line; do envs+=(-e "$kv"); done
  name=tx2-dxs5-clj-$$-$entry
  docker run --rm --name "$name" --label dx-s5=clj --pull never --memory 3g "${envs[@]}" \
    -e TX2_GROUP_COMMIT=0 -e TX2_LIVE_PRIORITY=0 -e TX2_PREDECESSOR_LOOKUP=1 -e TX2_LEAN_NATIVE_QUERY=1 -e TX2_LEAN_NATIVE_LOG=1 \
    -e TRIPLEX_TRACE_LEVEL=off -e TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure -e PREP1_ATTEMPT=dx-s5-clj \
    -e S5_SEEDS -e S5_STEPS -e S5_ROUNDS -e S5_THREADS -e S5_PER_THREAD -e S5_REMOVALS \
    -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
    -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
    -v "$repo/lab/experiments/EXP-DX1:/exp:ro" --entrypoint /bin/bash "$image_id" -c "
      mkdir -p /tmp/erasure && cd /opt/datomic && java -Xmx2g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
        -cp \"/opt/gateway/src:\$(bin/classpath)\" clojure.main -i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj $files \
        -e '$expr'" > "$out/$mode-$entry.log" 2>&1 || status=1
  echo "$entry: $(grep -E '^DX-S5_RESULT ' "$out/$mode-$entry.log" || echo 'no summary')"
done
echo "DX-S5_CLJ_EXIT $status"
exit "$status"

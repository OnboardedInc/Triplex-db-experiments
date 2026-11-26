#!/usr/bin/env bash
# [DX-RD7] In-memory runs for the hardened cut lookup and the writers' audit (rd7/harness.clj, rd7/audit.clj, and the
# review's rd6/attacks.clj), one writer setting per JVM, started by image ID. One ordinary heavy token per call:
#   DOCKER_HOST=<lab VM socket> DX_RD7_IMAGE=<image ID built from the head> node lab/bin/heavy.mjs --label DX-RD7-clj -- \
#     bash lab/experiments/EXP-DX1/rd7/clj-run.sh OUT MODE "SETTINGS"
# The gateway sources are the image's own (built from the head under test). DX_RD7_TREE=<a tree of another head> runs
# that tree's gateway sources and its S5 harness on the lab runtime image instead (a read-only audit of a branch as it
# stands); the rd6 and rd7 files always come from this checkout. RD7_ENV adds settings to every JVM (for example
# "TX2_PINNED_CUT_LOOKUP=1"); RD7_PLANT=row|position plants the review's break into every audited scope (proof only).
# MODE: fuzz (the save line's fuzzer, every scope audited), attack (the review's targeted tests, every scope audited),
# rd6-fuzz (the review's fuzz hook unchanged), guard (the hardened cut lookup against the past view, and its cost).
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new absolute output directory}
mode=${2:?fuzz, attack, rd6-fuzz or guard}
wanted=${3:-server}
[[ $out == /* && ! -e $out ]] || { echo "clj-run.sh: give a new absolute output directory" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
tree=${DX_RD7_TREE:-}
mounts=()
if [[ -n $tree ]]; then
  image_ref=${DX_RD7_IMAGE:-sha256:da58aea16b31779bdd3120396d052814222cc046b0a923e81ec4ebf72621796b}
  mounts+=(-v "$tree/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$tree/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro")
  exp=$tree/lab/experiments/EXP-DX1
  echo "tree $tree $(cat "$tree/SOURCE" 2>/dev/null)" > "$out/source"
else
  image_ref=${DX_RD7_IMAGE:?DX_RD7_IMAGE: the image built from the head under test}
  exp=$repo/lab/experiments/EXP-DX1
  git -C "$repo" rev-parse HEAD > "$out/source"
  git -C "$repo" status --porcelain -- packages/datomic lab/experiments/EXP-DX1/rd7 lab/experiments/EXP-DX1/rd6 > "$out/dirty"
fi
image_id=$(docker image inspect -f '{{.Id}}' "$image_ref") || { echo "clj-run.sh: no image $image_ref" >&2; exit 2; }
echo "$image_id" > "$out/image"
common="TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TRIPLEX_TRACE_LEVEL=off TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure PREP1_ATTEMPT=dx-rd7-clj"
base="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1 TX2_GROUP_COMMIT=0"
grouped="TX2_PREDECESSOR_LOOKUP=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TRIPLEX_TRACE_LEVEL=off TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure PREP1_ATTEMPT=dx-rd7-clj TX2_GROUP_COMMIT=1 TX2_GROUP_STAGE_CLOCK=1 TX2_GROUP_FAST_REPLY=1 TX2_GROUP_REUSE_PREPARED=1 TX2_LIVE_PRIORITY=1 TX2_GROUP_MAX_MEMBERS=32 TX2_SMALL_ROWS=1 TX2_SAVE_LEDGER=1"
# The review's ten settings (rd6/clj-run.sh) and the save line's grouped one (s6/clj-run.sh "group": the per-subject
# writers with the group writer on).
settings=(
  "server:$common $base"
  "serial:$common $base TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "import:$common $base TX2_IMPORT_WHOLE_SUBJECT=1 TX2_REMOVAL_COST_READBACK=1"
  "hints:$common $base TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"
  "general:$common TX2_SUBJECT_SAVE=0 TX2_GROUP_COMMIT=0"
  "grouped:$grouped TX2_SUBJECT_SAVE=0"
  "ownerhead:$common TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_OWNER_HEAD=1 TX2_GROUP_COMMIT=0"
  "index:$common $base TX2_CROSS_INDEX=1"
  "accounts:$common $base TX2_ACCOUNT_CLAIMS=1"
  "accounts-serial:$common $base TX2_ACCOUNT_CLAIMS=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "group:$common ${base/TX2_GROUP_COMMIT=0/TX2_GROUP_COMMIT=1}"
)
harness="-i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj -i /exp/s5/fuzz.clj -i /rd7/audit.clj -i /rd7/harness.clj"
case $mode in
  fuzz) files="$harness"; expr="(rd7-harness/fuzz-main)" ;;
  attack) files="$harness -i /rd6/attacks.clj"; expr="(rd7-harness/attack-main)" ;;
  rd6-fuzz) files="$harness -i /rd6/attacks.clj"; expr="(rd6-attacks/fuzz-main)" ;;
  guard) files="$harness -i /rd6/attacks.clj"; expr="(rd7-harness/guard-and-cost-main)" ;;
  *) echo "mode $mode?" >&2; exit 2 ;;
esac
status=0
for entry in $wanted; do
  line=
  for s in "${settings[@]}"; do [[ ${s%%:*} == "$entry" ]] && line=${s#*:}; done
  [[ -n $line ]] || { echo "unknown setting $entry" >&2; exit 2; }
  envs=(); for kv in $line ${RD7_ENV:-}; do envs+=(-e "$kv"); done
  # Sealed values need a wrapping key: a random one per run, never written down.
  key=(); [[ ${S5_PROTECTED:-} == sealed ]] && key=(-e "TRIPLEX_ERASURE_WRAPPING_KEY=$(head -c 32 /dev/urandom | base64)")
  name=tx2-dxrd7-clj-$$-$mode-$entry
  echo "$(date '+%F %T %Z') start $name env [${RD7_ENV:-}] plant [${RD7_PLANT:-}]" >> "$out/runs.log"
  docker run --rm --name "$name" --label dx-rd7=clj --pull never --memory 3g --cpus 2 "${envs[@]}" ${key[@]+"${key[@]}"} \
    -e S5_SEEDS -e S5_STEPS -e S5_ROUNDS -e S5_THREADS -e S5_PER_THREAD -e S5_PROTECTED -e S5_REMOVALS -e S5_ACCOUNTS \
    -e S5_TRANSITION -e S5_FAULTS -e S5_VALUE_TYPES -e S5_ONLY -e RD6_SUBJECTS -e RD6_EDITS -e RD6_GROUPS -e RD7_PLANT \
    ${mounts[@]+"${mounts[@]}"} -v "$exp:/exp:ro" -v "$repo/lab/experiments/EXP-DX1/rd7:/rd7:ro" -v "$repo/lab/experiments/EXP-DX1/rd6:/rd6:ro" \
    --entrypoint /bin/bash "$image_id" -c "
      mkdir -p /tmp/erasure && cd /opt/datomic && java -Xmx2g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
        -cp \"/opt/gateway/src:\$(bin/classpath)\" clojure.main $files -e '$expr'" > "$out/$mode-$entry.log" 2>&1 || status=1
  echo "$(date '+%F %T %Z') end $name status $status" >> "$out/runs.log"
  echo "$entry: $(grep -E '^(DX-RD7_(FUZZ|AUDIT|GUARD_RESULT)|DX-RD6_(RESULT|FUZZ)) ' "$out/$mode-$entry.log" | cut -c1-600 | tr '\n' ' ' || echo 'no summary')"
done
echo "DX-RD7_CLJ_EXIT $status"
exit "$status"

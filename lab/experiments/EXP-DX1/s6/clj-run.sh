#!/usr/bin/env bash
# [DX-S6] The standing in-memory gate phase: the reviewer's differential fuzzer (s5/fuzz.clj) and attacks
# (s5/attack_gate.clj) plus this branch's gates (s6/*.clj), run by image ID on the image s6/image.sh built from the
# committed head (gateway sources baked in; only the test files are mounted). One writer setting per JVM.
# One ordinary heavy token per call:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S6-clj -- bash lab/experiments/EXP-DX1/s6/clj-run.sh OUT MODE SETTINGS
# MODE: fuzz, attack (S5 attacks), outcome, bound, race, owners (s3), create (s4). Times are diagnostic.
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}
mode=${2:?mode}
wanted=${3:-server}
[[ ! -e $out ]] || { echo "clj-run.sh: $out exists" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
head=$(git -C "$repo" rev-parse HEAD)
ref=${DX_S6_IMAGE:-tx2-dxs6:${head:0:12}}
# Development only (never counted): DX_S6_DEV_MOUNT=1 runs the working tree's sources on the runtime image.
dev=()
if [[ ${DX_S6_DEV_MOUNT:-0} == 1 ]]; then
  ref=tx2-datomic:dx-s4-runtime
  dev=(-v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro")
fi
image_id=$(docker image inspect -f '{{.Id}}' "$ref") || { echo "clj-run.sh: build $ref with s6/image.sh first" >&2; exit 2; }
source=$(docker image inspect -f '{{index .Config.Labels "tx2.dx-s6.source"}}' "$image_id")
echo "DX-S6_IMAGE $ref $image_id source ${source:-none} head $head devMount ${DX_S6_DEV_MOUNT:-0}" | tee "$out/image"
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
  "general:TX2_SUBJECT_SAVE=0"
  "bound:$base TX2_IMPORT_WHOLE_SUBJECT=1 TX2_REMOVAL_COST_READBACK=1 TX2_READ_SET_BOUND=1"
  "s3:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1"
  "s3-serial:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "accounts-off:$base"
  "accounts-on:$base TX2_ACCOUNT_CLAIMS=1"
  "accounts-on-serial:$base TX2_ACCOUNT_CLAIMS=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "accounts-on-general:TX2_SUBJECT_SAVE=0 TX2_ACCOUNT_CLAIMS=1"
  "group:$base TX2_GROUP_COMMIT=1"
  "group-accounts:$base TX2_GROUP_COMMIT=1 TX2_ACCOUNT_CLAIMS=1"
)
s5="-i /exp/s5/fuzz.clj"
case $mode in
  fuzz) files="$s5"; expr="(s5-fuzz/main)" ;;
  attack) files="$s5 -i /exp/s5/attack_gate.clj"; expr="(s5-attack/main)" ;;
  outcome) files="$s5 -i /exp/s6/outcome_gate.clj"; expr="(s6-outcome/main)" ;;
  bound) files="$s5 -i /exp/s6/bound_gate.clj"; expr="(s6-bound/main)" ;;
  race) files="$s5 -i /exp/s6/race_gate.clj"; expr="(s6-race/main)" ;;
  accounts) files="$s5 -i /exp/s6/accounts_gate.clj"; expr="(s6-accounts/main)" ;;
  attack2) files="$s5 -i /exp/s5/attack_gate.clj -i /exp/s5/attack2_gate.clj"; expr="(s5-attack2/main)" ;;
  ids) files="$s5 -i /exp/s6/stored_ids_gate.clj"; expr="(s6-ids/main)" ;;
  owners) files="-i /exp/s3/owners_gate.clj -i /exp/s6/gates_main.clj"; expr="(s6-gates/run (quote owners-gate))" ;;
  create) files="-i /exp/s3/owners_gate.clj -i /exp/s4/create_gate.clj -i /exp/s6/gates_main.clj"; expr="(s6-gates/run (quote create-gate))" ;;
  *) echo "mode $mode?" >&2; exit 2 ;;
esac
status=0
for entry in $wanted; do
  line=
  for s in "${settings[@]}"; do [[ ${s%%:*} == "$entry" ]] && line=${s#*:}; done
  [[ -n $line ]] || { echo "unknown setting $entry" >&2; exit 2; }
  envs=(); group=0; for kv in $line; do [[ $kv == TX2_GROUP_COMMIT=1 ]] && group=1 || envs+=(-e "$kv"); done
  name=tx2-dxs6-clj-$$-$entry
  # Sealed values need a wrapping key: a random one per run, never written down.
  key=(); [[ ${S5_PROTECTED:-} == sealed ]] && key=(-e "TRIPLEX_ERASURE_WRAPPING_KEY=$(head -c 32 /dev/urandom | base64)")
  docker run --rm --name "$name" --label dx-s6=clj --pull never --memory 3g "${envs[@]}" ${key[@]+"${key[@]}"} \
    -e TX2_GROUP_COMMIT=${group:-0} -e TX2_LIVE_PRIORITY=0 -e TX2_PREDECESSOR_LOOKUP=1 -e TX2_LEAN_NATIVE_QUERY=1 -e TX2_LEAN_NATIVE_LOG=1 \
    -e TRIPLEX_TRACE_LEVEL=off -e TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure -e PREP1_ATTEMPT=dx-s6-clj \
    -e S5_SEEDS -e S5_STEPS -e S5_ROUNDS -e S5_THREADS -e S5_PER_THREAD -e S5_REMOVALS -e S5_VALUE_TYPES -e S5_PROTECTED -e S6_ACCOUNT_SCHEDULES -e S5_FAULTS -e S5_ACCOUNTS -e S5_ONLY \
    ${dev[@]+"${dev[@]}"} -v "$repo/lab/experiments/EXP-DX1:/exp:ro" --entrypoint /bin/bash "$image_id" -c "
      mkdir -p /tmp/erasure && cd /opt/datomic && java -Xmx2g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
        -cp \"/opt/gateway/src:\$(bin/classpath)\" clojure.main -i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj $files \
        -e '$expr'" > "$out/$mode-$entry.log" 2>&1 || status=1
  echo "$entry: $(grep -E '^DX-S[56]_RESULT ' "$out/$mode-$entry.log" || echo 'no summary')"
done
echo "DX-S6_CLJ_EXIT $status"
exit "$status"

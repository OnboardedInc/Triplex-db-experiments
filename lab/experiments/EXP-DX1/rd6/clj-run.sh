#!/usr/bin/env bash
# [DX-RD6] The pinned-read review's in-memory attacks (rd6/attacks.clj) inside the pinned lab Datomic runtime image,
# with a snapshot of this checkout's gateway sources mounted read-only, one writer setting per JVM. One ordinary heavy
# token per call:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-RD6-clj -- bash lab/experiments/EXP-DX1/rd6/clj-run.sh OUT MODE SETTINGS
# MODE: attack (the targeted tests), fuzz (the S5 fuzzer with every pinned read compared at each of its deep points;
# S5_SEEDS, S5_STEPS, S5_ROUNDS, S5_THREADS, S5_PER_THREAD, S5_PROTECTED, S5_REMOVALS, S5_ACCOUNTS, S5_TRANSITION, S5_FAULTS
# pass through), or cost (the hardening's time per read; diagnostic). SETTINGS: names from the table below.
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}
mode=${2:?attack, fuzz or cost}
wanted=${3:-server}
[[ $out == /* && ! -e $out ]] || { echo "clj-run.sh: give a new absolute output directory" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
# The lab Datomic runtime (no gateway code of its own is used: the snapshot below is on the classpath first), by ID.
image_id=${DX_RD6_IMAGE:-sha256:da58aea16b31779bdd3120396d052814222cc046b0a923e81ec4ebf72621796b}
docker image inspect -f '{{.Id}}' "$image_id" > "$out/image" || exit 2
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic > "$out/dirty"
[[ -s $out/dirty ]] && { echo "clj-run.sh: the gateway sources differ from HEAD" >&2; exit 2; }
mkdir -p "$out/src" && cp -R "$repo/packages/datomic/gateway/src/." "$out/src/" && cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
mkdir -p "$out/exp" && cp -R "$repo/lab/experiments/EXP-DX1/wfix1" "$repo/lab/experiments/EXP-DX1/w2" "$repo/lab/experiments/EXP-DX1/s5" "$repo/lab/experiments/EXP-DX1/rd6" "$out/exp/"
common="TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TRIPLEX_TRACE_LEVEL=off TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure PREP1_ATTEMPT=dx-rd6-clj"
base="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1 TX2_GROUP_COMMIT=0"
settings=(
  "server:$common $base"
  "serial:$common $base TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "import:$common $base TX2_IMPORT_WHOLE_SUBJECT=1 TX2_REMOVAL_COST_READBACK=1"
  "hints:$common $base TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"
  "general:$common TX2_SUBJECT_SAVE=0 TX2_GROUP_COMMIT=0"
  "grouped:TX2_PREDECESSOR_LOOKUP=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TRIPLEX_TRACE_LEVEL=off TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure PREP1_ATTEMPT=dx-rd6-clj TX2_SUBJECT_SAVE=0 TX2_GROUP_COMMIT=1 TX2_GROUP_STAGE_CLOCK=1 TX2_GROUP_FAST_REPLY=1 TX2_GROUP_REUSE_PREPARED=1 TX2_LIVE_PRIORITY=1 TX2_GROUP_MAX_MEMBERS=32 TX2_SMALL_ROWS=1 TX2_SAVE_LEDGER=1"
  "ownerhead:$common TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_OWNER_HEAD=1 TX2_GROUP_COMMIT=0"
  "index:$common $base TX2_CROSS_INDEX=1"
  "accounts:$common $base TX2_ACCOUNT_CLAIMS=1"
  "accounts-serial:$common $base TX2_ACCOUNT_CLAIMS=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
)
case $mode in
  attack) expr="(rd6-attacks/attack-main)" ;;
  fuzz) expr="(rd6-attacks/fuzz-main)" ;;
  cost) expr="(rd6-attacks/cost-main)" ;;
  *) echo "mode $mode?" >&2; exit 2 ;;
esac
status=0
for entry in $wanted; do
  line=
  for s in "${settings[@]}"; do [[ ${s%%:*} == "$entry" ]] && line=${s#*:}; done
  [[ -n $line ]] || { echo "unknown setting $entry" >&2; exit 2; }
  envs=(); for kv in $line; do envs+=(-e "$kv"); done
  name=tx2-dxrd6-clj-$$-$mode-$entry
  echo "$(date '+%F %T %Z') start $name" >> "$out/runs.log"
  docker run --rm --name "$name" --label dx-rd6=clj --pull never --memory 3g --cpus 2 "${envs[@]}" \
    -e S5_SEEDS -e S5_STEPS -e S5_ROUNDS -e S5_THREADS -e S5_PER_THREAD -e S5_PROTECTED -e S5_REMOVALS -e S5_ACCOUNTS \
    -e S5_TRANSITION -e S5_FAULTS -e S5_VALUE_TYPES -e RD6_SUBJECTS -e RD6_EDITS -e RD6_GROUPS \
    -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
    -v "$out/exp:/exp:ro" --entrypoint /bin/bash "$image_id" -c "
      mkdir -p /tmp/erasure && cd /opt/datomic && java -Xmx2g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
        -cp \"/opt/gateway/src:\$(bin/classpath)\" clojure.main -i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj \
        -i /exp/s5/fuzz.clj -i /exp/rd6/attacks.clj -e '$expr'" > "$out/$mode-$entry.log" 2>&1 || status=1
  echo "$(date '+%F %T %Z') end $name status $status" >> "$out/runs.log"
  echo "$entry: $(grep -E '^DX-RD6_(RESULT|FUZZ|COST) ' "$out/$mode-$entry.log" | cut -c1-400 || echo 'no summary')"
done
rm -rf "$out/src" "$out/exp"
echo "DX-RD6_CLJ_EXIT $status"
exit "$status"

#!/usr/bin/env bash
# [DX-RD6, second review] One JVM per writer setting, gateway sources from RD6_SRC (a checkout tree; default this
# one), the review's harness from this checkout. In memory by default; RD6_STORAGE=pg runs the same JVM against a
# PostgreSQL storage and a transactor inside the container (rd6/pg-container.sh). One ordinary heavy token per call:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-RD6-r2 -- bash lab/experiments/EXP-DX1/rd6/run2.sh OUT MODE "SETTINGS"
# MODE: attack (rd6/attacks.clj), fuzz (rd6/attacks.clj fuzz-main; S5_* pass through), review2 (rd6/review2.clj).
# RD6_EXTRA_ENV: more assignments for every setting (for example "TX2_PINNED_SHORTCUT=0 TX2_PINNED_CUT_LOOKUP=0").
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}; mode=${2:?attack, fuzz or review2}; wanted=${3:-server}
[[ $out == /* && ! -e $out ]] || { echo "run2.sh: give a new absolute output directory" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd); repo=$(git -C "$here" rev-parse --show-toplevel)
src=${RD6_SRC:-$repo}
storage=${RD6_STORAGE:-mem}
image_id=${DX_RD6_IMAGE:-$([[ $storage == pg ]] && echo sha256:21a67288007d1647ad12136acef23ff23c733a911b54695835a36440bc7a08be || echo sha256:da58aea16b31779bdd3120396d052814222cc046b0a923e81ec4ebf72621796b)}
docker image inspect -f '{{.Id}}' "$image_id" > "$out/image" || exit 2
{ echo "harness $(git -C "$repo" rev-parse HEAD)"; echo "sources $(git -C "$src" rev-parse HEAD)"; } > "$out/source"
git -C "$src" status --porcelain -- packages/datomic > "$out/dirty"
[[ -s $out/dirty ]] && { echo "run2.sh: the gateway sources of $src differ from its HEAD" >&2; exit 2; }
mkdir -p "$out/src" "$out/exp"
cp -R "$src/packages/datomic/gateway/src/." "$out/src/"; cp "$src/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
for d in wfix1 w2 s5 rd6 rd7; do cp -R "$repo/lab/experiments/EXP-DX1/$d" "$out/exp/"; done
common="TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TRIPLEX_TRACE_LEVEL=off TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure PREP1_ATTEMPT=dx-rd6-r2"
base="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1 TX2_GROUP_COMMIT=0"
grouped="TX2_PREDECESSOR_LOOKUP=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TRIPLEX_TRACE_LEVEL=off TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure PREP1_ATTEMPT=dx-rd6-r2 TX2_SUBJECT_SAVE=0 TX2_GROUP_COMMIT=1 TX2_GROUP_STAGE_CLOCK=1 TX2_GROUP_FAST_REPLY=1 TX2_GROUP_REUSE_PREPARED=1 TX2_LIVE_PRIORITY=1 TX2_GROUP_MAX_MEMBERS=32 TX2_SMALL_ROWS=1 TX2_SAVE_LEDGER=1"
removal="TX2_REMOVAL_PER_ACCOUNT=1 TX2_REMOVAL_SUBJECT_CHECK=1 TX2_REMOVAL_REPLAY_RULE=1 TX2_REMOVAL_COMMIT_BOUNDARY=1"
settings=(
  "server:$common $base" "serial:$common $base TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "import:$common $base TX2_IMPORT_WHOLE_SUBJECT=1 TX2_REMOVAL_COST_READBACK=1" "hints:$common $base TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"
  "general:$common TX2_SUBJECT_SAVE=0 TX2_GROUP_COMMIT=0" "grouped:$grouped"
  "ownerhead:$common TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_OWNER_HEAD=1 TX2_GROUP_COMMIT=0"
  "index:$common $base TX2_CROSS_INDEX=1" "accounts:$common $base TX2_ACCOUNT_CLAIMS=1"
  "server-removal:$common $base $removal" "serial-removal:$common $base TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1 $removal"
  "general-removal:$common TX2_SUBJECT_SAVE=0 TX2_GROUP_COMMIT=0 $removal" "grouped-removal:$grouped $removal"
)
case $mode in
  attack) expr="(rd6-attacks/attack-main)" ;; fuzz) expr="(rd6-attacks/fuzz-main)" ;; review2) expr="(rd6-review2/main)" ;;
  *) echo "mode $mode?" >&2; exit 2 ;;
esac
load="-i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj -i /exp/s5/fuzz.clj -i /exp/rd7/audit.clj -i /exp/rd6/attacks.clj -i /exp/rd6/review2.clj"
status=0
for entry in $wanted; do
  line=; for s in "${settings[@]}"; do [[ ${s%%:*} == "$entry" ]] && line=${s#*:}; done
  [[ -n $line ]] || { echo "unknown setting $entry" >&2; exit 2; }
  envs=(); for kv in $line ${RD6_EXTRA_ENV:-}; do envs+=(-e "$kv"); done
  name=tx2-dxrd6-r2-$$-$mode-$entry
  echo "$(date '+%F %T %Z') start $name ($storage)" >> "$out/runs.log"
  java="java -Xmx2g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp /opt/gateway/src:\$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath) clojure.main $load -e '$expr'"
  if [[ $storage == pg ]]; then
    docker run --rm --name "$name" --label dx-rd6=r2 --pull never --memory 4g --cpus 2 "${envs[@]}" \
      -e S5_SEEDS -e S5_STEPS -e S5_ROUNDS -e S5_THREADS -e S5_PER_THREAD -e S5_PROTECTED -e S5_REMOVALS -e S5_ACCOUNTS -e S5_TRANSITION -e S5_FAULTS \
      -e RD6_JAVA="$java" -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/gateway/codec-spec.json:ro" -v "$out/exp:/exp:ro" \
      --entrypoint /bin/bash "$image_id" /exp/rd6/pg-container.sh > "$out/$mode-$entry.log" 2>&1 || status=1
  else
    docker run --rm --name "$name" --label dx-rd6=r2 --pull never --memory 3g --cpus 2 "${envs[@]}" \
      -e S5_SEEDS -e S5_STEPS -e S5_ROUNDS -e S5_THREADS -e S5_PER_THREAD -e S5_PROTECTED -e S5_REMOVALS -e S5_ACCOUNTS -e S5_TRANSITION -e S5_FAULTS \
      -v "$out/src:/opt/gateway/src:ro" -v "$out/codec-spec.json:/opt/gateway/codec-spec.json:ro" -v "$out/exp:/exp:ro" \
      --entrypoint /bin/bash "$image_id" -c "mkdir -p /tmp/erasure && cd /opt/datomic && $java" > "$out/$mode-$entry.log" 2>&1 || status=1
  fi
  echo "$(date '+%F %T %Z') end $name status $status" >> "$out/runs.log"
  echo "$entry: $(grep -E '^DX-RD6(R2)?_(RESULT|FUZZ) ' "$out/$mode-$entry.log" | cut -c1-300 || echo 'no summary')"
done
rm -rf "$out/src" "$out/exp"
echo "DX-RD6_R2_EXIT $status"
exit "$status"

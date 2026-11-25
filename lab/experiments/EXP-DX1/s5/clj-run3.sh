#!/usr/bin/env bash
# [DX-S5 third review] In-memory runs on the reviewer's image (s5/image3.sh), by image ID, nothing mounted but the output
# directory. One writer setting per JVM.
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S5R3-clj -- bash lab/experiments/EXP-DX1/s5/clj-run3.sh OUT MODE SETTINGS
# MODE: attack3 (s5/attack3_gate.clj on the head), attack2 (the second review's tests as the builder updated them), era (s5/attack3_era.clj on the removal branch's tree), fuzz (s5/fuzz.clj;
# S5_FAULTS, S5_ACCOUNTS, S5_TRANSITION, S5_PROTECTED, S5_REMOVALS), idents (s3/idents.clj on the tree S5_BUILD names:
# head, s6a, base, era2), logdigest (s5/logdigest.clj on the tree S5_BUILD names). Development only, never counted: S5_DEV_TESTS=1 mounts the working tree's test files.
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}
mode=${2:?mode}
wanted=${3:-server}
[[ ! -e $out ]] || { echo "clj-run3.sh: $out exists" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
head=$(git -C "$repo" rev-parse HEAD)
ref=${DX_S5_IMAGE:-tx2-dxs5r3:${head:0:12}}
image_id=$(docker image inspect -f '{{.Id}}' "$ref") || { echo "clj-run3.sh: build $ref with s5/image3.sh first" >&2; exit 2; }
source=$(docker image inspect -f '{{index .Config.Labels "tx2.dx-s5r3.source"}}' "$image_id")
dev=()
[[ ${S5_DEV_TESTS:-0} == 1 ]] && dev=(-v "$repo/lab/experiments/EXP-DX1:/exp:ro")
build=${S5_BUILD:-head}
case $mode in era) build=era2 ;; esac
if [[ $build == head ]]; then src=/opt/gateway/src spec=/opt/gateway/codec-spec.json
else src=/opt/builds/$build/packages/datomic/gateway/src spec=/opt/builds/$build/packages/datomic/src/codec-spec.json; fi
echo "DX-S5R3_IMAGE $ref $image_id source ${source:-none} head $head build $build devTests ${S5_DEV_TESTS:-0}" | tee "$out/image"
git -C "$repo" status --short > "$out/dirty"
base="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1"
settings=(
  "server:$base"
  "serial:$base TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "hints:$base TX2_SUBJECT_HINTS=1"
  "general:TX2_SUBJECT_SAVE=0"
  "bound:$base TX2_IMPORT_WHOLE_SUBJECT=1 TX2_REMOVAL_COST_READBACK=1 TX2_READ_SET_BOUND=1"
  "accounts-off:$base"
  "accounts-on:$base TX2_ACCOUNT_CLAIMS=1"
  "accounts-on-serial:$base TX2_ACCOUNT_CLAIMS=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "accounts-on-general:TX2_SUBJECT_SAVE=0 TX2_ACCOUNT_CLAIMS=1"
  # The gateway's default (predecessor lookup off): the general writer is the fixed ident :triplex/commit.
  "accounts-on-nopred:$base TX2_ACCOUNT_CLAIMS=1 TX2_PREDECESSOR_LOOKUP=0"
  "accounts-on-general-nopred:TX2_SUBJECT_SAVE=0 TX2_ACCOUNT_CLAIMS=1 TX2_PREDECESSOR_LOOKUP=0"
  "accounts-on-import:$base TX2_ACCOUNT_CLAIMS=1 TX2_IMPORT_PIPELINE=1"
  "group-accounts:$base TX2_ACCOUNT_CLAIMS=1 TX2_GROUP_COMMIT=1"
  "era-server:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1"
  "era-per-account:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1 TX2_REMOVAL_PER_ACCOUNT=1"
  "idents-base:TX2_SUBJECT_SAVE=0"
  "idents-server:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1"
  "idents-server-wide:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_WIDE=1"
  "idents-serial-retire:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "idents-owner-head:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_OWNER_HEAD=1"
  "idents-load-profile:TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_LOAD1_PROFILE=1"
)
pre="-i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj"
case $mode in
  fuzz) files="$pre -i /exp/s5/fuzz.clj"; expr="(s5-fuzz/main)" ;;
  attack3) files="$pre -i /exp/s5/fuzz.clj -i /exp/s5/attack3_gate.clj"; expr="(s5-attack3/main)" ;;
  attack2) files="$pre -i /exp/s5/fuzz.clj -i /exp/s5/attack_gate.clj -i /exp/s5/attack2_gate.clj"; expr="(s5-attack2/main)" ;;
  era) files="$pre -i /exp/s5/attack3_era.clj"; expr="(s5-attack3-era/main)" ;;
  idents) files=""; expr="" ;;
  logdigest) files="$pre -i /exp/s5/attack3_era.clj -i /exp/s5/logdigest.clj"; expr="(s5-logdigest/main)" ;;
  *) echo "mode $mode?" >&2; exit 2 ;;
esac
status=0
for entry in $wanted; do
  line=
  for s in "${settings[@]}"; do [[ ${s%%:*} == "$entry" ]] && line=${s#*:}; done
  [[ -n $line ]] || { echo "unknown setting $entry" >&2; exit 2; }
  envs=(); for kv in $line; do envs+=(-e "$kv"); done
  name=tx2-dxs5r3-clj-$$-$entry
  if [[ $mode == idents ]]; then
    cmd="cd /opt/datomic && java -Xmx1g -XX:+UseSerialGC -Dtriplex.codec.spec=$spec -cp \"$src:\$(bin/classpath)\" clojure.main /exp/s3/idents.clj"
  else
    cmd="mkdir -p /tmp/erasure && cd /opt/datomic && java -Xmx2g -XX:+UseSerialGC -Dtriplex.codec.spec=$spec -cp \"$src:\$(bin/classpath)\" clojure.main $files -e '$expr'"
  fi
  # Defaults first; the setting's own values follow and win.
  docker run --rm --name "$name" --label dx-s5r3=clj --pull never --memory 3g \
    -e TX2_GROUP_COMMIT=0 -e TX2_LIVE_PRIORITY=0 -e TX2_PREDECESSOR_LOOKUP=1 -e TX2_LEAN_NATIVE_QUERY=1 -e TX2_LEAN_NATIVE_LOG=1 \
    -e TRIPLEX_TRACE_LEVEL=off -e TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure -e PREP1_ATTEMPT=dx-s5r3-clj "${envs[@]}" \
    -e S5_SEEDS -e S5_STEPS -e S5_ROUNDS -e S5_THREADS -e S5_PER_THREAD -e S5_FAULTS -e S5_ACCOUNTS -e S5_ONLY -e S5_TRANSITION \
    -e S5_PROTECTED -e S5_REMOVALS \
    ${dev[@]+"${dev[@]}"} --entrypoint /bin/bash "$image_id" -c "$cmd" > "$out/$mode-$entry.log" 2>&1 || status=1
  echo "$entry: $(grep -E '^DX-S5(R2|R3)?_RESULT |^DX-S3_IDENTS |^DX-S5R3_LOG ' "$out/$mode-$entry.log" | cut -c1-400 || echo 'no summary')"
done
echo "DX-S5R3_CLJ_EXIT $status"
exit "$status"

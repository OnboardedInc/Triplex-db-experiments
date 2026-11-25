#!/usr/bin/env bash
# [DX-S3] The several-owners writer's serial-point gates (s3/owners_gate.clj) in memory, inside the lab Datomic image
# (sources mounted read-only), under several writer settings. One ordinary heavy token:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S3-clj -- bash lab/experiments/EXP-DX1/s3/clj-gates.sh OUT
set -uo pipefail
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM socket}"
out=${1:?new output directory}
[[ ! -e $out ]] || { echo "clj-gates.sh: $out exists" >&2; exit 2; }
mkdir -p "$out"
here=$(cd "$(dirname "$0")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
image=${DX_S3_IMAGE:-tx2-datomic:dx-real2-production}
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --short > "$out/dirty"
base="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_SEVERAL_OWNERS=1"
settings=(
  "several:$base"
  "several-serial:$base TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1"
  "several-hints:$base TX2_SUBJECT_HINTS=1"
)
status=0
for entry in ${DX_S3_CLJ_SETTINGS:-several several-serial several-hints}; do
  line=
  for s in "${settings[@]}"; do [[ ${s%%:*} == "$entry" ]] && line=${s#*:}; done
  [[ -n $line ]] || { echo "unknown setting $entry" >&2; exit 2; }
  envs=(); for kv in $line; do envs+=(-e "$kv"); done
  name=tx2-dxs3-clj-$$
  docker run --rm --name "$name" --pull never --memory 3g "${envs[@]}" \
    -e TX2_GROUP_COMMIT=0 -e TX2_LIVE_PRIORITY=0 -e TX2_PREDECESSOR_LOOKUP=1 -e TX2_LEAN_NATIVE_QUERY=1 -e TX2_LEAN_NATIVE_LOG=1 \
    -e TRIPLEX_TRACE_LEVEL=off -e TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure -e PREP1_ATTEMPT=dx-s3-clj \
    -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
    -v "$repo/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro" \
    -v "$repo/lab/experiments/EXP-DX1:/exp:ro" --entrypoint /bin/bash "$image" -c '
      mkdir -p /tmp/erasure && cd /opt/datomic && java -Xmx2g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
        -cp "/opt/gateway/src:$(bin/classpath)" clojure.main -i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj \
        -i /exp/s3/owners_gate.clj -e "
          (let [r (clojure.test/run-tests (quote owners-gate))]
            (println \"DX-S3_CLJ\" (clojure.data.json/write-str (select-keys r [:test :pass :fail :error])))
            (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))"' > "$out/clj-$entry.log" 2>&1 || status=1
  echo "$entry: $(grep -E '^DX-S3_CLJ ' "$out/clj-$entry.log" || echo 'no summary')"
done
echo "DX-S3_CLJ_EXIT $status"
exit "$status"

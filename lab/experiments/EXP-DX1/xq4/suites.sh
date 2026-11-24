#!/usr/bin/env bash
# [DX-XQ4] The gateway's in-memory Clojure suites with this branch's gateway, TX2_CROSS_INDEX unset and set (G8), plus
# the key-encoding test. One ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-XQ4-suites -- bash lab/experiments/EXP-DX1/xq4/suites.sh NEW_ABSOLUTE_DIR
set -uo pipefail
out=${1:?absolute new output directory under /Users}
[[ $out == /Users/* && ! -e $out ]] || { echo "suites.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
mkdir -p "$out"
cp -R "$repo/packages/datomic/gateway" "$out/gateway"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
suites="triplex.gateway.selftest triplex.gateway.commit-order-test triplex.gateway.cache-key-test triplex.gateway.group-test triplex.gateway.feed-test triplex.gateway.recent-test triplex.gateway.pinned-test triplex.gateway.trace-test triplex.gateway.ids-test triplex.gateway.cross-index-test"
status=0
for index in unset 1; do
  env=(); [[ $index == 1 ]] && env=(-e TX2_CROSS_INDEX=1)
  docker run --rm --pull never --name "tx2-dxxq4-suites-$$" --memory 3g --cpus 2 \
    -v "$out/gateway:/opt/gateway:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" ${env[@]+"${env[@]}"} \
    -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}' -e DATOMIC_JAVA_OPTS=-Dtriplex.codec.spec=/opt/spec/codec-spec.json \
    -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src --entrypoint /opt/datomic/bin/run tx2-datomic:dx-real2-production \
    -e "(require 'clojure.test) (def nss (quote [$suites])) (apply require nss)
        (let [r (apply clojure.test/run-tests nss)] (println \"XQ4_SUITES $index\" (pr-str (select-keys r [:test :pass :fail :error])))
          (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))" > "$out/suites-$index.log" 2>&1 || status=1
  grep -E "XQ4_SUITES|FAIL in|ERROR in" "$out/suites-$index.log" | head -20
done
rm -rf "$out/gateway"
exit "$status"

#!/usr/bin/env bash
# [DX-SCALE2] The gateway's in-memory Clojure suites with this branch's gateway: the sweep gate test (eviction off and
# on, bound per test), the ID list test and the selftest, with TX2_SWEEP=1, and the scan statistics route showing the
# gate count. One ordinary heavy token; DOCKER_HOST must name the lab VM's socket:
#   node lab/bin/heavy.mjs --label DX-SCALE2-gates -- bash lab/experiments/EXP-DX1/scale2/gates-test.sh NEW_ABSOLUTE_DIR
set -uo pipefail
out=${1:?absolute new output directory}
[[ $out == /* && ! -e $out ]] || { echo "gates-test.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(git rev-parse --show-toplevel)
mkdir -p "$out"
cp -R "$repo/packages/datomic/gateway" "$out/gateway"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
image=${DX_SCALE2_IMAGE:-tx2-datomic:1.0.7745-da00}
suites=${DX_SCALE2_SUITES:-"triplex.gateway.sweep-gates-test triplex.gateway.ids-test triplex.gateway.selftest"}
status=0
for arm in unset 1; do
  env=(-e TX2_SWEEP=1); [[ $arm == 1 ]] && env+=(-e TX2_SWEEP_GATE_EVICT=1)
  cat > "$out/run-$arm.clj" <<CLJ
(require 'clojure.test) (def nss (quote [$suites])) (apply require nss) (require 'triplex.gateway.main)
(let [r (apply clojure.test/run-tests nss)
      stats (triplex.gateway.main/route-handler-base {:request-method :get :uri "/v2/admin/scan-stats" :body nil})]
  (println "SCALE2_SUITES $arm" (pr-str (select-keys r [:test :pass :fail :error])))
  (println "SCALE2_SCAN_STATS $arm" (:status stats) (re-find #"\"sweepGates\":[0-9]+" (str (:body stats))))
  (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
CLJ
  docker run --rm --pull never --name "tx2-dxscale2-suites-$$-$arm" --memory 3g --cpus 2 \
    -v "$out/gateway:/opt/gateway:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" -v "$out/run-$arm.clj:/opt/run.clj:ro" \
    "${env[@]}" -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}' -e DF01_RECORDED_PAGE=/tmp/recorded-page.json --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
    > "$out/suites-$arm.log" 2>&1 || status=1
  grep -E "SCALE2_SUITES|SCALE2_SCAN_STATS|FAIL in|ERROR in" "$out/suites-$arm.log" | head -20
done
rm -rf "$out/gateway"
exit "$status"

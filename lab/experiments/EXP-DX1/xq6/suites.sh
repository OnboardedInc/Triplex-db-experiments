#!/usr/bin/env bash
# [DX-XQ6] The gateway's in-memory Clojure suites with this branch's gateway (sweep.clj loaded, admission.clj's
# *own-pool* added), TX2_SWEEP unset and set, plus "off means absent": with TX2_SWEEP unset POST /v2/db/{db}/sweep
# answers 404 {"code":"NotFound"} as before. One ordinary heavy token; DOCKER_HOST must name the lab VM's socket:
#   node lab/bin/heavy.mjs --label DX-XQ6-suites -- bash lab/experiments/EXP-DX1/xq6/suites.sh NEW_ABSOLUTE_DIR
set -uo pipefail
out=${1:?absolute new output directory}
[[ $out == /* && ! -e $out ]] || { echo "suites.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(git rev-parse --show-toplevel)
mkdir -p "$out"
# [DX-INT4] Start from one image ID, never a fixed shared tag another builder can retag (lab/bin/gate-image.sh).
. "$repo/lab/bin/gate-image.sh"
image=$(gate_image "${XQ6_IMAGE:-tx2-datomic:dx-real2-production}" "$out/image.json") || exit 2
cp -R "${XQ6_GATEWAY:-$repo/packages/datomic/gateway}" "$out/gateway"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
suites=${XQ6_SUITES:-"triplex.gateway.selftest triplex.gateway.commit-order-test triplex.gateway.cache-key-test triplex.gateway.group-test triplex.gateway.feed-test triplex.gateway.recent-test triplex.gateway.pinned-test triplex.gateway.trace-test triplex.gateway.ids-test"}
status=0
for arm in unset 1; do
  env=(); [[ $arm == 1 ]] && env=(-e TX2_SWEEP=1)
  cat > "$out/run-$arm.clj" <<CLJ
(require 'clojure.test) (def nss (quote [$suites])) (apply require nss) (require 'triplex.gateway.main)
(let [r (apply clojure.test/run-tests nss)
      absent (triplex.gateway.main/route-handler-base {:request-method :post :uri "/v2/db/s2-xq6off/sweep" :body nil})]
  (println "XQ6_SUITES $arm" (pr-str (select-keys r [:test :pass :fail :error])))
  (println "XQ6_SWEEP_ROUTE $arm" (:status absent) (:body absent))
  (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
CLJ
  docker run --rm --pull never --name "tx2-dxxq6-suites-$$" --memory 3g --cpus 2 \
    -v "$out/gateway:/opt/gateway:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" -v "$out/run-$arm.clj:/opt/run.clj:ro" \
    ${env[@]+"${env[@]}"} -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}' -e DF01_RECORDED_PAGE=/tmp/recorded-page.json --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
    > "$out/suites-$arm.log" 2>&1 || status=1
  grep -E "XQ6_SUITES|XQ6_SWEEP_ROUTE|FAIL in|ERROR in" "$out/suites-$arm.log" | head -20
done
rm -rf "$out/gateway"
exit "$status"

#!/usr/bin/env bash
# [DX-XQ7] The gateway's in-memory Clojure suites with this branch's gateway in three arms: every option unset;
# TX2_READ_IO_COUNTERS=1 with the ID lists and the sweep on; and TX2_ID_LIST_QUEUE_MS=200, where exactly one assertion
# of ids_test (line 140: a second ID list of a busy account is refused at once) must fail, because the queue makes that
# request wait instead (review finding D7). Plus "off means as before": with the options unset the ID list and sweep
# routes answer 404 NotFound and the guard passes every request. One ordinary heavy token; DOCKER_HOST must name the lab VM's socket:
#   node lab/bin/heavy.mjs --label DX-XQ7-suites -- bash lab/experiments/EXP-DX1/xq7/suites.sh NEW_ABSOLUTE_DIR
set -uo pipefail
out=${1:?absolute new output directory}
[[ $out == /* && ! -e $out ]] || { echo "suites.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(git rev-parse --show-toplevel)
mkdir -p "$out"
cp -R "$repo/packages/datomic/gateway" "$out/gateway"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
suites=${XQ7_SUITES:-"triplex.gateway.question-reader-test triplex.gateway.selftest triplex.gateway.commit-order-test triplex.gateway.cache-key-test triplex.gateway.group-test triplex.gateway.feed-test triplex.gateway.recent-test triplex.gateway.pinned-test triplex.gateway.trace-test triplex.gateway.ids-test"}
status=0
for arm in unset set queue; do
  env=()
  [[ $arm == set ]] && env=(-e TX2_READ_IO_COUNTERS=1 -e TX2_ID_LISTS=1 -e TX2_SWEEP=1)
  [[ $arm == queue ]] && env=(-e TX2_ID_LIST_QUEUE_MS=200 -e TX2_ID_LISTS=1)
  cat > "$out/run-$arm.clj" <<CLJ
(require 'clojure.test) (def nss (quote [$suites])) (apply require nss) (require 'triplex.gateway.main)
(let [r (apply clojure.test/run-tests nss)
      ids (triplex.gateway.main/route-handler-base {:request-method :post :uri "/v2/db/s2-xq7off/ids" :body nil})
      sweep (triplex.gateway.main/route-handler-base {:request-method :post :uri "/v2/db/s2-xq7off/sweep" :body nil})
      guarded (count (remove nil? (map #(triplex.gateway.question-reader/guard {:request-method :post :uri (str "/v2/db/s2-xq7off/" %)}) ["ids" "sweep" "find" "read"])))
      stats (triplex.gateway.main/route-handler-base {:request-method :get :uri "/v2/admin/scan-stats"})]
  (println "XQ7_SUITES $arm" (pr-str (select-keys r [:test :pass :fail :error])))
  (println "XQ7_ROUTES $arm ids" (:status ids) (:body ids) "sweep" (:status sweep) (:body sweep))
  (println "XQ7_GUARD $arm refusals" guarded "enabled" triplex.gateway.question-reader/enabled "readIo" triplex.gateway.question-reader/read-io-enabled
           "queue" triplex.gateway.ids/list-queue-ms "stats-keys" (pr-str (sort (keys (clojure.data.json/read-str (:body stats))))))
  (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
CLJ
  docker run --rm --pull never --name "tx2-dxxq7-suites-$$" --memory 3g --cpus 2 \
    -v "$out/gateway:/opt/gateway:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" -v "$out/run-$arm.clj:/opt/run.clj:ro" \
    ${env[@]+"${env[@]}"} -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}' -e DF01_RECORDED_PAGE=/tmp/recorded-page.json --entrypoint /bin/bash tx2-datomic:dx-real2-production -c \
    'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
    > "$out/suites-$arm.log" 2>&1
  code=$?
  if [[ $arm == queue ]]; then
    # The one expected difference: ids_test.clj:140, and nothing else.
    [[ $(grep -c "FAIL in" "$out/suites-$arm.log") == 1 && $(grep -c "FAIL in (id-lists) (ids_test.clj:140)" "$out/suites-$arm.log") == 1 ]] || status=1
  elif [[ $code != 0 ]]; then
    # The feed test's known error (feed-test/http-route, the same on the base) is the only one allowed.
    [[ $(grep -c "FAIL in" "$out/suites-$arm.log") == 0 && $(grep -c "ERROR in" "$out/suites-$arm.log") == 1 && $(grep -c "ERROR in (http-route)" "$out/suites-$arm.log") == 1 ]] || status=1
  fi
  grep -E "XQ7_SUITES|XQ7_ROUTES|XQ7_GUARD|FAIL in|ERROR in" "$out/suites-$arm.log" | head -30
done
rm -rf "$out/gateway"
exit "$status"

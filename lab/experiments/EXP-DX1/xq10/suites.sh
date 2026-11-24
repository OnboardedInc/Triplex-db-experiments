#!/usr/bin/env bash
# [DX-XQ10] The gateway's in-memory Clojure suites on the merged head, in every arm the three pieces ran:
#   unset   every option unset (G8 of the index, gate (e) of the question reader, 9s of the shapes)
#   index   TX2_CROSS_INDEX=1 (the index branch's second arm)
#   routes  TX2_READ_IO_COUNTERS=1, TX2_ID_LISTS=1, TX2_SWEEP=1, TX2_SWEEP_SHAPES=all (question reader "set", shapes "on")
#   queue   TX2_ID_LIST_QUEUE_MS=200, TX2_ID_LISTS=1 (the one admission in its queued state)
# plus "off means as before": with the options unset the ID list and sweep routes answer 404, find answers 409 IndexOff,
# and the question reader's guard passes every request. One ordinary heavy token; DOCKER_HOST names the lab VM:
#   node lab/bin/heavy.mjs --label DX-XQ10-suites -- bash lab/experiments/EXP-DX1/xq10/suites.sh NEW_ABSOLUTE_DIR
set -uo pipefail
out=${1:?absolute new output directory under /Users}
[[ $out == /Users/* && ! -e $out ]] || { echo "suites.sh: give a new absolute output directory under /Users" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(git rev-parse --show-toplevel)
image=${DX_XQ10_IMAGE:-tx2-datomic:dx-real2-production}
# Shared tags are rebuilt by other builders: start by the ID resolved now; each container's image is recorded below.
image=$(docker image inspect --format '{{.Id}}' "$image") || exit 1
mkdir -p "$out"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway > "$out/dirty"
echo "$image" > "$out/image-id"
cp -R "$repo/packages/datomic/gateway" "$out/gateway"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
base="triplex.gateway.selftest triplex.gateway.commit-order-test triplex.gateway.cache-key-test triplex.gateway.group-test triplex.gateway.feed-test triplex.gateway.recent-test triplex.gateway.pinned-test triplex.gateway.trace-test triplex.gateway.ids-test triplex.gateway.cross-index-test triplex.gateway.question-reader-test"
status=0
for arm in ${XQ10_ARMS:-unset index routes queue}; do
  env=() suites=$base
  case $arm in
    index) env=(-e TX2_CROSS_INDEX=1) ;;
    routes) env=(-e TX2_READ_IO_COUNTERS=1 -e TX2_ID_LISTS=1 -e TX2_SWEEP=1 -e TX2_SWEEP_SHAPES=all); suites="$base triplex.gateway.sweep-shapes-test" ;;
    queue) env=(-e TX2_ID_LIST_QUEUE_MS=200 -e TX2_ID_LISTS=1) ;;
  esac
  cat > "$out/run-$arm.clj" <<CLJ
(require 'clojure.test) (def nss (quote [$suites])) (apply require nss) (require 'triplex.gateway.main)
(let [r (apply clojure.test/run-tests nss)
      call (fn [action] (let [x (triplex.gateway.main/route-handler {:request-method :post :uri (str "/v2/db/s2-xq10off/" action) :body nil})]
                          [(:status x) (let [b (:body x)] (if (bytes? b) (String. ^bytes b "UTF-8") b))]))
      guarded (count (remove nil? (map #(triplex.gateway.question-reader/guard {:request-method :post :uri (str "/v2/db/s2-xq10off/" %)}) ["ids" "sweep" "find" "read"])))]
  (println "XQ10_SUITES $arm" (pr-str (select-keys r [:test :pass :fail :error])))
  (println "XQ10_ROUTES $arm ids" (pr-str (call "ids")) "sweep" (pr-str (call "sweep")))
  (println "XQ10_GUARD $arm refusals" guarded "queue" triplex.gateway.ids/list-queue-ms "findPermits" (some? triplex.gateway.ids/find-permits))
  (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
CLJ
  name="tx2-dxxq10-suites-$arm-$$"
  docker run --pull never --name "$name" --memory 3g --cpus 2 \
    -v "$out/gateway:/opt/gateway:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" -v "$out/run-$arm.clj:/opt/run.clj:ro" \
    ${env[@]+"${env[@]}"} -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}' -e DF01_RECORDED_PAGE=/tmp/recorded-page.json --entrypoint /bin/bash "$image" -c \
    'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
    > "$out/suites-$arm.log" 2>&1 || status=1
  ran=$(docker inspect --format '{{.Image}}' "$name"); echo "$arm $ran" >> "$out/container-images"
  [[ $ran == "$image" ]] || { echo "XQ10_IMAGE_CHECK FAIL $arm ran $ran, pinned $image"; status=1; }
  docker rm -f "$name" >/dev/null 2>&1
  grep -E "XQ10_|FAIL in|ERROR in" "$out/suites-$arm.log" | head -20
done
rm -rf "$out/gateway"
exit "$status"

#!/usr/bin/env bash
# [DX-XQ9] The gateway's in-memory Clojure suites in one container, with an environment per arm. One ordinary heavy token;
# DOCKER_HOST must name the lab VM's socket:
#   node lab/bin/heavy.mjs --label DX-XQ9-unit -- bash lab/experiments/EXP-DX1/xq9/unit.sh NEW_ABSOLUTE_DIR "NS ..." [ENV=VALUE ...]
# Example: unit.sh /abs/out "triplex.gateway.sweep-shapes-test" TX2_SWEEP=1 TX2_SWEEP_SHAPES=all
set -uo pipefail
out=${1:?absolute new output directory}; suites=${2:?namespaces}; shift 2
[[ $out == /* && ! -e $out ]] || { echo "unit.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(git rev-parse --show-toplevel)
mkdir -p "$out"
cp -R "${XQ9_GATEWAY:-$repo/packages/datomic/gateway}" "$out/gateway"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
env=(); for kv in "$@"; do env+=(-e "$kv"); done
cat > "$out/run.clj" <<CLJ
(require 'clojure.test) (def nss (quote [$suites])) (apply require nss) (require 'triplex.gateway.main)
(let [r (with-redefs [triplex.gateway.main/uri-template "datomic:mem://{db}"] (apply clojure.test/run-tests nss))
      absent (triplex.gateway.main/route-handler-base {:request-method :post :uri "/v2/db/s2-xq9off/sweep" :body nil})]
  (println "XQ9_UNIT" (pr-str (select-keys r [:test :pass :fail :error])))
  (println "XQ9_SWEEP_ROUTE" (:status absent) (:body absent))
  (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
CLJ
docker run --rm --pull never --name "tx2-dxxq9-unit-$$" --memory 3g --cpus 2 \
  -v "$out/gateway:/opt/gateway:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" -v "$out/run.clj:/opt/run.clj:ro" \
  ${env[@]+"${env[@]}"} -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}' -e DF01_RECORDED_PAGE=/tmp/recorded-page.json --entrypoint /bin/bash tx2-datomic:dx-real2-production -c \
  'cd /opt/datomic && java -Xmx2g -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
  > "$out/unit.log" 2>&1
status=$?
grep -E "XQ9_UNIT|XQ9_SWEEP_ROUTE|FAIL in|ERROR in|expected:|actual:|Exception|Syntax error|Caused by" "$out/unit.log" | head -60
rm -rf "$out/gateway"
exit "$status"

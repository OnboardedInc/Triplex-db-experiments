#!/usr/bin/env bash
# [DX-RPT1] The gateway's in-memory Clojure suites with this branch's gateway (privacy.clj's opt-in omission of
# protected values, the echo on journal pages and row reads) plus omit-protected-test, started from one image ID.
# One ordinary heavy token; DOCKER_HOST must name the lab VM's socket:
#   RPT1_IMAGE=sha256:... node lab/bin/heavy.mjs --label DX-RPT1-suites -- bash lab/experiments/EXP-DX1/rpt1/suites.sh NEW_ABSOLUTE_DIR
set -uo pipefail
out=${1:?absolute new output directory}
[[ $out == /* && ! -e $out ]] || { echo "suites.sh: give a new absolute output directory" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
repo=$(git rev-parse --show-toplevel)
mkdir -p "$out"
. "$repo/lab/bin/gate-image.sh"
image=$(gate_image "${RPT1_IMAGE:?give the Datomic image ID}" "$out/image.json") || exit 2
cp -R "$repo/packages/datomic/gateway" "$out/gateway"
cp "$repo/packages/datomic/src/codec-spec.json" "$out/codec-spec.json"
suites="triplex.gateway.omit-protected-test triplex.gateway.selftest triplex.gateway.commit-order-test triplex.gateway.cache-key-test triplex.gateway.group-test triplex.gateway.feed-test triplex.gateway.recent-test triplex.gateway.pinned-test triplex.gateway.trace-test triplex.gateway.ids-test"
cat > "$out/run.clj" <<CLJ
(require 'clojure.test) (def nss (quote [$suites])) (apply require nss)
(let [r (apply clojure.test/run-tests nss)]
  (println "RPT1_SUITES" (pr-str (select-keys r [:test :pass :fail :error])))
  (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
CLJ
name="tx2-dxrpt1-suites-$$"
docker run --rm --pull never --name "$name" --memory 2g --cpus 2 \
  -v "$out/gateway:/opt/gateway:ro" -v "$out/codec-spec.json:/opt/spec/codec-spec.json:ro" -v "$out/run.clj:/opt/run.clj:ro" \
  -e DATOMIC_URI_TEMPLATE='datomic:mem://{db}' -e DF01_RECORDED_PAGE=/tmp/recorded-page.json --entrypoint /bin/bash "$image" -c \
  'cd /opt/datomic && java -Xmx1500m -Ddatomic.objectCacheMax=256m -Ddatomic.memoryIndexMax=256m -Dtriplex.codec.spec=/opt/spec/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main /opt/run.clj' \
  > "$out/suites.log" 2>&1
status=$?
grep -E "RPT1_SUITES|FAIL in|ERROR in" "$out/suites.log" | head -20
rm -rf "$out/gateway"
exit "$status"

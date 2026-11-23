#!/usr/bin/env bash
# [DX-RD2] Inside one lab container for the pinned-probe Mac gates: a transactor and this branch's gateway.
# Dev storage by default (pinned-probe-gate.ts); pinned-probe-server-gate.sh passes PostgreSQL storage through
# RD2_TX_PROPERTIES and DATOMIC_URI_TEMPLATE. Diagnostic only.
set -euo pipefail
cd /opt/datomic
props=${RD2_TX_PROPERTIES:-/tmp/tx.properties}
if [[ -z ${RD2_TX_PROPERTIES:-} ]]; then
cat > "$props" <<P
protocol=dev
host=localhost
port=4334
memory-index-threshold=32m
memory-index-max=256m
object-cache-max=128m
P
fi
DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/transactor -Xmx1g -Xms256m "$props" > /tmp/tx.log 2>&1 &
for i in $(seq 1 120); do grep -q "System started" /tmp/tx.log && break; sleep 1; done
grep -q "System started" /tmp/tx.log || { cat /tmp/tx.log; exit 1; }
# A transactor starts as standby and becomes active only after it has waited out any earlier heartbeat.
if [[ -n ${RD2_TX_PROPERTIES:-} ]]; then sleep "${RD2_ACTIVE_WAIT:-30}"; fi
export DATOMIC_URI_TEMPLATE=${DATOMIC_URI_TEMPLATE:-"datomic:dev://localhost:4334/{db}"}
exec java -server -Xmx768m -Ddatomic.objectCacheMax=64m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
  -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main -m triplex.gateway.main 8080

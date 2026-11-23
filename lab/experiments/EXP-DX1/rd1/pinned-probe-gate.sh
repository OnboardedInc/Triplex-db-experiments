#!/usr/bin/env bash
# [DX-RD2] Inside one lab container for the pinned-probe Mac gate: a dev-storage transactor and this branch's gateway.
# Started by pinned-probe-gate.ts; diagnostic only.
set -euo pipefail
cd /opt/datomic
cat > /tmp/tx.properties <<P
protocol=dev
host=localhost
port=4334
memory-index-threshold=32m
memory-index-max=256m
object-cache-max=128m
P
DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/transactor -Xmx1g -Xms256m /tmp/tx.properties > /tmp/tx.log 2>&1 &
for i in $(seq 1 120); do grep -q "System started" /tmp/tx.log && break; sleep 1; done
grep -q "System started" /tmp/tx.log
export DATOMIC_URI_TEMPLATE="datomic:dev://localhost:4334/{db}"
exec java -server -Xmx768m -Ddatomic.objectCacheMax=64m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
  -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main -m triplex.gateway.main 8080

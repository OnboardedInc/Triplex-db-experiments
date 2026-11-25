#!/usr/bin/env bash
# [DX-S5 third review] U1 inside the reviewer's image: one gateway of the head on Datomic's memory storage (one JVM, its
# transactor in process) and the SDK driver /opt/s5/u1.mjs. Times are diagnostic.
set -uo pipefail
cd /opt/datomic
work=/out/work; mkdir -p "$work"
export DATOMIC_URI_TEMPLATE="datomic:mem://{db}" DATOMIC_EXT_CLASSPATH=/opt/gateway/src
mkdir -p /tmp/erasure; export TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure
java -Xmx1500m -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "/opt/gateway/src:$(bin/classpath)" clojure.main -m triplex.gateway.main 18081 >> "$work/gw.log" 2>&1 &
gw=$!
for ((i=0; i<240; i++)); do node -e "fetch('http://127.0.0.1:18081/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" && break; sleep .5; done
echo "DX-S5R3_GATEWAYS healthy $(date -u +%T)"
node /opt/s5/u1.mjs http://127.0.0.1:18081 "$work" "${U1_PAIRS:-20000}" "${U1_ROWS:-40}" > "$work/driver.out" 2>&1
status=$?
grep -E '^DX-S5R3_DONE' "$work/driver.log" | cut -c1-4000
tail -3 "$work/driver.out" | cut -c1-400
grep -c "TRIPLEX_IDENTITY" "$work/gw.log" | sed 's/^/DX-S5R3_GATEWAY_IDENTITY_LINES /'
kill $gw
echo "DX-S5R3_STACK_DONE $status"
exit $status

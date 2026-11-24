#!/usr/bin/env bash
# [DX-RD5] Inside one lab container: PostgreSQL, a transactor and this branch's gateway as the writer. The Mac side seeds
# a deep toy (gate.ts); then two readers with a 32 MB object cache run side by side for the exactness comparison
# (8081: the tuned reader as merged; 8082: the same with the read prefetch and Datomic's read-ahead off), and finally
# four probe JVMs count what a cold pinned read loads with each option on and off (probe.clj). Diagnostic times only.
set -euo pipefail
cd /opt/datomic
work=$(mktemp -d); chmod 755 "$work"
install -d -o 65534 -g 65534 "$work/data" "$work/socket"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=$(node -p 'Object.values(require("node:os").networkInterfaces()).flat().find((x) => x.internal && x.family === "IPv4").address')
pids=()
trap 'for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; wait || true' EXIT
wait_tcp() { local i; for ((i=0; i<240; i++)); do kill -0 "$1"; if (exec 3<>/dev/tcp/"$addr"/"$2") 2>/dev/null; then return; fi; sleep .5; done; return 1; }
wait_file() { local i; for ((i=0; i<4800; i++)); do [[ -f $1 ]] && return 0; sleep .5; done; return 1; }
sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$work/socket" -U postgres "$@"; }
pg_run initdb -D "$work/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/postgres" -D "$work/data" -h "$addr" -k "$work/socket" \
  -c shared_buffers=256MB -c track_counts=on &
pids+=($!); wait_tcp "$!" 5432
secret=$(node -p "require('node:crypto').randomBytes(20).toString('hex')")
sql -d postgres -c "CREATE ROLE datomic LOGIN PASSWORD '$secret'"
sql -d postgres -c "CREATE DATABASE datomic TEMPLATE template0"
sql -d datomic -f bin/sql/postgres-table.sql
for s in fsync synchronous_commit full_page_writes; do [[ $(sql -d datomic -c "SHOW $s") == on ]]; done
cat >"$work/tx.properties" <<P
protocol=sql
host=$addr
alt-host=$addr
port=4334
sql-driver-class=org.postgresql.Driver
sql-url=jdbc:postgresql://$addr:5432/datomic
sql-user=datomic
sql-password=$secret
memory-index-threshold=32m
memory-index-max=256m
object-cache-max=128m
log-dir=$work
pid-file=$work/tx.pid
P
template="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
export DATOMIC_URI_TEMPLATE=$template
tx_opts="-Xms256m -Xmx1g -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError"
DATOMIC_EXT_CLASSPATH=/opt/gateway/src java -server $tx_opts -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main \
  -m datomic.launcher "$work/tx.properties" >> /out/transactor.log 2>&1 &
tx_pid=$!; pids+=($tx_pid); wait_tcp "$tx_pid" 4334
cp="$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)"
# $1 port, $2 extra JVM flags, then the gateway's environment assignments.
gateway() {
  local port=$1 flags=$2; shift 2
  env DATOMIC_EXT_CLASSPATH=/opt/gateway/src TRIPLEX_ERASURE_DIRECTORY=/out/erasure "$@" \
    java -server -Xms96m -Xmx768m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError $flags \
    -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "$cp" clojure.main -m triplex.gateway.main "$port" >> "/out/gateway-$port.log" 2>&1 &
  gw_pid=$!; pids+=($gw_pid); wait_tcp "$gw_pid" "$port"
}
stop() { kill "$1" 2>/dev/null || true; wait "$1" 2>/dev/null || true; }
mkdir -p /out/erasure
# The writer: the general writer with the predecessor lookup (the Mac side seeds and ages through it).
gateway 8080 "-Ddatomic.objectCacheMax=64m" TX2_SUBJECT_SAVE=0 TX2_PREDECESSOR_LOOKUP=1
writer_pid=$gw_pid
echo ready > /out/ready
wait_file /out/seed.json
# Index everything the seed and the aging saves wrote, so reads load segments from storage, not the memory index.
cat > "$work/index.clj" <<'CLJ'
(require '[datomic.api :as d] '[clojure.data.json :as json])
(let [[uri] *command-line-args* conn (d/connect uri) t (d/basis-t (d/db conn))]
  (d/request-index conn)
  (deref (d/sync-index conn t) 600000 nil)
  (println (json/write-str {:indexedThrough t :basisT (d/basis-t (d/db conn))}))
  (shutdown-agents) (System/exit 0))
CLJ
name=$(node -p 'JSON.parse(require("node:fs").readFileSync("/out/seed.json","utf8")).db')
java -Xmx512m -cp "$cp" clojure.main "$work/index.clj" "${template/\{db\}/$name}" > /out/index.json
# Stored segment sizes (index leaves and directories, log segments): what one storage round trip carries.
sql -d datomic -c "select count(*), sum(octet_length(val)), round(avg(octet_length(val))),
  percentile_cont(array[0.5,0.9,0.99]) within group (order by octet_length(val)) from datomic_kvs where val is not null" > /out/kvs-sizes.txt
tuned=(TX2_PINNED_SHORTCUT=1 TX2_PINNED_CUT_LOOKUP=1 TX2_READ_FILTER_EARLY=1 TX2_READ_PERMITS=3)
gateway 8081 "-Ddatomic.objectCacheMax=32m" "${tuned[@]}"
r0=$gw_pid
gateway 8082 "-Ddatomic.objectCacheMax=32m -Ddatomic.readAheadPool=0" "${tuned[@]}" TX2_READ_PREFETCH=1
r1=$gw_pid
gateway 8083 "-Ddatomic.objectCacheMax=32m" "${tuned[@]}" TX2_READ_PREFETCH=1
r2=$gw_pid
echo ready > /out/compare-ready
wait_file /out/compare-done
stop "$r0"; stop "$r1"; stop "$r2"; stop "$writer_pid"
# Probes: read-ahead on and off, prefetch off and on; one fresh JVM each (the property and the option are per process).
probe() {  # $1 label, $2 extra JVM flags, then environment assignments
  local label=$1 flags=$2; shift 2
  env DATOMIC_EXT_CLASSPATH=/opt/gateway/src "$@" java -server -Xms256m -Xmx768m -XX:+UseSerialGC $flags \
    -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "$cp:/gate" \
    clojure.main /gate/probe.clj /out/probe-config.json "/out/probe.ndjson" "$label" >> /out/probe.log 2>&1
}
node -e 'const f = require("node:fs"); const j = JSON.parse(f.readFileSync("/out/probe-request.json", "utf8"));
  j.uriTemplate = process.argv[1]; j.pgUrl = process.argv[2]; f.writeFileSync("/out/probe-config.json", JSON.stringify(j));' \
  "$template" "jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
probe ra-on-prefetch-off "" "${tuned[@]}"
probe ra-on-prefetch-on "" "${tuned[@]}" TX2_READ_PREFETCH=1
probe ra-on-prefetch-off-p6 "" "${tuned[@]/TX2_READ_PERMITS=3/TX2_READ_PERMITS=6}"
probe ra-off-prefetch-off "-Ddatomic.readAheadPool=0" "${tuned[@]}"
probe ra-off-prefetch-on "-Ddatomic.readAheadPool=0" "${tuned[@]}" TX2_READ_PREFETCH=1
rm -f /out/probe-config.json
echo ok > /out/finished

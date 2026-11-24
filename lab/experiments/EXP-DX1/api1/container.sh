#!/usr/bin/env bash
# [DX-API1] Inside one lab container: PostgreSQL, a transactor, this branch's gateway as the writer (8080) and two read
# gateways with the batched read on (8081 with a 384 MB object cache, "warm"; 8082 with 32 MB, "cold"), both the tuned
# reader of the 1 billion arm (both pinned options, the early filter, 3 read permits), the ID list route and the read
# profile (Datomic io-stats per sampled request, written to /out/trace). The Mac side (run.ts) seeds a deep toy, then
# runs the exactness gate and the counts. Diagnostic times only.
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
wait_file() { local i; for ((i=0; i<7200; i++)); do [[ -f $1 ]] && return 0; sleep .5; done; return 1; }
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
# PostgreSQL's own count of index scans on Datomic's table (every storage get of every JVM), for the Mac side.
cat > /out/pgcount.sh <<S
#!/usr/bin/env bash
setpriv --reuid=65534 --regid=65534 --clear-groups $pg/psql -XAtq -h $work/socket -U postgres -d datomic \\
  -c "select coalesce(idx_scan,0) from pg_stat_user_tables where relname = 'datomic_kvs'"
S
chmod 755 /out/pgcount.sh
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
# $1 port, $2 heap, $3 extra JVM flags, then the gateway's environment assignments.
gateway() {
  local port=$1 heap=$2 flags=$3; shift 3
  env DATOMIC_EXT_CLASSPATH=/opt/gateway/src TRIPLEX_ERASURE_DIRECTORY=/out/erasure "$@" \
    java -server -Xms128m -Xmx$heap -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError $flags \
    -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "$cp" clojure.main -m triplex.gateway.main "$port" >> "/out/gateway-$port.log" 2>&1 &
  gw_pid=$!; pids+=($gw_pid); echo "$gw_pid" > "/out/pid-$port"; wait_tcp "$gw_pid" "$port"
}
mkdir -p /out/erasure /out/trace
# The writer: the general writer with the predecessor lookup (the Mac side seeds and saves through it).
gateway 8080 768m "-Ddatomic.objectCacheMax=64m" TX2_SUBJECT_SAVE=0 TX2_PREDECESSOR_LOOKUP=1
echo ready > /out/ready
wait_file /out/seed.json
# Index everything the seed wrote, so reads load segments from storage, not the memory index.
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
tuned=(TX2_PINNED_SHORTCUT=1 TX2_PINNED_CUT_LOOKUP=1 TX2_READ_FILTER_EARLY=1 TX2_READ_PERMITS=3
       TX2_READ_BATCH=1 TX2_ID_LISTS=1 TX2_READ_PROFILE=1 TRIPLEX_TRACE_DIR=/out/trace)
gateway 8081 1g "-Ddatomic.objectCacheMax=384m" "${tuned[@]}" TRIPLEX_TRACE_PROCESS=r-warm
read -r -a cold_env <<< "${API1_COLD_ENV:-}"
gateway 8082 768m "-Ddatomic.objectCacheMax=32m" "${tuned[@]}" TRIPLEX_TRACE_PROCESS=r-cold ${cold_env[@]+"${cold_env[@]}"}
echo ready > /out/readers-ready
wait_file /out/done
echo ok > /out/finished

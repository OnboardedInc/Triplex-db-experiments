#!/usr/bin/env bash
# [DX-W4] Inside one lab container: PostgreSQL (pg_stat_statements, the transactor under its own role), a transactor
# with Datomic prefetch on (as the server launch has it), and one gate JVM per phase (w4/gate.clj). The gate JVM is
# the write gateway (main/route-handler in process) with the server writer's switches. Timings are diagnostic.
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
sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$work/socket" -U postgres "$@"; }
pg_run initdb -D "$work/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/postgres" -D "$work/data" -h "$addr" -k "$work/socket" \
  -c shared_buffers=32MB -c shared_preload_libraries=pg_stat_statements -c pg_stat_statements.track=all &
pids+=($!); wait_tcp "$!" 5432
secret=$(node -p "require('node:crypto').randomBytes(20).toString('hex')")
sql -d postgres -c "CREATE ROLE datomic LOGIN PASSWORD '$secret'"
sql -d postgres -c "CREATE ROLE datomic_tx LOGIN PASSWORD '$secret' IN ROLE datomic"
sql -d postgres -c "CREATE ROLE w4stats LOGIN SUPERUSER PASSWORD '$secret'"
sql -d postgres -c "CREATE DATABASE datomic TEMPLATE template0"
sql -d datomic -f bin/sql/postgres-table.sql >/dev/null
sql -d datomic -c "CREATE EXTENSION pg_stat_statements" >/dev/null
for s in fsync synchronous_commit full_page_writes; do [[ $(sql -d datomic -c "SHOW $s") == on ]]; done
cat >"$work/tx.properties" <<P
protocol=sql
host=$addr
alt-host=$addr
port=4334
sql-driver-class=org.postgresql.Driver
sql-url=jdbc:postgresql://$addr:5432/datomic
sql-user=datomic_tx
sql-password=$secret
memory-index-threshold=32m
memory-index-max=128m
object-cache-max=${W4_TX_CACHE:-128m}
log-dir=$work
pid-file=$work/tx.pid
P
export DATOMIC_URI_TEMPLATE="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
export W4_STATS_JDBC="jdbc:postgresql://$addr:5432/datomic?user=w4stats&password=$secret"
tx_opts="-Xms128m -Xmx768m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=${W4_TX_CACHE:-128m} -Ddatomic.prefetchProbes=true"
transactor() {
  DATOMIC_EXT_CLASSPATH=/opt/gateway/src java -server $tx_opts -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" \
    clojure.main -i /w4/w4/tx-prefetch.clj -m datomic.launcher "$work/tx.properties" >> /out/transactor.log 2>&1 &
  tx_pid=$!; pids+=($tx_pid); wait_tcp "$tx_pid" 4334
}
restart_transactor() { kill "$tx_pid"; wait "$tx_pid" 2>/dev/null || true; transactor; }
# The server writer: per-subject ordered writer for one-to-three-fact replacements, the general writer for the rest.
gate() {  # $1 = TX2_SUBJECT_HINTS, $2.. = clojure arguments
  local hints=$1; shift
  TX2_SUBJECT_HINTS=$hints TX2_GENERAL_PREFETCH=0 TX2_SUBJECT_SAVE=1 TX2_GROUP_COMMIT=0 \
    TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 \
    TX2_GROUP_REUSE_PREPARED=1 TX2_GROUP_FAST_REPLY=1 TX2_GROUP_STAGE_CLOCK=1 TX2_SUBJECT_PROFILE=1 TX2_LEAN_NATIVE_QUERY=1 \
    TX2_LEAN_NATIVE_LOG=1 TX2_GROUP_MAX_MEMBERS=8 WFIX1_URI="$DATOMIC_URI_TEMPLATE" TRIPLEX_TRACE_LEVEL=off \
    java -server -Xms128m -Xmx768m -XX:+UseSerialGC -Ddatomic.objectCacheMax=128m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
    -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main "$@"
}
transactor
phase() { echo "W4_PHASE $1 $(date -u +%FT%TZ)"; }
want() { [[ " ${W4_PHASES:-seed probe off on queue compare tests} " == *" $1 "* ]]; }
G=(-i /w4/w4/gate.clj -e)
if want seed;  then phase seed;  gate 1 "${G[@]}" '(w4-gate/seed!) (shutdown-agents) (System/exit 0)'; fi
if want probe; then phase probe; restart_transactor; gate 1 "${G[@]}" '(w4-gate/probe!) (shutdown-agents) (System/exit 0)'; fi
if want off;   then phase off;   restart_transactor; gate 0 "${G[@]}" '(w4-gate/arm! "off") (shutdown-agents) (System/exit 0)'; fi
if want on;    then phase on;    restart_transactor; gate 1 "${G[@]}" '(w4-gate/arm! "on") (shutdown-agents) (System/exit 0)'; fi
if want queue; then phase queue; restart_transactor; gate 1 "${G[@]}" '(w4-gate/queue!) (shutdown-agents) (System/exit 0)'; fi
if want compare; then phase compare; code=0; gate 1 "${G[@]}" '(w4-gate/compare!)' || code=$?; echo "W4_COMPARE_EXIT $code"; fi
if want tests; then
  phase tests
  # The suites that exercise the per-subject writer's refusals (mixed identities, ordered-ID collisions, resends),
  # hints off and on: the same outcome is the claim. The W4 tests run with hints on.
  for h in 0 1; do
    code=0
    gate "$h" -i /w4/w4/gate.clj -i /w4/wfix1/regression.clj -i /w4/prep1/subject_gate.clj -i /w4/prep1/subject_conflicts.clj -e "
      (let [r (clojure.test/run-tests (quote subject-conflicts) (quote wfix1-regression))
            w (when (= \"1\" \"$h\") (clojure.test/run-tests (quote w4-gate)))]
        (println \"W4_SUITE\" $h (clojure.data.json/write-str (select-keys r [:test :pass :fail :error])))
        (when w (println \"W4_TESTS\" $h (clojure.data.json/write-str (select-keys w [:test :pass :fail :error]))))
        (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r) (or (:fail w) 0) (or (:error w) 0))) 0 1)))" || code=$?
    echo "W4_SUITE_EXIT $h $code"
  done
fi
phase done

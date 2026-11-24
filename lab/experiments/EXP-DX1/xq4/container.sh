#!/usr/bin/env bash
# [DX-XQ4] Inside one lab container: PostgreSQL (pg_stat_statements; the transactor under its own role), a transactor,
# and one gate JVM per phase (xq4/gate.clj) running the gateway in process with the server writer's switches.
# A new JVM per phase is a gateway restart; restart_transactor is a transactor restart. Timings are diagnostic.
set -euo pipefail
cd /opt/datomic
work=$(mktemp -d); chmod 755 "$work"
install -d -o 65534 -g 65534 "$work/data" "$work/socket"
install -d "$work/erasure"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=$(node -p 'Object.values(require("node:os").networkInterfaces()).flat().find((x) => x.internal && x.family === "IPv4").address')
pids=()
trap 'for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; wait || true' EXIT
wait_tcp() { local i; for ((i=0; i<240; i++)); do kill -0 "$1"; if (exec 3<>/dev/tcp/"$addr"/"$2") 2>/dev/null; then return; fi; sleep .5; done; return 1; }
sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$work/socket" -U postgres "$@"; }
pg_run initdb -D "$work/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/postgres" -D "$work/data" -h "$addr" -k "$work/socket" \
  -c shared_buffers=64MB -c shared_preload_libraries=pg_stat_statements -c pg_stat_statements.track=all &
pids+=($!); wait_tcp "$!" 5432
secret=$(node -p "require('node:crypto').randomBytes(20).toString('hex')")
sql -d postgres -c "CREATE ROLE datomic LOGIN PASSWORD '$secret'"
sql -d postgres -c "CREATE ROLE datomic_tx LOGIN PASSWORD '$secret' IN ROLE datomic"
sql -d postgres -c "CREATE ROLE xq4stats LOGIN SUPERUSER PASSWORD '$secret'"
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
object-cache-max=128m
log-dir=$work
pid-file=$work/tx.pid
P
export DATOMIC_URI_TEMPLATE="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
export XQ4_STATS_JDBC="jdbc:postgresql://$addr:5432/datomic?user=xq4stats&password=$secret"
tx_opts="-Xms256m -Xmx1g -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=128m -Ddatomic.prefetchProbes=true"
transactor() {
  DATOMIC_EXT_CLASSPATH=/opt/gateway/src java -server $tx_opts -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" \
    clojure.main -m datomic.launcher "$work/tx.properties" >> /out/transactor.log 2>&1 &
  tx_pid=$!; pids+=($tx_pid); wait_tcp "$tx_pid" 4334
}
restart_transactor() { kill "$tx_pid"; wait "$tx_pid" 2>/dev/null || true; transactor; }
# The server writer: per-subject ordered writer for one-to-three-fact replacements, the general writer for the rest.
gate() {  # $1 = TX2_CROSS_INDEX (0/1), $2 = TX2_GROUP_COMMIT (0/1), $3.. = clojure forms
  local index=$1 grouping=$2; shift 2
  TX2_CROSS_INDEX=$index TX2_GROUP_COMMIT=$grouping TX2_SUBJECT_SAVE=1 \
    TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 \
    TX2_SUBJECT_APPEND_RETIREMENT=${XQ4_MARKERS:-0} \
    TX2_GROUP_REUSE_PREPARED=1 TX2_GROUP_FAST_REPLY=1 TX2_GROUP_STAGE_CLOCK=1 TX2_SUBJECT_PROFILE=1 TX2_LEAN_NATIVE_QUERY=1 \
    TX2_LEAN_NATIVE_LOG=1 TX2_GROUP_MAX_MEMBERS=8 TRIPLEX_TRACE_LEVEL=off \
    TRIPLEX_ERASURE_DIRECTORY="$work/erasure" XQ4_RUN="${XQ4_RUN:-r}" \
    java -server -Xms256m -Xmx2g -XX:+UseSerialGC -Ddatomic.objectCacheMax=256m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
    -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main -i /xq4/xq4/gate.clj -e "$@"
}
transactor
phase() { echo "XQ4_PHASE $1 $(date -u +%FT%TZ)"; }
want() { [[ " ${XQ4_PHASES:-} " == *" $1 "* ]]; }
done_() { echo '(shutdown-agents) (System/exit 0)'; }
run() { local name=$1; shift; phase "$name"; local code=0; gate "$@" || code=$?; echo "XQ4_EXIT $name $code"; }
if want g8log; then run loghash 0 0 "(xq4-gate/phase-loghash!) $(done_)"; fi
if want g8logon; then run loghash-on 1 0 "(xq4-gate/phase-loghash!) $(done_)"; fi
if want g3; then run g3 1 0 "(xq4-gate/phase-g3!) $(done_)"; fi
if want g6; then
  run g6-seed 1 0 "(xq4-gate/phase-g6-seed!) $(done_)"
  restart_transactor
  run g6-measure 1 0 "(xq4-gate/phase-g6-measure!) $(done_)"
fi
if want world; then
  # Run A: the index declared mid-seed and built by writers and backfill; run B: the same saves with the option off.
  run seed-a 1 0 "(xq4-gate/phase-seed! \"a\" true) $(done_)"
  run declare2-a 1 0 "(xq4-gate/phase-declare2! \"a\" true) $(done_)"
  run group-a 1 1 "(xq4-gate/phase-group! \"a\" true) $(done_)"
  restart_transactor
  XQ4_MARKERS=1 run more-a 1 0 "(xq4-gate/phase-more! \"a\") $(done_)"
  if want replay; then
    run seed-b 0 0 "(xq4-gate/phase-seed! \"b\" false) $(done_)"
    run declare2-b 0 0 "(xq4-gate/phase-declare2! \"b\" false) $(done_)"
    run group-b 0 1 "(xq4-gate/phase-group! \"b\" false) $(done_)"
    XQ4_MARKERS=1 run more-b 0 0 "(xq4-gate/phase-more! \"b\") $(done_)"
    run replay-index-b 1 0 "(xq4-gate/phase-replay-index! \"b\") $(done_)"
    run g2 1 0 "(xq4-gate/phase-g2! \"a\" \"b\") $(done_)"
  fi
  restart_transactor
  run check-a 1 0 "(xq4-gate/phase-check! \"a\") $(done_)"
  run g4 1 0 "(xq4-gate/phase-g4! \"a\") $(done_)"
  run g5 1 0 "(xq4-gate/phase-g5! \"a\") $(done_)"
fi
phase done

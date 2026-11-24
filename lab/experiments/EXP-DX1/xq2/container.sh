#!/usr/bin/env bash
# [DX-XQ2] Inside one lab container: PostgreSQL (pg_stat_statements; the transactor under its own role), a transactor
# with Datomic prefetch on (as the server launch has it), and one gate JVM per step (xq2/gate.clj) running the write
# gateway in process with the server writer's switches and TX2_ATTRIBUTE_INDEX per arm. Timings are diagnostic.
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
sql -d postgres -c "CREATE ROLE xq2stats LOGIN SUPERUSER PASSWORD '$secret'"
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
export XQ2_STATS_JDBC="jdbc:postgresql://$addr:5432/datomic?user=xq2stats&password=$secret"
tx_opts="-Xms256m -Xmx1g -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=128m -Ddatomic.prefetchProbes=true"
transactor() {
  DATOMIC_EXT_CLASSPATH=/opt/gateway/src java -server $tx_opts -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" \
    clojure.main -m datomic.launcher "$work/tx.properties" >> /out/transactor.log 2>&1 &
  tx_pid=$!; pids+=($tx_pid); wait_tcp "$tx_pid" 4334
}
restart_transactor() { kill "$tx_pid"; wait "$tx_pid" 2>/dev/null || true; transactor; }
# The server writer: per-subject ordered writer for one-to-three-fact replacements, the general writer for the rest.
gate() {  # $1 = TX2_ATTRIBUTE_INDEX ("" = off), $2.. = clojure arguments
  local list=$1; shift
  TX2_ATTRIBUTE_INDEX=$list TX2_ATTRIBUTE_INDEX_HOLDER=${XQ2_HOLDER:-entity} TX2_SUBJECT_SAVE=1 TX2_GROUP_COMMIT=0 \
    TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 \
    TX2_GROUP_REUSE_PREPARED=1 TX2_GROUP_FAST_REPLY=1 TX2_GROUP_STAGE_CLOCK=1 TX2_SUBJECT_PROFILE=1 TX2_LEAN_NATIVE_QUERY=1 \
    TX2_LEAN_NATIVE_LOG=1 TX2_GROUP_MAX_MEMBERS=8 WFIX1_URI="$DATOMIC_URI_TEMPLATE" TRIPLEX_TRACE_LEVEL=off \
    TRIPLEX_ERASURE_DIRECTORY="$work/erasure" XQ2_RUN="${XQ2_RUN:-r}" \
    java -server -Xms256m -Xmx1536m -XX:+UseSerialGC -Ddatomic.objectCacheMax=256m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
    -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main -i /xq2/xq2/gate.clj -e "$@"
}
transactor
phase() { echo "XQ2_PHASE $1 $(date -u +%FT%TZ)"; }
want() { [[ " ${XQ2_PHASES:-cost gate edge} " == *" $1 "* ]]; }
done_() { echo '(shutdown-agents) (System/exit 0)'; }
list_for() {
  case $1 in
    n0) echo "";;
    n1) echo ":f12";;
    n5|a5) echo ":f0,:f1,:f2,:f3,:f12";;
    n20|a20) echo ":f0,:f1,:f2,:f3,:f4,:f5,:f6,:f7,:f8,:f9,:f10,:f11,:f12,:f13,:f14,:f15,:f16,:f17,:f18,:f19";;
  esac
}
if want cost; then
  for arm in ${XQ2_ARMS:-n0 n1 n5 n20}; do
    if [[ $arm == a* ]]; then export XQ2_HOLDER=account; else export XQ2_HOLDER=entity; fi
    phase "cost-seed-$arm"; gate "$(list_for "$arm")" "(xq2-gate/cost-seed! \"$arm\") $(done_)"
    restart_transactor
    phase "cost-measure-$arm"; gate "$(list_for "$arm")" "(xq2-gate/cost-measure! \"$arm\") $(done_)"
  done
fi
GATE_LIST=":status,:start-date,:flag,:name,:score,@type"
if want gate; then
  phase gate-seed; gate "$GATE_LIST" "(xq2-gate/gate-seed!) $(done_)"
  phase gate-workload; gate "$GATE_LIST" "(xq2-gate/gate-workload!) $(done_)"
  restart_transactor
  phase gate-check; code=0; gate "$GATE_LIST" "(xq2-gate/gate-check!)" || code=$?; echo "XQ2_GATE_EXIT $code"
  restart_transactor
  phase query-cost; gate "$GATE_LIST" "(xq2-gate/query-cost!) $(done_)"
fi
if want edge; then
  list=":common,:unique"; for i in $(seq 0 99); do list="$list,:g$i"; done
  phase edge; gate "$list" "(xq2-gate/edge!) $(done_)"
fi
phase done

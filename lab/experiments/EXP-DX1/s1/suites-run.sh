#!/usr/bin/env bash
# [DX-S1] Correctness suites on PostgreSQL storage with a real transactor, inside the lab Datomic image (sources mounted
# read-only): the per-subject writer's mixed-identity, collision and conflict suite with WFIX1's regression suite, and
# W2's wide-save gate, with TX2_SUBJECT_WIDE off and on, and on with both hint options beside it.
set -euo pipefail
cd /opt/datomic
export PREP1_ATTEMPT=${PREP1_ATTEMPT:-s1-suites}
work=$(mktemp -d); chmod 755 "$work"
install -d -o 65534 -g 65534 "$work/data" "$work/socket"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=127.0.0.1
children=()
finish() { local s=$?; trap - EXIT; for i in "${!children[@]}"; do kill "${children[i]}" 2>/dev/null || true; wait "${children[i]}" 2>/dev/null || true; done; exit "$s"; }
trap finish EXIT
wait_tcp() { local pid=$1 port=$2 i; for ((i=0; i<240; i++)); do kill -0 "$pid"; if (exec 3<>/dev/tcp/$addr/$port) 2>/dev/null; then return; fi; sleep .5; done; return 1; }
sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$work/socket" -U postgres "$@"; }
pg_run initdb -D "$work/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
pg_run postgres -D "$work/data" -h $addr -k "$work/socket" -c shared_buffers=64MB &
children[0]=$!; wait_tcp "$!" 5432
secret=$(node -p "require('node:crypto').randomBytes(20).toString('hex')")
sql -d postgres -c "CREATE ROLE datomic LOGIN PASSWORD '$secret'"
sql -d postgres -c "CREATE DATABASE datomic TEMPLATE template0"
sql -d datomic -f bin/sql/postgres-table.sql
for s in fsync synchronous_commit full_page_writes; do printf 'DX-S1_SUITE_SQL %s %s\n' "$s" "$(sql -d datomic -c "SHOW $s")"; done
umask 077
# A memory index large enough that no index job runs inside the measured saves (the seed is indexed first).
cat >"$work/transactor.properties" <<PROPS
protocol=sql
host=$addr
alt-host=$addr
port=4334
sql-driver-class=org.postgresql.Driver
sql-url=jdbc:postgresql://$addr:5432/datomic
sql-user=datomic
sql-password=$secret
memory-index-threshold=256m
memory-index-max=512m
object-cache-max=32m
log-dir=$work
pid-file=$work/tx.pid
PROPS
export DATOMIC_URI_TEMPLATE="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
export DATOMIC_EXT_CLASSPATH=/opt/gateway/src
export DATOMIC_JAVA_OPTS="-Xms96m -Xmx1200m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json"
export TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_PREDECESSOR_LOOKUP=1
export TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1
start_transactor() { java -server $DATOMIC_JAVA_OPTS -cp "$(bin/classpath)" clojure.main -m datomic.launcher "$work/transactor.properties" > "$work/transactor.log" 2>&1 & children[1]=$!; wait_tcp "$!" 4334; }
start_transactor
suite() {  # $1 = TX2_SUBJECT_WIDE, $2 = hints (both TX2_SUBJECT_HINTS and TX2_GENERAL_PREFETCH), $3 = label
  local wide=$1 hints=$2 label=$3 code=0
  TX2_SUBJECT_WIDE=$wide TX2_SUBJECT_HINTS=$hints TX2_GENERAL_PREFETCH=$hints TX2_SUBJECT_SAVE=1 TX2_GROUP_COMMIT=0 \
    TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 \
    TX2_GROUP_REUSE_PREPARED=1 TX2_GROUP_FAST_REPLY=1 TX2_GROUP_STAGE_CLOCK=1 TX2_LEAN_NATIVE_QUERY=1 \
    TX2_LEAN_NATIVE_LOG=1 TX2_GROUP_MAX_MEMBERS=8 WFIX1_URI="$DATOMIC_URI_TEMPLATE" TRIPLEX_TRACE_LEVEL=off \
    java -server -Xms128m -Xmx1g -XX:+UseSerialGC -Ddatomic.objectCacheMax=128m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
    -cp "$(bin/classpath)" clojure.main -i /exp/wfix1/regression.clj -i /exp/prep1/subject_gate.clj \
    -i /exp/prep1/subject_conflicts.clj -i /exp/w2/wide_gate.clj -e "
      (let [r (clojure.test/run-tests (quote subject-conflicts) (quote wfix1-regression))
            w (when (= \"1\" \"$wide\") (clojure.test/run-tests (quote wide-gate)))]
        (println \"DX-S1_SUITE\" \"$label\" (clojure.data.json/write-str (select-keys r [:test :pass :fail :error])))
        (when w (println \"DX-S1_WIDE_GATE\" \"$label\" (clojure.data.json/write-str (select-keys w [:test :pass :fail :error]))))
        (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r) (or (:fail w) 0) (or (:error w) 0))) 0 1)))" 2>&1 | grep -v '^WARNING: ' || code=$?
  echo "DX-S1_SUITE_EXIT $label $code"
}
# The gateway's own selftest (in memory), which reads through reach/response among its routes.
selftest() {  # $1 = TX2_SUBJECT_WIDE
  local code=0
  TX2_SUBJECT_WIDE=$1 TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 \
    java -server -Xms128m -Xmx1g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
    -cp "$(bin/classpath)" clojure.main -m triplex.gateway.selftest 2>&1 | grep -v '^WARNING: ' | tail -n 5 || code=$?
  echo "DX-S1_SELFTEST_EXIT wide=$1 $code"
}
for arm in ${DX_S1_SUITES:-off wide wide-hints}; do
  case $arm in
    selftest-off) selftest 0 ;;
    selftest-wide) selftest 1 ;;
    off) suite 0 0 off ;;
    wide) suite 1 0 wide ;;
    wide-hints) suite 1 1 wide-hints ;;
  esac
done
echo DX-S1_SUITES_DONE

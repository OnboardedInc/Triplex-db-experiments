#!/usr/bin/env bash
# The paired wide-save measurement on PostgreSQL storage, inside the lab Datomic image (sources mounted read-only).
# One transactor restart and one fresh peer JVM per arm and round, as the owner-head serial probe did.
set -euo pipefail
cd /opt/datomic
export PREP1_ATTEMPT=${PREP1_ATTEMPT:-w2-sql}
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
pg_run postgres -D "$work/data" -h $addr -k "$work/socket" -c shared_buffers=24MB &
children[0]=$!; wait_tcp "$!" 5432
secret=$(node -p "require('node:crypto').randomBytes(20).toString('hex')")
sql -d postgres -c "CREATE ROLE datomic LOGIN PASSWORD '$secret'"
sql -d postgres -c "CREATE DATABASE datomic TEMPLATE template0"
sql -d datomic -f bin/sql/postgres-table.sql
for s in fsync synchronous_commit full_page_writes; do printf 'DX-W2_SQL %s %s\n' "$s" "$(sql -d datomic -c "SHOW $s")"; done
umask 077
cat >"$work/transactor.properties" <<PROPS
protocol=sql
host=$addr
alt-host=$addr
port=4334
sql-driver-class=org.postgresql.Driver
sql-url=jdbc:postgresql://$addr:5432/datomic
sql-user=datomic
sql-password=$secret
memory-index-threshold=${DX_W2_INDEX_THRESHOLD:-32m}
memory-index-max=${DX_W2_INDEX_MAX:-80m}
object-cache-max=32m
log-dir=$work
pid-file=$work/tx.pid
PROPS
export DATOMIC_URI_TEMPLATE="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
export DATOMIC_EXT_CLASSPATH=/opt/gateway/src
export DATOMIC_JAVA_OPTS="-Xms96m -Xmx368m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json"
export TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_PREDECESSOR_LOOKUP=1
export TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1
java_cmd() { java -server $DATOMIC_JAVA_OPTS -cp "$(bin/classpath)" clojure.main "$@"; }
start_transactor() { DATOMIC_JAVA_OPTS="${DATOMIC_JAVA_OPTS/-Xmx368m/${DX_W2_TX_HEAP:--Xmx368m}}" java_cmd -m datomic.launcher "$work/transactor.properties" > "$work/transactor.log" 2>&1 & children[1]=$!; wait_tcp "$!" 4334; }
stop_transactor() { kill "${children[1]}"; wait "${children[1]}" || true; }
peer() { java_cmd -i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj -e "$1" 2>&1 | grep -v '^WARNING: '; }
start_transactor
seeds="$work/seeds.edn"
peer "(do (wide-gate/measure-seed! \"$seeds\") (shutdown-agents) (System/exit 0))"
for round in 1 2; do
  for arm in ${DX_W2_ARMS:-general general-bounds subject-wide}; do
    stop_transactor; start_transactor
    peer "(do (wide-gate/measure-round! \"$seeds\" \"$arm\" $round) (shutdown-agents) (System/exit 0))"
  done
done
DATOMIC_JAVA_OPTS="${DATOMIC_JAVA_OPTS/-Xmx368m/-Xmx1200m}" peer "(do (wide-gate/measure-verify! \"$seeds\") (shutdown-agents) (System/exit 0))"
if [[ ${DX_W2_GATE:-0} == 1 ]]; then
  # The gate suite on PostgreSQL storage, with the option on.
  WFIX1_URI="$DATOMIC_URI_TEMPLATE" TX2_SUBJECT_WIDE=1 peer "(let [r (clojure.test/run-tests 'wide-gate)] (println \"DX-W2_GATE\" (pr-str (select-keys r [:test :pass :fail :error]))) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))"
fi
echo DX-W2_DONE

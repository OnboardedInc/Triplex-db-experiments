#!/usr/bin/env bash
# [DX-S5] (after s4/sql-run.sh) The reviewer's PostgreSQL stack check, inside the lab Datomic image (sources mounted
# read-only): PostgreSQL with fsync and synchronous commit on, a real transactor, and one peer JVM per write gateway.
# Setup seeds a control and a candidate scope; two writer gateways save into the candidate at once; writer B is killed
# with SIGKILL mid-run; the transactor is restarted while writer A saves; a fresh gateway resends every save that has no
# definite answer; the transactor is restarted again; a last gateway checks every answer and replays every committed
# save on the control with the general writer (s5/fuzz.clj stack-*). Times are diagnostic.
set -euo pipefail
cd /opt/datomic
work=/out/work; mkdir -p "$work"; chmod 777 "$work"
data=$(mktemp -d); chmod 755 "$data"
install -d -o 65534 -g 65534 "$data/data" "$data/socket"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=127.0.0.1
children=()
finish() { local s=$?; trap - EXIT; for p in "${children[@]}"; do kill "$p" 2>/dev/null || true; wait "$p" 2>/dev/null || true; done; exit "$s"; }
trap finish EXIT
wait_tcp() { local pid=$1 port=$2 i; for ((i=0; i<240; i++)); do kill -0 "$pid"; if (exec 3<>/dev/tcp/$addr/$port) 2>/dev/null; then return; fi; sleep .5; done; return 1; }
sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$data/socket" -U postgres "$@"; }
pg_run initdb -D "$data/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
pg_run postgres -D "$data/data" -h $addr -k "$data/socket" -c shared_buffers=24MB &
children+=($!); wait_tcp "$!" 5432
secret=$(node -p "require('node:crypto').randomBytes(20).toString('hex')")
sql -d postgres -c "CREATE ROLE datomic LOGIN PASSWORD '$secret'"
sql -d postgres -c "CREATE DATABASE datomic TEMPLATE template0"
sql -d datomic -f bin/sql/postgres-table.sql
for s in fsync synchronous_commit full_page_writes; do printf 'DX-S5_SQL %s %s\n' "$s" "$(sql -d datomic -c "SHOW $s")"; done
umask 077
cat >"$data/transactor.properties" <<PROPS
protocol=sql
host=$addr
alt-host=$addr
port=4334
sql-driver-class=org.postgresql.Driver
sql-url=jdbc:postgresql://$addr:5432/datomic
sql-user=datomic
sql-password=$secret
memory-index-threshold=32m
memory-index-max=80m
object-cache-max=32m
log-dir=$data
pid-file=$data/tx.pid
PROPS
umask 022
export DATOMIC_URI_TEMPLATE="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
export DATOMIC_EXT_CLASSPATH=/opt/gateway/src
tx_opts="-Xms96m -Xmx368m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json"
peer_opts="-Xmx640m -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json"
cp=$(bin/classpath)
start_transactor() { java -server $tx_opts -cp "/opt/gateway/src:$cp" clojure.main -m datomic.launcher "$data/transactor.properties" >> "$work/transactor.log" 2>&1 & tx=$!; children+=($tx); wait_tcp "$tx" 4334; echo "DX-S5_TX started $(date -u +%T)"; }
stop_transactor() { kill "$tx"; wait "$tx" || true; echo "DX-S5_TX stopped $(date -u +%T)"; }
peer() { java $peer_opts -cp "/opt/gateway/src:$cp" clojure.main -i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj -i /exp/s5/fuzz.clj -e "$1" 2>&1 | grep -v '^WARNING: '; }
lines() { [[ -f $1 ]] && wc -l < "$1" || echo 0; }
start_transactor
peer "(do (s5-fuzz/stack-setup! \"$work\" ${S5_STACK_SEED:-31}) (shutdown-agents) (System/exit 0))"
per=${S5_STACK_PER_THREAD:-400}
( peer "(do (s5-fuzz/stack-writer! \"$work\" \"A\" 1001 4 $per) (shutdown-agents) (System/exit 0))" > "$work/writer-A.log" ) &
a=$!; children+=($a)
java $peer_opts -cp "/opt/gateway/src:$cp" clojure.main -i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj -i /exp/s5/fuzz.clj \
  -e "(do (s5-fuzz/stack-writer! \"$work\" \"B\" 2002 4 $per) (shutdown-agents) (System/exit 0))" > "$work/writer-B.log" 2>&1 &
b=$!; children+=($b)
# Writer B (its own peer, a second write gateway) is killed mid-run.
for ((i=0; i<600; i++)); do (( $(lines "$work/B.jsonl") >= ${S5_KILL_AT:-500} )) && break; kill -0 $b 2>/dev/null || break; sleep .5; done
kill -9 $b 2>/dev/null && echo "DX-S5_KILL writer B at $(lines "$work/B.jsonl") log lines $(date -u +%T)" || echo "DX-S5_KILL writer B had finished"
# The transactor is restarted while writer A is saving.
for ((i=0; i<600; i++)); do (( $(lines "$work/A.jsonl") >= ${S5_RESTART_AT:-900} )) && break; kill -0 $a 2>/dev/null || break; sleep .5; done
stop_transactor; sleep 2; start_transactor
wait $a || true
echo "DX-S5_WRITERS A $(lines "$work/A.jsonl") B $(lines "$work/B.jsonl") log lines"
peer "(do (s5-fuzz/stack-resend! \"$work\") (shutdown-agents) (System/exit 0))"
stop_transactor; start_transactor
peer "(do (System/exit (if (s5-fuzz/stack-verify! \"$work\") 0 1)))" && status=0 || status=1
echo "DX-S5_STACK_DONE $status"
exit $status

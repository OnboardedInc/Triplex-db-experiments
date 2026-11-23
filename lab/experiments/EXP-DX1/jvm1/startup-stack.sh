#!/usr/bin/env bash
# [DX-JVM1] Why: one small Mac container with PostgreSQL, a transactor and an ordered subject writer that restarts the
# transactor and writer between the traffic that defines the active set and the measured first window.
# Rejected: a second Docker stack on the shared VM, or a measured timing on the Mac (all times here are diagnostic).
set -euo pipefail
[[ "${1:-}" == selftest ]]
cd /opt/datomic
export PREP1_ATTEMPT=$(cat /config/attempt)
export TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_NARROW_REVISION=0
export TX2_SUBJECT_REUSE_PREDECESSOR=0 TX2_SUBJECT_APPEND_RETIREMENT=0 PREP1_LOOKUP_EVERY=0
# [DX-THIN1] Why: the combined check runs the same restart with the covering owner head on; default off.
# Rejected: a second entry script for the combination.
export TX2_SUBJECT_OWNER_HEAD=$(cat /config/subject-head 2>/dev/null || printf 0)
[[ $TX2_SUBJECT_OWNER_HEAD == 0 || $TX2_SUBJECT_OWNER_HEAD == 1 ]]
export TX2_WRITE_OPTIONS_ATTEMPT="$PREP1_ATTEMPT" TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TX2_SAVE_LEDGER=0 TX2_SMALL_ROWS=0
work=$(mktemp -d)
chmod 755 "$work"
install -d -o 65534 -g 65534 "$work/data" "$work/socket"
install -d "$work/sread"
export TRIPLEX_STARTUP_READ_DIR="$work/sread"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=$(node -p 'Object.values(require("node:os").networkInterfaces()).flat().find((x) => x.internal && x.family === "IPv4").address')
pg_pid= tx_pid= gw_pid=
finish() {
  local status=$?
  trap - EXIT
  for pid in "$gw_pid" "$tx_pid"; do
    if [[ -n $pid ]]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi
  done
  if [[ -n $pg_pid ]]; then kill -INT "$pg_pid" 2>/dev/null || true; wait "$pg_pid" 2>/dev/null || true; fi
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
wait_tcp() {
  local pid=$1 port=$2 i
  for ((i=0; i<240; i++)); do
    kill -0 "$pid"
    if (exec 3<>/dev/tcp/"$addr"/"$port") 2>/dev/null; then return; fi
    sleep .5
  done
  return 1
}
sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$work/socket" -U postgres "$@"; }
pg_run initdb -D "$work/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/postgres" -D "$work/data" -h "$addr" -k "$work/socket" \
  -c shared_buffers=24MB -c track_io_timing=on &
pg_pid=$!
wait_tcp "$pg_pid" 5432
secret=$(node -p "require('node:crypto').randomBytes(20).toString('hex')")
sql -d postgres -c "CREATE ROLE datomic LOGIN PASSWORD '$secret'"
sql -d postgres -c "CREATE DATABASE datomic TEMPLATE template0"
sql -d datomic -f bin/sql/postgres-table.sql
for setting in fsync synchronous_commit full_page_writes; do
  [[ $(sql -d datomic -c "SHOW $setting") == on ]]
  printf 'JVM1_STARTUP_SQL %s on\n' "$setting"
done
umask 077
cat >"$work/transactor.properties" <<EOF
protocol=sql
host=$addr
alt-host=$addr
port=4334
sql-driver-class=org.postgresql.Driver
sql-url=jdbc:postgresql://$addr:5432/datomic
sql-user=datomic
sql-password=$secret
memory-index-threshold=32m
memory-index-max=128m
object-cache-max=128m
log-dir=$work
pid-file=$work/tx.pid
EOF
export DATOMIC_URI_TEMPLATE="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
export DATOMIC_EXT_CLASSPATH=/opt/gateway/src
export PREP1_PEERS="http://$addr:8080"
base_java="-XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Dtriplex.codec.spec=/opt/gateway/codec-spec.json"
start_transactor() {
  # The start-up read file is loaded in both arms; it starts a thread only when the boot was marked.
  java -server -Xms96m -Xmx448m -XX:MaxDirectMemorySize=64m -Ddatomic.objectCacheMax=128m $base_java \
    -cp "$(bin/classpath)" clojure.main -i /config/startup-read.clj -m datomic.launcher "$work/transactor.properties" &
  tx_pid=$!
  wait_tcp "$tx_pid" 4334
}
start_gateway() {
  TX2_SUBJECT_SAVE=1 TX2_GROUP_COMMIT=0 TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=1 TX2_GROUP_REUSE_PREPARED=1 \
    TX2_GROUP_STAGE_CLOCK=1 TX2_GROUP_FAST_REPLY=1 TX2_INT1_WRITE_READBACK=1 TX2_SUBJECT_PROFILE=1 \
    TX2_BULK_ROWS=2048 TX2_BULK_BYTES=1048576 \
    TRIPLEX_STARTUP_READ_ROLE=gw-w \
    java -server -Xms96m -Xmx384m $base_java -Ddatomic.objectCacheMax=32m -Ddatomic.memoryIndexMax=32m \
    -cp "$(bin/classpath)" clojure.main -i bin/bridge.clj -i /config/startup-read.clj -m triplex.gateway.main 8080 &
  gw_pid=$!
  wait_tcp "$gw_pid" 8080
}
# [DX-PREP1] Why: the bundle imports launch helpers that also have a command-line entry point.
# Rejected: identifying the bundle itself as that entry point.
probe() { node --input-type=module -e '
  process.argv.splice(1, 0, "startup-gate");
  await import("/config/probe.mjs");
' "$@"; }
stop_all() {
  kill "$gw_pid"; wait "$gw_pid" || true; gw_pid=
  kill "$tx_pid"; wait "$tx_pid" || true; tx_pid=
}
start_transactor
start_gateway
for arm in today startup-read; do
  witness="$work/$arm.json"
  probe seed "$arm" "$witness"
  # Put the seed outside the 20-second log window, so the window names only the traffic before the restart.
  sleep 25
  probe pre "$arm" "$witness"
  stop_all
  if [[ $arm == startup-read ]]; then : > "$work/sread/startup-read-tx.enabled"; : > "$work/sread/startup-read-gw-w.enabled"; fi
  restart_started=$(date +%s%3N)
  start_transactor
  start_gateway
  ready=$(date +%s%3N)
  if [[ $arm == startup-read ]]; then
    TX_PID=$tx_pid GW_PID=$gw_pid probe read "$arm" "$witness"
    rm -f "$work"/sread/startup-read-*
  fi
  admitted=$(date +%s%3N)
  printf 'JVM1_STARTUP_RESTART {"arm":"%s","restartToReadyMs":%s,"readyToAdmissionMs":%s,"timings":"diagnostic"}\n' \
    "$arm" $((ready - restart_started)) $((admitted - ready))
  TX_PID=$tx_pid GW_PID=$gw_pid probe post "$arm" "$witness"
done
printf 'JVM1_STARTUP_DONE %s\n' "$PREP1_ATTEMPT"

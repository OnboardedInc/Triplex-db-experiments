#!/usr/bin/env bash
# [DX-RD6] Inside one lab container: PostgreSQL, a transactor, one write gateway on 8080 and three read gateways
# (8081 options off, 8082 both on, 8083 tuned), and the driver JVM (rd6/fleet.clj). The driver asks for each writer
# phase after the first; this script restarts the write gateway with that phase's writer and answers phase-N.ready.
set -euo pipefail
cd /opt/datomic
work=$(mktemp -d); chmod 755 "$work"
install -d -o 65534 -g 65534 "$work/data" "$work/socket"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=$(node -p 'Object.values(require("node:os").networkInterfaces()).flat().find((x) => x.internal && x.family === "IPv4").address')
pids=()
# Every JVM first (the write gateway restarted by the phase loop is not in pids; a live client keeps PostgreSQL's smart
# shutdown waiting), then the rest.
trap 'pkill -f "^java " 2>/dev/null || true; sleep 1; for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; wait || true' EXIT
wait_tcp() { local i; for ((i=0; i<240; i++)); do kill -0 "$1"; if (exec 3<>/dev/tcp/"$addr"/"$2") 2>/dev/null; then return; fi; sleep .5; done; return 1; }
sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$work/socket" -U postgres "$@"; }
pg_run initdb -D "$work/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/postgres" -D "$work/data" -h "$addr" -k "$work/socket" -c shared_buffers=24MB &
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
memory-index-max=80m
object-cache-max=32m
log-dir=$work
pid-file=$work/tx.pid
P
export DATOMIC_URI_TEMPLATE="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
opts="-Xms96m -Xmx512m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=32m"
cp=$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)
DATOMIC_EXT_CLASSPATH=/opt/gateway/src java -server $opts -cp "$cp" clojure.main -m datomic.launcher "$work/tx.properties" >> /out/transactor.log 2>&1 &
tx_pid=$!; pids+=($tx_pid); wait_tcp "$tx_pid" 4334
gateway() {  # $1 port, then environment assignments
  local port=$1; shift
  env TRIPLEX_ERASURE_DIRECTORY=/out/erasure TRIPLEX_TRACE_LEVEL=off "$@" \
    java -server $opts -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "$cp" \
    clojure.main -m triplex.gateway.main "$port" >> "/out/gateway-$port.log" 2>&1 &
  gw_pid=$!; pids+=($gw_pid); wait_tcp "$gw_pid" "$port"
}
stop() { kill "$1" 2>/dev/null || true; local i; for ((i=0; i<200; i++)); do kill -0 "$1" 2>/dev/null || return 0; sleep .1; done; kill -9 "$1" 2>/dev/null || true; sleep 1; }
mkdir -p /out/erasure
base=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_WIDE=1
  TX2_SUBJECT_SEVERAL_OWNERS=1 TX2_SUBJECT_CREATE=1 TX2_GROUP_COMMIT=0 TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=1)
writer_env() {
  case $1 in
    per-subject) echo "${base[@]}" ;;
    grouped) echo TX2_SUBJECT_SAVE=0 TX2_GROUP_COMMIT=1 TX2_GROUP_STAGE_CLOCK=1 TX2_GROUP_FAST_REPLY=1 TX2_GROUP_REUSE_PREPARED=1 \
                  TX2_LIVE_PRIORITY=1 TX2_GROUP_MAX_MEMBERS=32 TX2_SMALL_ROWS=1 TX2_SAVE_LEDGER=1 TX2_PREDECESSOR_LOOKUP=1 ;;
    append) echo "${base[@]}" TX2_SUBJECT_NARROW_REVISION=1 TX2_SUBJECT_REUSE_PREDECESSOR=1 TX2_SUBJECT_APPEND_RETIREMENT=1 ;;
    general) echo TX2_SUBJECT_SAVE=0 TX2_GROUP_COMMIT=0 TX2_PREDECESSOR_LOOKUP=1 ;;
    *) echo "unknown phase $1" >&2; return 1 ;;
  esac
}
IFS=, read -r -a phases <<< "${RD6_PHASES:-per-subject}"
driver=${RD6_DRIVER:-http}
if [[ $driver == http ]]; then
  # shellcheck disable=SC2046
  gateway 8080 $(writer_env "${phases[0]}"); writer_pid=$gw_pid
fi
reader=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1)
# [second review] RD6_READER_MODE=flip: the reference reader turns both options off explicitly and the other two run
# the default (on under the trial flip), with no pinned-read setting at all.
if [[ ${RD6_READER_MODE:-explicit} == flip ]]; then
  gateway 8081 "${reader[@]}" TX2_PINNED_SHORTCUT=0 TX2_PINNED_CUT_LOOKUP=0
  gateway 8082 "${reader[@]}"
  gateway 8083 "${reader[@]}" TX2_READ_FILTER_EARLY=1 TX2_READ_PROFILE=1 TX2_READ_PERMITS=3
else
  gateway 8081 "${reader[@]}" TX2_PINNED_SHORTCUT=0 TX2_PINNED_CUT_LOOKUP=0
  gateway 8082 "${reader[@]}" TX2_PINNED_SHORTCUT=1 TX2_PINNED_CUT_LOOKUP=1
  gateway 8083 "${reader[@]}" TX2_PINNED_SHORTCUT=1 TX2_PINNED_CUT_LOOKUP=1 TX2_READ_FILTER_EARLY=1 TX2_READ_PROFILE=1 TX2_READ_PERMITS=3
fi
(while [[ ! -f /out/finished ]]; do
  for ((i=1; i<${#phases[@]}; i++)); do
    if [[ -f /out/phase-$i.request && ! -f /out/phase-$i.ready ]]; then
      stop "$writer_pid"
      # shellcheck disable=SC2046
      gateway 8080 $(writer_env "${phases[$i]}"); writer_pid=$gw_pid
      echo "$(date -u +%T) writer phase $i ${phases[$i]}" >> /out/phases.log
      echo ready > "/out/phase-$i.ready"
    fi
  done
  sleep .5
done) &
pids+=($!)
status=0
load=(-i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj -i /exp/s5/fuzz.clj -i /exp/rd7/audit.clj -i /exp/rd6/attacks.clj -i /exp/rd6/fleet.clj)
readers="off=http://$addr:8081,on=http://$addr:8082,tuned=http://$addr:8083"
if [[ $driver == groups ]]; then
  # the writer is this JVM, in process on the same storage, with the group writer on
  env RD6_OUT=/out RD6_READERS="$readers" WFIX1_URI="$DATOMIC_URI_TEMPLATE" TRIPLEX_ERASURE_DIRECTORY=/out/erasure TRIPLEX_TRACE_LEVEL=off \
    TX2_SUBJECT_SAVE=0 TX2_GROUP_COMMIT=1 TX2_GROUP_STAGE_CLOCK=1 TX2_GROUP_FAST_REPLY=1 TX2_GROUP_REUSE_PREPARED=1 TX2_LIVE_PRIORITY=1 \
    TX2_GROUP_MAX_MEMBERS=32 TX2_SMALL_ROWS=1 TX2_SAVE_LEDGER=1 TX2_PREDECESSOR_LOOKUP=1 \
    java -Xmx1500m -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "/opt/gateway/src:$cp" clojure.main \
    "${load[@]}" -e '(rd6-fleet/groups-main)' > /out/driver.log 2>&1 || status=$?
else
  RD6_OUT=/out RD6_WRITER=http://$addr:8080 RD6_READERS="$readers" \
    java -Xmx1g -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "/opt/gateway/src:$cp" clojure.main \
    "${load[@]}" -e '(rd6-fleet/main)' > /out/driver.log 2>&1 || status=$?
fi
echo "driver exit $status" >> /out/phases.log
exit $status

#!/usr/bin/env bash
# [DX-RD2] Mac live gate for the pinned short-cut, inside one lab container: PostgreSQL, a transactor and this branch's
# gateway. The Mac side seeds through the gateway; AGE1's own code ages the seed (PREP1's aged-live script, unchanged);
# then each writer phase restarts the gateway with that writer's options and the Mac side saves through it; finally
# three readers run side by side: both options off on 8080, both on on 8081, the cut lookup alone on 8082, and the Mac side compares them.
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
transactor() {  # $1: gateway source the transactor's installed functions load
  DATOMIC_EXT_CLASSPATH=$1 java -server $opts -cp "$(DATOMIC_EXT_CLASSPATH=$1 bin/classpath)" clojure.main \
    -m datomic.launcher "$work/tx.properties" >> /out/transactor.log 2>&1 &
  tx_pid=$!; pids+=($tx_pid); wait_tcp "$tx_pid" 4334
}
gateway() {  # $1 port, then the writer's environment assignments
  local port=$1; shift
  env DATOMIC_EXT_CLASSPATH=/opt/gateway/src TRIPLEX_ERASURE_DIRECTORY=/out/erasure "$@" \
    java -server $opts -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" \
    clojure.main -m triplex.gateway.main "$port" >> "/out/gateway-$port.log" 2>&1 &
  gw_pid=$!; pids+=($gw_pid); wait_tcp "$gw_pid" "$port"
}
stop() { kill "$1" 2>/dev/null || true; wait "$1" 2>/dev/null || true; }
mkdir -p /out/erasure
# PREP1's live-gate writer: the per-person ordered writer.
ordered=(TX2_SUBJECT_SAVE=1 TX2_GROUP_COMMIT=0 TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=1 TX2_GROUP_REUSE_PREPARED=1
  TX2_GROUP_STAGE_CLOCK=1 TX2_GROUP_FAST_REPLY=1 TX2_INT1_WRITE_READBACK=1 TX2_SUBJECT_NUMERIC_OWNER=1
  TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_GROUP_QUEUE_CLOCK=1 TX2_GROUP_MAX_MEMBERS=8)
wait_file() { local i; for ((i=0; i<2400; i++)); do [[ -f $1 ]] && return 0; sleep .5; done; return 1; }
transactor /opt/gateway/src
gateway 8080 "${ordered[@]}"
echo ready > /out/ready
wait_file /out/seed.json
seed=$(cat /out/seed.json)
name=$(node -p 'JSON.parse(process.argv[1]).db' "$seed"); head=$(node -p 'JSON.parse(process.argv[1]).seedCut' "$seed")
# Age with AGE1's code at its load pin: its transactor functions and its own peer JVM, nothing from this branch.
stop "$gw_pid"; stop "$tx_pid"
transactor /age/packages/datomic/gateway/src
java $opts -Dtriplex.codec.spec=/age/packages/datomic/src/codec-spec.json \
  -cp "/opt/datomic/datomic-transactor-pro-1.0.7745.jar:/opt/datomic/lib/*:/age/packages/datomic/gateway/src:/age/lab/experiments/EXP-DX1/age1/src:/aged" \
  clojure.main -m aged-live "$name" "$head" 50 5 300 /out/aged.json > /out/age1.log 2>&1
stop "$tx_pid"
transactor /opt/gateway/src
# Writer phases: the Mac side writes /out/phase-N.env (one assignment per line), waits for phase-N.ready, saves,
# then writes the next phase or /out/compare.
n=0
while :; do
  for ((i=0; i<2400; i++)); do [[ -f /out/phase-$n.env || -f /out/compare ]] && break; sleep .5; done
  stop "$gw_pid"
  if [[ -f /out/phase-$n.env ]]; then
    mapfile -t assignments < <(grep -v '^$' "/out/phase-$n.env")
    gateway 8080 TX2_GATE_PHASE="$n" "${assignments[@]}"
    echo ready > "/out/phase-$n.ready"; n=$((n+1))
  else
    break
  fi
done
reader=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1)
gateway 8080 "${reader[@]}" TX2_PINNED_SHORTCUT=0 TX2_PINNED_CUT_LOOKUP=0
gateway 8081 "${reader[@]}" TX2_PINNED_SHORTCUT=1 TX2_PINNED_CUT_LOOKUP=1
gateway 8082 "${reader[@]}" TX2_PINNED_SHORTCUT=0 TX2_PINNED_CUT_LOOKUP=1
echo ready > /out/compare-ready
wait_file /out/finished

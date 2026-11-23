#!/usr/bin/env bash
# [DX-INT1] Mac toy gate for the owner head on loader-aged people, inside one lab container: PostgreSQL, a transactor
# and this branch's write gateway. The Mac side seeds; AGE1's own code ages the seed (prep1/aged-live/aged_live.clj);
# the stopped cluster is then copied, as the server copies the held cluster for each arm. The same saves run on the
# copy with today's writer (legacy) and on the original with TX2_SUBJECT_OWNER_HEAD=1 (covered); a gateway without
# the option is then started on the covered database to check the admission refusal and reads without the option.
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
wait_file() { local i; for ((i=0; i<2400; i++)); do [[ -f /out/$1 ]] && return; sleep .5; done; return 1; }
sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$work/socket" -U postgres "$@"; }
postgres_start() {  # $1: data directory
  setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/postgres" -D "$1" -h "$addr" -k "$work/socket" -c shared_buffers=24MB \
    >> /out/postgres.log 2>&1 &
  pg_pid=$!; pids+=($pg_pid); wait_tcp "$pg_pid" 5432
}
postgres_stop() { kill -INT "$pg_pid"; wait "$pg_pid" 2>/dev/null || true; }
pg_run initdb -D "$work/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
postgres_start "$work/data"
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
gateway() {  # $1: TX2_SUBJECT_OWNER_HEAD; this branch's gateway with the server writer's subject-save switches
  echo "gateway start owner-head=$1 $(date -u +%FT%TZ)" >> /out/gateway.log
  DATOMIC_EXT_CLASSPATH=/opt/gateway/src TX2_SUBJECT_SAVE=1 TX2_GROUP_COMMIT=0 TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=1 \
    TX2_GROUP_REUSE_PREPARED=1 TX2_GROUP_STAGE_CLOCK=1 TX2_GROUP_FAST_REPLY=1 TX2_INT1_WRITE_READBACK=1 \
    TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_GROUP_QUEUE_CLOCK=1 TX2_GROUP_MAX_MEMBERS=8 \
    TX2_SUBJECT_OWNER_HEAD=$1 \
    java -server $opts -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" \
    clojure.main -m triplex.gateway.main 8080 >> /out/gateway.log 2>&1 &
  gw_pid=$!; pids+=($gw_pid); wait_tcp "$gw_pid" 8080
}
stop() { kill "$1"; wait "$1" 2>/dev/null || true; }
transactor /opt/gateway/src
gateway 0
echo ready > /out/ready
wait_file seed.json
name=$(node -p 'JSON.parse(require("fs").readFileSync("/out/seed.json","utf8")).db')
head=$(node -p 'JSON.parse(require("fs").readFileSync("/out/seed.json","utf8")).seedCut')
# Age with AGE1's code at its load pin: its transactor functions and its own peer JVM, nothing from this branch.
stop "$gw_pid"; stop "$tx_pid"
transactor /age/packages/datomic/gateway/src
java $opts -Dtriplex.codec.spec=/age/packages/datomic/src/codec-spec.json \
  -cp "/opt/datomic/datomic-transactor-pro-1.0.7745.jar:/opt/datomic/lib/*:/age/packages/datomic/gateway/src:/age/lab/experiments/EXP-DX1/age1/src:/gate-age" \
  clojure.main -m aged-live "$name" "$head" 50 5 300 /out/aged.json > /out/age1.log 2>&1
stop "$tx_pid"
# The held aged cluster, stopped; each arm runs on its own physical copy as on the server.
postgres_stop
cp -a "$work/data" "$work/data-legacy"
echo "copied $(du -sk "$work/data" | cut -f1) KiB" >> /out/postgres.log
postgres_start "$work/data-legacy"
transactor /opt/gateway/src
gateway 0
echo legacy > /out/legacy-ready
wait_file legacy-done
stop "$gw_pid"; stop "$tx_pid"; postgres_stop
postgres_start "$work/data"
transactor /opt/gateway/src
gateway 1
echo covered > /out/covered-ready
wait_file covered-done
stop "$gw_pid"
java $opts -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
  -cp "/opt/datomic/datomic-transactor-pro-1.0.7745.jar:/opt/datomic/lib/*:/opt/gateway/src:/gate" \
  clojure.main -m owner-census "$name" /out/owner-census.json > /out/owner-census.log 2>&1
gateway 0
echo fence > /out/fence-ready
wait_file finished

#!/usr/bin/env bash
# [DX-RD6, second review] PostgreSQL 17 (synchronous commit on) and a transactor inside the container, then the JVM of
# rd6/run2.sh ($RD6_JAVA) with WFIX1_URI naming that storage, so every scope the harness opens lives in PostgreSQL.
set -euo pipefail
cd /opt/datomic
work=$(mktemp -d); chmod 755 "$work"; install -d -o 65534 -g 65534 "$work/data" "$work/socket"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=$(node -p 'Object.values(require("node:os").networkInterfaces()).flat().find((x) => x.internal && x.family === "IPv4").address')
pids=()
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
uri="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
DATOMIC_EXT_CLASSPATH=/opt/gateway/src java -server -Xms96m -Xmx512m -XX:+UseSerialGC -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" \
  clojure.main -m datomic.launcher "$work/tx.properties" > "$work/transactor.log" 2>&1 &
pids+=($!); wait_tcp "$!" 4334
mkdir -p /tmp/erasure
export DATOMIC_URI_TEMPLATE="$uri" WFIX1_URI="$uri"
status=0
bash -c "$RD6_JAVA" || status=$?
exit $status

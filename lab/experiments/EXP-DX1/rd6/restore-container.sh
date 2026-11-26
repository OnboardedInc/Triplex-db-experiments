#!/usr/bin/env bash
# [DX-RD6, second review] Restore to an older position, as the project's restore stacks do it (era2/stack-restore.sh):
# PostgreSQL and a transactor; phase a writes groups and the data is backed up (bin/datomic backup-db); phase b writes
# more; every JVM and the transactor stop; restore-db; a fresh transactor and phase c, which writes again over the
# positions the backup lacked and compares every pinned read under every option set (rd6/review2.clj restore-phase).
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
template="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
cp=$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)
tx() { DATOMIC_EXT_CLASSPATH=/opt/gateway/src java -server -Xms96m -Xmx512m -XX:+UseSerialGC -cp "$cp" clojure.main -m datomic.launcher "$work/tx.properties" >> /out/transactor.log 2>&1 & tx_pid=$!; wait_tcp "$tx_pid" 4334; }
phase() { DATOMIC_URI_TEMPLATE="$template" WFIX1_URI="$template" java -Xmx1500m -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
  -cp "/opt/gateway/src:$cp" clojure.main -i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj -i /exp/s5/fuzz.clj -i /exp/rd7/audit.clj \
  -i /exp/rd6/attacks.clj -i /exp/rd6/review2.clj -e "(rd6-review2/restore-phase \"$1\")" >> /out/phase-$1.log 2>&1; }
mkdir -p /tmp/erasure; export TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure
tx
phase a
uri=${template//\{db\}/$(cat /out/restore-name)}
bin/datomic -Xms64m -Xmx256m backup-db "$uri" file:/tmp/rd6-backup > /out/backup.log 2>&1
phase b
kill "$tx_pid"; wait "$tx_pid" 2>/dev/null || true
bin/datomic -Xms96m -Xmx800m restore-db file:/tmp/rd6-backup "$uri" > /out/restore.log 2>&1
echo "restore-db exit $?" >> /out/restore.log
tx
status=0; phase c || status=$?
grep -h "^DX-RD6R2" /out/phase-*.log
exit $status

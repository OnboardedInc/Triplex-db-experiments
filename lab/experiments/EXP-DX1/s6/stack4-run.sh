#!/usr/bin/env bash
# [DX-S6b fourth pass] (from s5/stack3-run.sh) Inside the image s5/image3.sh builds (nothing mounted but /out):
# PostgreSQL with fsync, synchronous commit and full-page writes on, a real transactor, and five gateways of three
# builds: 18081 and 18082 head with TX2_ACCOUNT_CLAIMS=1 (and a wrapping key for sealed values); 18083 a6d02225c with
# TX2_GROUP_COMMIT=1; 18084 23b7df344; 18085 head with the covering-owner options and TX2_ACCOUNT_CLAIMS=1.
# Then the SDK driver /opt/s5/transition4.mjs. The driver asks for a SIGKILL of the transactor by creating
# $work/kill; the watcher kills it, starts it again and answers $work/killed. Times are diagnostic.
set -uo pipefail
cd /opt/datomic
work=/out/work; mkdir -p "$work"; chmod 777 "$work"
data=$(mktemp -d); chmod 755 "$data"
install -d -o 65534 -g 65534 "$data/data" "$data/socket"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=127.0.0.1
children=()
finish() { local s=$?; trap - EXIT; kill "$tx" 2>/dev/null; for p in "${children[@]}"; do kill "$p" 2>/dev/null || true; done; sleep 2; exit "$s"; }
trap finish EXIT
wait_tcp() { local pid=$1 port=$2 i; for ((i=0; i<240; i++)); do kill -0 "$pid" || return 1; if (exec 3<>/dev/tcp/$addr/$port) 2>/dev/null; then return; fi; sleep .5; done; return 1; }
sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$data/socket" -U postgres "$@"; }
pg_run initdb -D "$data/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
pg_run postgres -D "$data/data" -h $addr -k "$data/socket" -c shared_buffers=24MB &
children+=($!); wait_tcp "$!" 5432
secret=$(node -p "require('node:crypto').randomBytes(20).toString('hex')")
sql -d postgres -c "CREATE ROLE datomic LOGIN PASSWORD '$secret'"
sql -d postgres -c "CREATE DATABASE datomic TEMPLATE template0"
sql -d datomic -f bin/sql/postgres-table.sql
for s in fsync synchronous_commit full_page_writes; do printf 'DX-S6T_SQL %s %s\n' "$s" "$(sql -d datomic -c "SHOW $s")"; done
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
mkdir -p /tmp/erasure; export TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure
cp=$(bin/classpath)
# The transactor loads the head's sources (stored functions are data; the classpath only serves requires).
java -server -Xms96m -Xmx368m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError \
  -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "/opt/gateway/src:$cp" clojure.main -m datomic.launcher "$data/transactor.properties" >> "$work/transactor.log" 2>&1 &
tx=$!; wait_tcp "$tx" 4334
echo "DX-S6T_TX started $(date -u +%T)"
gateway() { local port=$1 src=$2 spec=$3; shift 3
  env "$@" DATOMIC_EXT_CLASSPATH=$src java -Xmx448m -XX:+UseSerialGC -Dtriplex.codec.spec=$spec -cp "$src:$cp" clojure.main -m triplex.gateway.main "$port" >> "$work/gw-$port.log" 2>&1 &
  children+=($!); }
b=/opt/builds
key=$(node -p "require('node:crypto').randomBytes(32).toString('base64')")
gateway 18081 /opt/gateway/src /opt/gateway/codec-spec.json TX2_ACCOUNT_CLAIMS=1 TRIPLEX_ERASURE_WRAPPING_KEY=$key
gateway 18082 /opt/gateway/src /opt/gateway/codec-spec.json TX2_ACCOUNT_CLAIMS=1 TRIPLEX_ERASURE_WRAPPING_KEY=$key
gateway 18083 $b/s6a/packages/datomic/gateway/src $b/s6a/packages/datomic/src/codec-spec.json TX2_GROUP_COMMIT=1
gateway 18084 $b/base/packages/datomic/gateway/src $b/base/packages/datomic/src/codec-spec.json
gateway 18085 /opt/gateway/src /opt/gateway/codec-spec.json TX2_ACCOUNT_CLAIMS=1 TX2_SUBJECT_OWNER_HEAD=1 TX2_SUBJECT_SEVERAL_OWNERS=0 TX2_SUBJECT_CREATE=0
healthy() { for port in 18081 18082 18083 18084 18085; do node -e "fetch('http://127.0.0.1:$port/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" || return 1; done; }
for ((i=0; i<480; i++)); do healthy && break; sleep .5; done
healthy || { echo "DX-S6T_STACK gateways never healthy"; tail -5 "$work"/gw-*.log; exit 1; }
echo "DX-S6T_GATEWAYS healthy $(date -u +%T): 18081 18082 head+permission, 18083 $(cat $b/s6a/commit)+group, 18084 $(cat $b/base/commit), 18085 head+covering-owner"
# The driver asks for a transactor restart by creating $work/restart; the watcher restarts it and answers $work/restarted.
start_tx() {
  java -server -Xms96m -Xmx368m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError \
    -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "/opt/gateway/src:$cp" clojure.main -m datomic.launcher "$data/transactor.properties" >> "$work/transactor.log" 2>&1 &
  tx=$!; }
( while true; do
    while [[ ! -e $work/kill ]]; do sleep .02; done
    rm -f "$work/kill"
    kill -9 "$tx"; while kill -0 "$tx" 2>/dev/null; do sleep .1; done
    echo "DX-S6T_TX killed $(date -u +%T.%N)"
    start_tx; wait_tcp "$tx" 4334 && touch "$work/killed"
    echo "DX-S6T_TX restarted $(date -u +%T)"
  done ) &
children+=($!)
node /opt/s5/transition4.mjs http://127.0.0.1:18081 http://127.0.0.1:18082 http://127.0.0.1:18083 http://127.0.0.1:18084 http://127.0.0.1:18085 "$work" > "$work/driver.out" 2>&1
status=$?
grep -E '^DX-S6T_(CASE|DONE)' "$work/driver.log" | cut -c1-2000
tail -3 "$work/driver.out" | cut -c1-500
echo "DX-S6T_STACK_DONE $status"
exit $status

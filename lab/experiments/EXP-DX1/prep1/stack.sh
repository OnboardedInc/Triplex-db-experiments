#!/usr/bin/env bash
set -euo pipefail
[[ "${1:-}" == selftest ]]
cd /opt/datomic
work=$(mktemp -d)
chmod 755 "$work"
install -d -o 65534 -g 65534 "$work/data" "$work/socket"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
children=()
finish() {
  local status=$?
  trap - EXIT
  for ((i=${#children[@]}-1; i>=0; i--)); do
    if ((i == 0)); then
      kill -INT "${children[i]}" 2>/dev/null || true
    else
      kill "${children[i]}" 2>/dev/null || true
    fi
    wait "${children[i]}" 2>/dev/null || true
  done
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
wait_tcp() {
  local pid=$1 port=$2
  for ((i=0; i<240; i++)); do
    kill -0 "$pid"
    if (exec 3<>/dev/tcp/127.0.0.1/"$port") 2>/dev/null; then return; fi
    sleep .5
  done
  return 1
}
sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$work/socket" -U postgres "$@"; }
pg_run initdb -D "$work/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/postgres" -D "$work/data" -h 127.0.0.1 -k "$work/socket" -c shared_buffers=24MB &
children+=("$!")
wait_tcp "$!" 5432
secret=$(node -p "require('node:crypto').randomBytes(20).toString('hex')")
sql -d postgres -c "CREATE ROLE datomic LOGIN PASSWORD '$secret'"
sql -d postgres -c "CREATE DATABASE datomic TEMPLATE template0"
sql -d datomic -f bin/sql/postgres-table.sql
for setting in fsync synchronous_commit full_page_writes; do
  value=$(sql -d datomic -c "SHOW $setting")
  [[ "$value" == on ]]
  printf 'PREP1_SQL %s %s\n' "$setting" "$value"
done
umask 077
cat >"$work/transactor.properties" <<EOF
protocol=sql
host=127.0.0.1
alt-host=127.0.0.1
port=4334
sql-driver-class=org.postgresql.Driver
sql-url=jdbc:postgresql://127.0.0.1:5432/datomic
sql-user=datomic
sql-password=$secret
memory-index-threshold=32m
memory-index-max=80m
object-cache-max=32m
log-dir=$work
pid-file=$work/tx.pid
EOF
export PREP1_ATTEMPT=$(cat /config/attempt)
export DATOMIC_URI_TEMPLATE="datomic:sql://{db}?jdbc:postgresql://127.0.0.1:5432/datomic?user=datomic&password=$secret"
export DATOMIC_EXT_CLASSPATH=/opt/gateway/src
export DATOMIC_JAVA_OPTS="-Xms96m -Xmx368m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json"
java_role() { exec java -server $DATOMIC_JAVA_OPTS -cp "$(bin/classpath)" clojure.main "$@"; }
# [DX-PREP1] Why: run the normal pinned launcher after attaching an attempt-local native observer.
# Rejected: a separate JVM's SQL polling as a substitute for the actual durable append interval.
java_role -i /config/observe.clj -m datomic.launcher "$work/transactor.properties" &
children+=("$!")
wait_tcp "$!" 4334

TX2_GROUP_COMMIT=1 TX2_LIVE_PRIORITY=1 TX2_PREDECESSOR_LOOKUP=1 TX2_GROUP_REUSE_PREPARED=1 \
  TX2_GROUP_MAX_MEMBERS=8 TX2_GROUP_QUEUE_CLOCK=1 TX2_GROUP_STAGE_CLOCK=1 \
  TX2_BULK_ROWS=2048 TX2_BULK_BYTES=1048576 java_role -i bin/bridge.clj -m triplex.gateway.main &
children+=("$!")
wait_tcp "$!" 8080
node /config/probe.mjs

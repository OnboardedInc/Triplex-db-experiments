#!/usr/bin/env bash
set -euo pipefail
[[ "${1:-}" == selftest ]]
cd /opt/datomic
work=$(mktemp -d)
chmod 755 "$work"
install -d -o 65534 -g 65534 "$work/data" "$work/socket"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=$(node -p 'Object.values(require("node:os").networkInterfaces()).flat().find((x) => x.internal && x.family === "IPv4").address')
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
    if (exec 3<>/dev/tcp/"$addr"/"$port") 2>/dev/null; then return; fi
    sleep .5
  done
  return 1
}
sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$work/socket" -U postgres "$@"; }
start_postgres() {
  setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/postgres" -D "$work/data" -h "$addr" -k "$work/socket" -c shared_buffers=24MB &
  children[0]=$!
  wait_tcp "$!" 5432
}
durability() {
  local setting value
  for setting in fsync synchronous_commit full_page_writes; do
    value=$(sql -d datomic -c "SHOW $setting")
    [[ "$value" == on ]]
    printf 'PREP1_SQL %s %s\n' "$setting" "$value"
  done
}
pg_run initdb -D "$work/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
start_postgres
secret=$(node -p "require('node:crypto').randomBytes(20).toString('hex')")
sql -d postgres -c "CREATE ROLE datomic LOGIN PASSWORD '$secret'"
sql -d postgres -c "CREATE DATABASE datomic TEMPLATE template0"
sql -d datomic -f bin/sql/postgres-table.sql
durability
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
memory-index-max=80m
object-cache-max=32m
log-dir=$work
pid-file=$work/tx.pid
EOF
export PREP1_ATTEMPT=$(cat /config/attempt)
export PREP1_MODE=$(cat /config/mode)
export PREP1_URL="http://$addr:8080"
export DATOMIC_URI_TEMPLATE="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
export DATOMIC_EXT_CLASSPATH=/opt/gateway/src
export DATOMIC_JAVA_OPTS="-Xms96m -Xmx368m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json"
java_role() { exec java -server $DATOMIC_JAVA_OPTS -cp "$(bin/classpath)" clojure.main "$@"; }
# [DX-PREP1] Why: run the normal pinned launcher after attaching an attempt-local native observer.
# Rejected: a separate JVM's SQL polling as a substitute for the actual durable append interval.
start_transactor() {
  java_role -i /config/observe.clj -m datomic.launcher "$work/transactor.properties" &
  children[1]=$!
  wait_tcp "$!" 4334
}
start_transactor

gateway() {
  TX2_GROUP_COMMIT=1 TX2_LIVE_PRIORITY=1 TX2_PREDECESSOR_LOOKUP=1 TX2_GROUP_REUSE_PREPARED=1 \
    TX2_GROUP_MAX_MEMBERS=8 TX2_GROUP_QUEUE_CLOCK=1 TX2_GROUP_STAGE_CLOCK=1 TX2_GROUP_FAST_REPLY=1 \
    TX2_BULK_ROWS=2048 TX2_BULK_BYTES=1048576 TX2_PARALLEL_PREPARE=$1 TX2_PREPARE_WINDOW=$2 \
    TX2_PREPARE_PROFILE=${3:-} TX2_PREPARE_GUARD=${4:-} \
    java_role -i bin/bridge.clj -m triplex.gateway.main &
  children+=("$!")
  wait_tcp "$!" 8080
}
stop_gateway() {
  local i=$((${#children[@]} - 1))
  kill "${children[i]}"
  wait "${children[i]}" || true
  unset 'children[i]'
}
case "$PREP1_MODE" in
  ortho) gateway 0 off; node /config/probe.mjs ;;
  prepare|two) gateway 1 "$PREP1_MODE"; node /config/probe.mjs ;;
  live)
    seconds=$(cat /config/seconds)
    for arm in 0 1 2 3; do
      if ((arm == 0 || arm == 3)); then gateway 0 off; else gateway 1 prepare; fi
      node /config/probe.mjs "$PREP1_URL" "$PREP1_URL" "$seconds" "$PREP1_ATTEMPT" "$arm"
      stop_gateway
    done
    ;;
  profile|cheap)
    if [[ "$PREP1_MODE" == profile ]]; then
      arms=(reference guard time reads)
    else
      arms=(reference cheap cheap2 reference2 guard time reads)
    fi
    for arm in "${arms[@]}"; do
      case "$arm" in
        reference|reference2) gateway 0 off ;;
        guard) gateway 1 off ;;
        time|reads) gateway 1 off "$arm" ;;
        cheap|cheap2) gateway 1 off "" basis ;;
      esac
      PREP1_ARM="$arm" node /config/probe.mjs
      stop_gateway
    done
    ;;
  recovery)
    export PREP1_GATE_LIBRARY=1 PREP1_URI="$DATOMIC_URI_TEMPLATE" TX2_PREPARE_GUARD=basis
    export TX2_PREDECESSOR_LOOKUP=1 TX2_GROUP_REUSE_PREPARED=1
    ready="$work/witness.json"
    java_role /config/recovery.clj before "$ready" &
    children[2]=$!
    for ((i=0; i<1200; i++)); do
      kill -0 "${children[2]}"
      [[ -f "$ready" ]] && break
      sleep .1
    done
    [[ -f "$ready" ]]
    kill -KILL "${children[2]}"
    code=0
    wait "${children[2]}" || code=$?
    [[ "$code" == 137 ]]
    unset 'children[2]'
    printf 'PREP1_STOP {"attempt":"%s","gatewayExit":%s}\n' "$PREP1_ATTEMPT" "$code"
    kill "${children[1]}"
    wait "${children[1]}" || true
    kill -INT "${children[0]}"
    wait "${children[0]}"
    start_postgres
    durability
    start_transactor
    java_role /config/recovery.clj after "$ready" &
    children[2]=$!
    wait "${children[2]}"
    ;;
esac

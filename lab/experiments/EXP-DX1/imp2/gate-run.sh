#!/usr/bin/env bash
# [DX-IMP2] Inside the lab Datomic image (sources mounted read-only): the option-off digest against the base sources,
# then the whole-subject gate on a memory database and on PostgreSQL storage with a real transactor.
# Arms (DX_IMP2_ARMS): off-digest, mem, sql.
set -euo pipefail
cd /opt/datomic
export PREP1_ATTEMPT=${PREP1_ATTEMPT:-imp2}
java_opts="-server -Xms128m -Xmx1500m -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json"
# The v0.1 writer's settings (the per-subject writer on, no live priority), as the S1 suites run it.
v01_env="TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 TX2_SUBJECT_PREFETCH=0 TX2_PREDECESSOR_LOOKUP=1
  TX2_GROUP_REUSE_PREPARED=1 TX2_GROUP_FAST_REPLY=1 TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1 TRIPLEX_TRACE_LEVEL=off"
gate() {  # $1 label, $2 uri template ("" for memory)
  local code=0
  ( if [[ -n $2 ]]; then export WFIX1_URI=$2; else unset WFIX1_URI; fi
  env $v01_env DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
    java $java_opts -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main \
    -i /exp/wfix1/regression.clj -i /exp/imp2/imp2_frames.clj -i /exp/imp2/whole_gate.clj -e "(whole-gate/-main)" 2>&1 \
    | grep -v '^WARNING: ' | sed "s/^DX-IMP2_/DX-IMP2_$1_/"; exit "${PIPESTATUS[0]}" ) || code=$?
  echo "DX-IMP2_EXIT $1 $code"
}
off() {  # $1 label, $2 source tree, $3 env set (defaults | v01)
  local extra=""; [[ $3 == v01 ]] && extra=$v01_env
  env -i PATH="$PATH" HOME=/tmp $extra DATOMIC_EXT_CLASSPATH="$2" java $java_opts -cp "$(DATOMIC_EXT_CLASSPATH=$2 bin/classpath)" clojure.main \
    -i /exp/wfix1/regression.clj -i /exp/imp2/imp2_frames.clj -i /exp/imp2/off_digest.clj -e "(imp2-off-digest/-main)" 2>&1 \
    | grep -E '^DX-IMP2_OFF|Exception|Error' | sed "s/^DX-IMP2_OFF/DX-IMP2_OFF $1 $3/" || true
}
for arm in ${DX_IMP2_ARMS:-off-digest mem sql removal}; do
  case $arm in
    off-digest)
      for set in defaults v01; do off base /opt/gateway-base/src $set; off branch /opt/gateway/src $set; done ;;
    mem) gate MEM "" ;;
    removal)
      ( mkdir -p /tmp/imp2-erasure && chmod 700 /tmp/imp2-erasure
        env $v01_env TRIPLEX_ERASURE_DIRECTORY=/tmp/imp2-erasure TRIPLEX_ERASURE_SHRED_GRACE_MS=0 DATOMIC_EXT_CLASSPATH=/opt/gateway/src \
          java $java_opts -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main \
          -i /exp/wfix1/regression.clj -i /exp/imp2/imp2_frames.clj -i /exp/imp2/whole_gate.clj -i /exp/imp2/removal_gate.clj \
          -e "(removal-gate/-main)" 2>&1 | grep -v '^WARNING: '; exit "${PIPESTATUS[0]}" ) || code=$?
      echo "DX-IMP2_EXIT REMOVAL ${code:-0}" ;;
    sql)
      work=$(mktemp -d); chmod 755 "$work"; install -d -o 65534 -g 65534 "$work/data" "$work/socket"
      pg=/opt/thin-pg/usr/local/bin; pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
      addr=127.0.0.1; children=()
      finish() { local s=$?; trap - EXIT; for i in "${!children[@]}"; do kill "${children[i]}" 2>/dev/null || true; wait "${children[i]}" 2>/dev/null || true; done; exit "$s"; }
      trap finish EXIT
      wait_tcp() { local pid=$1 port=$2 i; for ((i=0; i<240; i++)); do kill -0 "$pid"; if (exec 3<>/dev/tcp/$addr/$port) 2>/dev/null; then return; fi; sleep .5; done; return 1; }
      sql() { pg_run psql -XAtq -v ON_ERROR_STOP=1 -h "$work/socket" -U postgres "$@"; }
      pg_run initdb -D "$work/data" -U postgres --locale=C -E UTF8 --auth-local=trust --auth-host=scram-sha-256 >/dev/null
      pg_run postgres -D "$work/data" -h $addr -k "$work/socket" -c shared_buffers=64MB &
      children[0]=$!; wait_tcp "$!" 5432
      secret=$(node -p "require('node:crypto').randomBytes(20).toString('hex')")
      sql -d postgres -c "CREATE ROLE datomic LOGIN PASSWORD '$secret'"
      sql -d postgres -c "CREATE DATABASE datomic TEMPLATE template0"
      sql -d datomic -f bin/sql/postgres-table.sql
      for s in fsync synchronous_commit full_page_writes; do printf 'DX-IMP2_SQL %s %s\n' "$s" "$(sql -d datomic -c "SHOW $s")"; done
      umask 077
      cat >"$work/transactor.properties" <<PROPS
protocol=sql
host=$addr
alt-host=$addr
port=4334
sql-driver-class=org.postgresql.Driver
sql-url=jdbc:postgresql://$addr:5432/datomic
sql-user=datomic
sql-password=$secret
memory-index-threshold=256m
memory-index-max=512m
object-cache-max=32m
log-dir=$work
pid-file=$work/tx.pid
PROPS
      DATOMIC_EXT_CLASSPATH=/opt/gateway/src DATOMIC_JAVA_OPTS="-Xms96m -Xmx1200m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json" \
        env $v01_env java -server -Xms96m -Xmx1200m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json \
        -cp "$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)" clojure.main -m datomic.launcher "$work/transactor.properties" > "$work/transactor.log" 2>&1 &
      children[1]=$!; wait_tcp "$!" 4334
      gate SQL "datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret" ;;
  esac
done
echo DX-IMP2_DONE

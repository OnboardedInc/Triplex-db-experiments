#!/usr/bin/env bash
set -euo pipefail
[[ "${1:-}" == selftest ]]
cd /opt/datomic
export PREP1_MODE=$(cat /config/mode)
export PREP1_ATTEMPT=$(cat /config/attempt)
export TX2_SUBJECT_NUMERIC_OWNER=$(cat /config/subject-owner)
export TX2_SUBJECT_PREFETCH=$(cat /config/subject-prefetch)
export TX2_SUBJECT_ORDERED_IDS=$(cat /config/subject-ordered)
export DX_CHK1_APPEND_GATE=$(cat /config/chk1-replay 2>/dev/null || printf 0)
export TX2_SUBJECT_APPEND_RETIREMENT=$(cat /config/subject-retirement 2>/dev/null || printf 0)
export TX2_SUBJECT_NARROW_REVISION=$(cat /config/subject-serial 2>/dev/null || printf 0)
export TX2_SUBJECT_REUSE_PREDECESSOR=$TX2_SUBJECT_NARROW_REVISION
export TX2_SUBJECT_APPEND_RETIREMENT=$(cat /config/subject-retirement 2>/dev/null || printf 0)
export TX2_SUBJECT_OWNER_HEAD=$(cat /config/subject-head 2>/dev/null || printf 0)
export PREP1_LOOKUP_EVERY=$(cat /config/lookup-every 2>/dev/null || printf 0)
if [[ -f /config/tail-sql ]]; then export PREP1_TAIL_SQL=$(cat /config/tail-sql); fi
if [[ "$PREP1_MODE" == subject-native-suite ]]; then
  # [DX-PREP1] Why: exercise the stock native suite with the real process setting on fresh memory scopes.
  # Rejected: adding PostgreSQL and a transactor for tests written to run in one JVM.
  export DATOMIC_EXT_CLASSPATH=/opt/gateway/src
  export DATOMIC_JAVA_OPTS="-Xms96m -Xmx768m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError"
  export TX2_SUBJECT_SAVE="$(cat /config/subject)"
  printf 'PREP1_SUITE {"attempt":"%s","subject":%s,"numericOwner":%s,"orderedIds":%s}\n' \
    "$PREP1_ATTEMPT" "$TX2_SUBJECT_SAVE" "$TX2_SUBJECT_NUMERIC_OWNER" "$TX2_SUBJECT_ORDERED_IDS"
  exec bin/run -m triplex.gateway.selftest
fi
work=$(mktemp -d)
chmod 755 "$work"
install -d -o 65534 -g 65534 "$work/data" "$work/socket"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=$(node -p 'Object.values(require("node:os").networkInterfaces()).flat().find((x) => x.internal && x.family === "IPv4").address')
children=()
finish() {
  local status=$?
  local i j keys=("${!children[@]}")
  trap - EXIT
  for ((j=${#keys[@]}-1; j>=0; j--)); do
    i=${keys[j]}
    if ((i != 0 && i != 3)); then
      kill "${children[i]}" 2>/dev/null || true
      wait "${children[i]}" 2>/dev/null || true
    fi
  done
  for i in 3 0; do
    if [[ -n "${children[i]-}" ]]; then
      kill -INT "${children[i]}" 2>/dev/null || true
      wait "${children[i]}" 2>/dev/null || true
    fi
  done
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
start_postgres() {
  setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/postgres" -D "${1:-$work/data}" -h "$addr" -k "$work/socket" -c shared_buffers=24MB -c track_wal_io_timing=on &
  children[0]=$!
  wait_tcp "$!" 5432
}
start_standby() {
  local i
  setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/postgres" -D "$work/standby" -h "$addr" -p 5433 -k "$work/socket" -c shared_buffers=16MB -c track_wal_io_timing=on &
  children[3]=$!
  wait_tcp "$!" 5433
  for ((i=0; i<120; i++)); do
    if [[ $(sql -d datomic -c "SELECT count(*) FROM pg_stat_replication WHERE application_name='preplica' AND state='streaming' AND sync_state='sync'") == 1 ]]; then
      [[ $(pg_run psql -XAtq -h "$work/socket" -p 5433 -U postgres -d datomic -c "SHOW fsync") == on ]]
      printf 'PREP1_SQL_REPLICA streaming sync fsync=on\n'
      return
    fi
    sleep .25
  done
  return 1
}
replica_flushed() {
  local lsn i
  lsn=$(sql -d datomic -c "SELECT pg_current_wal_flush_lsn()")
  [[ "$lsn" =~ ^[0-9A-F]+/[0-9A-F]+$ ]]
  for ((i=0; i<120; i++)); do
    if [[ $(sql -d datomic -c "SELECT count(*) FROM pg_stat_replication WHERE application_name='preplica' AND sync_state='sync' AND flush_lsn >= '$lsn'::pg_lsn") == 1 ]]; then
      printf 'PREP1_SQL_REPLICA durable-through %s\n' "$lsn"
      return
    fi
    sleep .25
  done
  return 1
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
if [[ "$PREP1_MODE" == "subject-recovery" || "$PREP1_MODE" == "subject-profile" ]]; then
  # [DX-PREP1] Why: hold each storage commit until the standby has flushed the same WAL.
  # Rejected: a lone primary with fsync enabled (no replica durability).
  sql -d postgres -c "CREATE ROLE datomic_replica LOGIN REPLICATION PASSWORD '$secret'"
  install -m 600 -o 65534 -g 65534 /dev/null "$work/standby.pgpass"
  printf '%s:5432:replication:datomic_replica:%s\n' "$addr" "$secret" > "$work/standby.pgpass"
  install -d -m 700 -o 65534 -g 65534 "$work/standby"
  pg_run pg_basebackup -w -D "$work/standby" -X stream -R -c fast \
    -d "host=$addr port=5432 user=datomic_replica application_name=preplica passfile=$work/standby.pgpass"
  sql -d postgres -c "ALTER SYSTEM SET synchronous_standby_names='FIRST 1 (preplica)'"
  sql -d postgres -c "SELECT pg_reload_conf()" >/dev/null
  start_standby
fi
umask 077
cache=32m index_threshold=32m
if [[ "$PREP1_MODE" == "lookup-profile" ]]; then
  # [DX-PREP1] Why: make index leaves compete for cache on a short fixture.
  # Rejected: treating a fully resident Mac fixture as evidence that the serial path never fetches storage.
  cache=32m index_threshold=8m
fi
cat >"$work/transactor.properties" <<EOF
protocol=sql
host=$addr
alt-host=$addr
port=4334
sql-driver-class=org.postgresql.Driver
sql-url=jdbc:postgresql://$addr:5432/datomic
sql-user=datomic
sql-password=$secret
memory-index-threshold=$index_threshold
memory-index-max=80m
object-cache-max=$cache
log-dir=$work
pid-file=$work/tx.pid
EOF
export PREP1_URL="http://$addr:8080"
if [[ $PREP1_MODE == rolling-recovery ]]; then
  export PREP1_ROLLING_FAIL_PATH="$work/failed-db"
  export TX2_WRITE_OPTIONS_ATTEMPT="$PREP1_ATTEMPT" TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1
  export TX2_SAVE_LEDGER=$((1-TX2_SUBJECT_ORDERED_IDS)) TX2_SMALL_ROWS=$((1-TX2_SUBJECT_ORDERED_IDS))
fi
export DATOMIC_URI_TEMPLATE="datomic:sql://{db}?jdbc:postgresql://$addr:5432/datomic?user=datomic&password=$secret"
export DATOMIC_EXT_CLASSPATH=/opt/gateway/src
export DATOMIC_JAVA_OPTS="-Xms96m -Xmx368m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=$cache -Dtriplex.codec.spec=/opt/gateway/codec-spec.json"
if [[ $PREP1_MODE == lookup-profile && $TX2_SUBJECT_PREFETCH == 1 ]]; then
  # [DX-PREP1] Why: both arms need the same active native dispatcher on the one-CPU slot.
  # Rejected: attaching hints to a transaction while native probe dispatch is disabled.
  export DATOMIC_JAVA_OPTS="$DATOMIC_JAVA_OPTS -Ddatomic.prefetchProbes=true"
fi
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
subject_workers() {
  local n=$1 subject=$2 port i share=$((768 / $1))
  PREP1_PEERS=
  # [DX-PREP1] Why: all peers share the slot CPU cap and the same combined Java heap.
  # Rejected: multiplying memory or CPU with the gateway count.
  for ((i=0; i<n; i++)); do
    port=$((8080+i))
    TX2_SUBJECT_SAVE=$subject TX2_GROUP_COMMIT=$((1-subject)) TX2_LIVE_PRIORITY=$((1-subject)) \
      TX2_PREDECESSOR_LOOKUP=1 TX2_GROUP_REUSE_PREPARED=1 TX2_GROUP_STAGE_CLOCK=1 \
      TX2_GROUP_FAST_REPLY=1 TX2_INT1_WRITE_READBACK=1 TX2_SUBJECT_PROFILE=1 \
      TX2_BULK_ROWS=2048 TX2_BULK_BYTES=1048576 \
      DATOMIC_JAVA_OPTS="-Xms$((128/n))m -Xmx${share}m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -Ddatomic.objectCacheMax=32m -Ddatomic.memoryIndexMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json" \
      java_role -i bin/bridge.clj -m triplex.gateway.main "$port" &
    children[$((4+i))]=$!
    PREP1_PEERS="${PREP1_PEERS:+$PREP1_PEERS,}http://$addr:$port"
  done
  for ((i=0; i<n; i++)); do wait_tcp "${children[4+i]}" "$((8080+i))"; done
  export PREP1_PEERS
}
stop_subject_workers() {
  local i
  for ((i=4; i<4+$1; i++)); do kill "${children[i]}"; done
  for ((i=4; i<4+$1; i++)); do
    wait "${children[i]}" || true
    unset 'children[i]'
  done
}
wal_snapshot() {
  local arm=$1 edge=$2 stats='SELECT to_json(w) FROM pg_stat_wal w' primary standby
  primary=$(sql -d datomic -c "$stats") || return
  standby=$(pg_run psql -XAtq -h "$work/socket" -p 5433 -U postgres -d datomic -c "$stats") || return
  printf 'PREP1_SQL_WAL %s %s primary %s\n' "$arm" "$edge" "$primary"
  printf 'PREP1_SQL_WAL %s %s standby %s\n' "$arm" "$edge" "$standby"
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
  subject-profile)
    for n in 1 2 4; do
      for cell in A B B A; do
        serial=${serial:-0}
        arm="$cell$n-$serial"
        serial=$((serial+1))
        subject=0
        if [[ "$cell" == B ]]; then subject=1; fi
        subject_workers "$n" "$subject"
        wal_snapshot "$arm" before
        PREP1_ARM="$arm" node /config/probe.mjs
        wal_snapshot "$arm" after
        stop_subject_workers "$n"
      done
    done
    ;;
  lookup-profile)
    arms=(A1 B1)
    if [[ $TX2_SUBJECT_PREFETCH == 1 ]]; then arms=(B1 C1); fi
    if [[ $TX2_SUBJECT_ORDERED_IDS == 1 ]]; then arms=(B1 D1); fi
    for arm in "${arms[@]}"; do
      subject=1
      if [[ "$arm" == A1 ]]; then subject=0; fi
      export TX2_SUBJECT_PREFETCH=0
      if [[ "$arm" == C1 ]]; then export TX2_SUBJECT_PREFETCH=1; fi
      export TX2_SUBJECT_ORDERED_IDS=0
      if [[ "$arm" == D1 ]]; then export TX2_SUBJECT_ORDERED_IDS=1; fi
      subject_workers 1 "$subject"
      PREP1_ARM="$arm" node /config/probe.mjs
      stop_subject_workers 1
    done
    ;;
  profile|cheap|census)
    if [[ "$PREP1_MODE" == profile ]]; then
      arms=(time reads reference cheap)
    elif [[ "$PREP1_MODE" == census ]]; then
      export TX2_PREPARE_CENSUS="$PREP1_ATTEMPT"
      # [DX-PREP1] Why: the decision trace already distinguishes the prepared and reference routes.
      # Rejected: seeding a second deep benchmark arm for a routing census.
      arms=(cheap)
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
  rolling-recovery)
    if [[ -f /config/fresh-first ]]; then export PREP1_FRESH_FIRST=1; fi
    # [DX-PREP1] Why: the bundle imports the SCALE1 observer helpers as a library.
    # Rejected: identifying the bundle itself as the observer's standalone IPC entry point.
    rolling_probe() { node --input-type=module -e '
      process.argv.splice(1, 0, "rolling-gate");
      await import("/config/probe.mjs");
    ' "$@"; }
    credit_modes=(barrier6 rolling6 rolling12)
    if [[ $TX2_SUBJECT_APPEND_RETIREMENT == 1 ]]; then credit_modes=(barrier6 rolling6); fi
    if [[ $TX2_SUBJECT_NARROW_REVISION == 1 ]]; then credit_modes=(rolling6); fi
    if [[ $TX2_SUBJECT_OWNER_HEAD == 1 ]]; then
      credit_modes=(barrier6 rolling6)
      export TRIPLEX_ERASURE_DIRECTORY="$work/privacy"
      if [[ -f /config/owner_layout_gate.clj ]]; then
        TX2_SUBJECT_SAVE=1 WFIX1_URI="$DATOMIC_URI_TEMPLATE" java_role -i /config/regression.clj \
          -i /config/owner_layout_gate.clj -e '
            (let [r (clojure.test/run-tests (quote owner-layout-gate))]
              (println "DX-W1_OWNER_LAYOUT_GATE" (clojure.data.json/write-str
                (assoc r :attempt (System/getenv "PREP1_ATTEMPT") :source (.trim (slurp "/config/source")))))
              (shutdown-agents)
              (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))' &
        children[2]=$!
        wait "${children[2]}"
        unset 'children[2]'
        # [DX-W1] Why: pin identical truth in both arms and reboot the reading JVM for each one.
        # Rejected: comparing a warmed treatment with a control that shares its JVM and object cache.
        TX2_SUBJECT_SAVE=1 TX2_SUBJECT_OWNER_HEAD=0 DX_W1_LAYOUT_FILE="$work/layout-reads" \
          java_role -i /config/regression.clj -i /config/owner_layout_gate.clj \
          -e '(do (owner-layout-gate/staged-reads! (System/getenv "DX_W1_LAYOUT_FILE")) (System/exit 0))' &
        children[2]=$!
        wait "${children[2]}"
        unset 'children[2]'
        for layout_arm in covered untouched append legacy; do
          TX2_SUBJECT_SAVE=1 TX2_SUBJECT_OWNER_HEAD=0 DX_W1_LAYOUT_FILE="$work/layout-reads" DX_W1_LAYOUT_ARM="$layout_arm" \
            java_role -i /config/regression.clj -i /config/owner_layout_gate.clj \
            -e '(do (owner-layout-gate/sample-reads! (System/getenv "DX_W1_LAYOUT_FILE") (System/getenv "DX_W1_LAYOUT_ARM")) (System/exit 0))' &
          children[2]=$!
          wait "${children[2]}"
          unset 'children[2]'
        done
        # [Opus W1] Why: compare arms inside each JVM in shuffled order, three fresh JVMs in all.
        # Rejected: ranking arms from one JVM each (identical read code differed by 20% between JVMs).
        for layout_round in 1 2 3; do
          TX2_SUBJECT_SAVE=1 TX2_SUBJECT_OWNER_HEAD=0 DX_W1_LAYOUT_FILE="$work/layout-reads" DX_W1_LAYOUT_ROUND="$layout_round" \
            java_role -i /config/regression.clj -i /config/owner_layout_gate.clj \
            -e '(do (owner-layout-gate/paired-reads! (System/getenv "DX_W1_LAYOUT_FILE") (parse-long (System/getenv "DX_W1_LAYOUT_ROUND"))) (System/exit 0))' &
          children[2]=$!
          wait "${children[2]}"
          unset 'children[2]'
        done
        TX2_SUBJECT_SAVE=1 TX2_SUBJECT_OWNER_HEAD=0 \
          java_role -i /config/regression.clj -i /config/owner_layout_gate.clj \
          -e '(do (owner-layout-gate/shape-report!) (System/exit 0))' &
        children[2]=$!
        wait "${children[2]}"
        unset 'children[2]'
        # [Opus W1] Why: count serial storage reads by index for the three writers on indexed seeds, each from a cold transactor.
        # Rejected: the resident two-save fixture (zero fetches for every arm).
        TX2_SUBJECT_SAVE=1 TX2_SUBJECT_OWNER_HEAD=0 DX_W1_SERIAL_FILE="$work/serial" \
          java_role -i /config/regression.clj -i /config/owner_layout_gate.clj \
          -e '(do (owner-layout-gate/serial-seed! (System/getenv "DX_W1_SERIAL_FILE")) (System/exit 0))' &
        children[2]=$!
        wait "${children[2]}"
        unset 'children[2]'
        for serial_round in 1 2; do
          for serial_arm in legacy append covered; do
            kill "${children[1]}"
            wait "${children[1]}" || true
            start_transactor
            TX2_SUBJECT_SAVE=1 TX2_SUBJECT_OWNER_HEAD=0 DX_W1_SERIAL_FILE="$work/serial" DX_W1_SERIAL_ARM="$serial_arm" \
              DX_W1_SERIAL_ROUND="$serial_round" java_role -i /config/regression.clj -i /config/owner_layout_gate.clj \
              -e '(do (owner-layout-gate/serial-edits! (System/getenv "DX_W1_SERIAL_FILE") (System/getenv "DX_W1_SERIAL_ARM") (parse-long (System/getenv "DX_W1_SERIAL_ROUND"))) (System/exit 0))' &
            children[2]=$!
            wait "${children[2]}"
            unset 'children[2]'
          done
        done
      fi
      TX2_SUBJECT_SAVE=1 java_role /config/serial-gate.clj &
      children[2]=$!
      wait "${children[2]}"
      unset 'children[2]'
      # [DX-W1] Why: use the merged shared authority for a genuinely sealed subject save.
      # Rejected: inferring protected-write coverage from a save that never used a body key.
      sql -d postgres -c 'CREATE DATABASE removal_authority OWNER datomic'
      export TRIPLEX_ERASURE_JDBC="jdbc:postgresql://$addr:5432/removal_authority?user=datomic&password=$secret"
      export TRIPLEX_ERASURE_WRAPPING_KEY=$(node -p "require('node:crypto').randomBytes(32).toString('base64')")
    fi
    for credit_mode in "${credit_modes[@]}"; do
      subject_workers 1 "$TX2_SUBJECT_ORDERED_IDS"
      rolling_probe before "$credit_mode" "$work/$credit_mode.json"
      stop_subject_workers 1
      kill "${children[1]}" 2>/dev/null || true
      wait "${children[1]}" || true
      test -s "$PREP1_ROLLING_FAIL_PATH" && test -s "$PREP1_ROLLING_FAIL_PATH.observed"
      rm -- "$PREP1_ROLLING_FAIL_PATH" "$PREP1_ROLLING_FAIL_PATH.observed"
      kill -INT "${children[0]}"
      wait "${children[0]}"
      start_postgres
      durability
      start_transactor
      subject_workers 1 "$TX2_SUBJECT_ORDERED_IDS"
      rolling_probe after "$credit_mode" "$work/$credit_mode.json"
      stop_subject_workers 1
    done
    ;;
  cache-retirement)
    # [DX-W1] Why: reset the native cache against the same indexed SQL bytes for every treatment.
    # Rejected: changing entity density or comparing a hot cache with an already-mutated seed.
    seed="$work/cache-seed.json"
    export TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1
    subject_workers 1 1
    db=$(node /config/cache.mjs seed "$seed")
    stop_subject_workers 1
    java_role /config/cache_index.clj "$db" &
    children[2]=$!
    wait "${children[2]}"
    unset 'children[2]'
    kill "${children[1]}"
    wait "${children[1]}" || true
    pg_run pg_dump -h "$work/socket" -U postgres -d datomic -Fc > "$work/cache.pgdump"
    export DX_W1_CACHE_SEED=$(sha256sum "$work/cache.pgdump" | cut -d ' ' -f 1)
    original=$PREP1_ATTEMPT
    for pair in 128m:0 128m:1 64m:1 64m:0 32m:0 32m:1; do
      cap=${pair%:*}
      marker=${pair#*:}
      export PREP1_ATTEMPT="$original-$pair" TX2_SUBJECT_APPEND_RETIREMENT="$marker"
      test "$(sha256sum "$work/cache.pgdump" | cut -d ' ' -f 1)" = "$DX_W1_CACHE_SEED"
      pg_run pg_restore -h "$work/socket" -U postgres -d datomic --clean --if-exists --exit-on-error < "$work/cache.pgdump"
      sed -i "s/^object-cache-max=.*/object-cache-max=$cap/" "$work/transactor.properties"
      grep -Fx "object-cache-max=$cap" "$work/transactor.properties"
      PREP1_MODE=lookup-profile start_transactor
      subject_workers 1 1
      node /config/cache.mjs measure "$seed" "$cap" "$marker"
      stop_subject_workers 1
      kill "${children[1]}"
      wait "${children[1]}" || true
    done
    ;;
  production)
    # [DX-REAL2] Why: drive the server producer's phase() on a toy scope with the subject writer and ordered IDs.
    export DX_PREP1_LIBRARY=1 DX_PREP1_CAMPAIGN=rolling DX_REAL2_SET=hour DX_REAL2_PARAMS=/config/production-shape.json
    subject_workers 1 1
    # The bundle carries launch helpers with their own entry checks; never present it as the entry point.
    node --input-type=module -e 'process.argv.splice(1, 0, "production-gate"); await import("/config/probe.mjs");'
    stop_subject_workers 1
    ;;
  subject-query)
    export WFIX1_URI="$DATOMIC_URI_TEMPLATE" TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1
    export TX2_SUBJECT_SAVE="$(cat /config/subject)"
    java_role /config/subject_recovery.clj query &
    children[2]=$!
    wait "${children[2]}"
    ;;
  recovery|subject-recovery)
    if [[ "$PREP1_MODE" == "subject-recovery" ]]; then
      export WFIX1_URI="$DATOMIC_URI_TEMPLATE" TX2_LEAN_NATIVE_QUERY=1 TX2_LEAN_NATIVE_LOG=1
      export TX2_SUBJECT_SAVE="$(cat /config/subject)"
      recovery=/config/subject_recovery.clj
      java_role "$recovery" gate &
      children[2]=$!
      wait "${children[2]}"
      unset 'children[2]'
    else
      export PREP1_GATE_LIBRARY=1 PREP1_URI="$DATOMIC_URI_TEMPLATE" TX2_PREPARE_GUARD=basis
      export TX2_PREDECESSOR_LOOKUP=1 TX2_GROUP_REUSE_PREPARED=1
      recovery=/config/recovery.clj
    fi
    ready="$work/witness.json"
    java_role "$recovery" before "$ready" &
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
    if [[ "$PREP1_MODE" == "subject-recovery" ]]; then replica_flushed; fi
    kill "${children[1]}"
    wait "${children[1]}" || true
    if [[ "$PREP1_MODE" == "subject-recovery" ]]; then
      kill -INT "${children[3]}"
      wait "${children[3]}"
      unset 'children[3]'
    fi
    kill -INT "${children[0]}"
    wait "${children[0]}"
    if [[ -f /config/copy-pgdata.sh ]]; then
      # [DX-PREP1] Why: reopen the measured SQL receipt on the exact cold-copy helper used on the server.
      # Rejected: exercising a mock PostgreSQL layout or continuing to use the old live data path.
      mkdir "$work/clone"
      wal_target=()
      if [[ -f /config/pgdata-wal ]]; then
        # A separate tmpfs exercises cross-device moves without claiming physical durability on the Mac.
        wal_target=("$(mktemp -d /dev/shm/prep1-wal.XXXXXX)")
      fi
      copy_proof=$(PATH="$pg:$PATH" sh /config/copy-pgdata.sh "$work/data" "$work/clone" "${wal_target[@]}")
      control=$(head -n 1 <<< "$copy_proof")
      if ((${#wal_target[@]})); then
        wal_sha=$(sed -n '2p' <<< "$copy_proof")
        [[ $wal_sha =~ ^[a-f0-9]{64}$ && $(readlink -f "$work/clone/pg_wal") == "${wal_target[0]}/pg_wal" && ! -L $work/data/pg_wal ]]
        printf 'PREP1_PGDATA_WAL {"attempt":"%s","walFilesSha":"%s"}\n' "$PREP1_ATTEMPT" "$wal_sha"
      fi
      start_postgres "$work/clone"
      [[ $(sql -d datomic -c 'SHOW data_directory') == "$work/clone" ]]
      held=$(sha256sum "$work/data/global/pg_control" | cut -d ' ' -f 1)
      [[ $control == "$held" ]]
      printf 'PREP1_PGDATA {"attempt":"%s","control":"%s","heldControl":"%s","reopenedCopy":true}\n' \
        "$PREP1_ATTEMPT" "$control" "$held"
    else
      start_postgres
    fi
    durability
    if [[ "$PREP1_MODE" == "subject-recovery" ]]; then start_standby; fi
    start_transactor
    java_role "$recovery" after "$ready" &
    children[2]=$!
    wait "${children[2]}"
    if [[ "$PREP1_MODE" == "subject-recovery" ]]; then replica_flushed; fi
    ;;
esac

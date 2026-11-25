#!/usr/bin/env bash
# [DX-S6] (after s5/stack-run.sh) F1 on the PostgreSQL stack, inside the image s6/image.sh built from the committed
# head (no source mounts): PostgreSQL with fsync and synchronous commit on, a real transactor, two HTTP write gateways
# under a supervisor that restarts them, and the SDK driver (s6/sdk-stack.ts, bundled) saving through TriplesLive.
# While the driver saves, faults at random intervals: the transactor stopped (SIGTERM) or killed (SIGKILL) and
# restarted, paused for 6 s (SIGSTOP; the gateway's 5 s deref times out), or a gateway killed (SIGKILL); the driver's
# proxies drop connections. Then quiet, every outcome verified, and the constraint attacks. Times are diagnostic.
set -uo pipefail
cd /opt/datomic
work=/out/work; mkdir -p "$work"; chmod 777 "$work"
data=$(mktemp -d); chmod 755 "$data"
install -d -o 65534 -g 65534 "$data/data" "$data/socket"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=127.0.0.1
children=()
finish() { local s=$?; trap - EXIT; touch "$work/stop"; kill -CONT "$tx" 2>/dev/null; for p in "${children[@]}"; do kill "$p" 2>/dev/null || true; done
  for f in "$work"/gw-*.pid; do [[ -f $f ]] && kill "$(cat "$f")" 2>/dev/null; done; wait 2>/dev/null; exit "$s"; }
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
for s in fsync synchronous_commit full_page_writes; do printf 'DX-S6_SQL %s %s\n' "$s" "$(sql -d datomic -c "SHOW $s")"; done
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
export DATOMIC_EXT_CLASSPATH=/opt/gateway/src
mkdir -p /tmp/erasure; export TRIPLEX_ERASURE_DIRECTORY=/tmp/erasure
tx_opts="-Xms96m -Xmx368m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError -Ddatomic.objectCacheMax=32m -Dtriplex.codec.spec=/opt/gateway/codec-spec.json"
peer_opts="-Xmx640m -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json"
cp=$(bin/classpath)
faults=()
fault() { faults+=("$1"); echo "DX-S6_FAULT $1 $(date -u +%T)"; }
start_transactor() { java -server $tx_opts -cp "/opt/gateway/src:$cp" clojure.main -m datomic.launcher "$data/transactor.properties" >> "$work/transactor.log" 2>&1 & tx=$!; wait_tcp "$tx" 4334; }
gateway_loop() { local port=$1; while [[ ! -f $work/stop ]]; do
    java $peer_opts -cp "/opt/gateway/src:$cp" clojure.main -m triplex.gateway.main "$port" >> "$work/gw-$port.log" 2>&1 &
    echo $! > "$work/gw-$port.pid"; wait $!; sleep 1; done; }
healthy() { for port in 18081 18082; do node -e "fetch('http://127.0.0.1:$port/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" || return 1; done; }
start_transactor; echo "DX-S6_TX started $(date -u +%T)"
gateway_loop 18081 & children+=($!)
gateway_loop 18082 & children+=($!)
for ((i=0; i<480; i++)); do healthy && break; sleep .5; done
healthy || { echo "DX-S6_STACK gateways never healthy"; exit 1; }
echo "DX-S6_GATEWAYS healthy $(date -u +%T)"
node /out/sdk-stack.mjs "http://127.0.0.1:18081,http://127.0.0.1:18082" "$work" "${S6_SECONDS:-420}" "${S6_SAVES:-12000}" > "$work/driver.out" 2>&1 &
driver=$!; children+=($driver)
for ((i=0; i<600; i++)); do [[ -f $work/faulting ]] && break; kill -0 $driver 2>/dev/null || break; sleep .5; done
RANDOM=${S6_SEED:-31}
while [[ ! -f $work/faults-done ]] && kill -0 $driver 2>/dev/null; do
  sleep $((4 + RANDOM % 6))
  [[ -f $work/faults-done ]] && break
  case $((RANDOM % 6)) in
    0|1) fault "transactor SIGTERM"; kill -TERM "$tx"; wait "$tx" 2>/dev/null; sleep 1; start_transactor ;;
    2) fault "transactor SIGKILL"; kill -KILL "$tx"; wait "$tx" 2>/dev/null; sleep 1; start_transactor ;;
    3) fault "transactor SIGSTOP 6 s (deref timeout)"; kill -STOP "$tx"; sleep 6; kill -CONT "$tx" ;;
    4) fault "gateway 18081 SIGKILL"; kill -KILL "$(cat "$work/gw-18081.pid")" ;;
    5) fault "gateway 18082 SIGKILL"; kill -KILL "$(cat "$work/gw-18082.pid")" ;;
  esac
done
kill -CONT "$tx" 2>/dev/null
kill -0 "$tx" 2>/dev/null || start_transactor
for ((i=0; i<480; i++)); do healthy && break; sleep .5; done
echo "DX-S6_QUIET $(date -u +%T) faults ${#faults[@]}"
printf '%s\n' "${faults[@]}" | sort | uniq -c | sed 's/^/DX-S6_FAULTS /'
touch "$work/quiet"
wait $driver; status=$?
grep -E '^DX-S6_(READY|FAULTED_PHASE|VERIFY|CONSTRAINTS|DONE)' "$work/driver.log" | cut -c1-4000
echo "DX-S6_STACK_DONE $status"
exit $status

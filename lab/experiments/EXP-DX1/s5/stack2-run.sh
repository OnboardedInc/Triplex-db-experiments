#!/usr/bin/env bash
# [DX-S5 second review] Inside the reviewer's image (s5/image2.sh; nothing mounted but /out): PostgreSQL with fsync,
# synchronous commit and full-page writes on, a real transactor, gateway G_on (port 18081, TX2_ACCOUNT_CLAIMS=1) and
# gateway G_off (port 18082, without it), and the SDK driver /opt/s5/mixed-fleet.mjs. The driver asks for transactor
# actions through request files (stop = SIGSTOP, cont = SIGCONT, kill = SIGKILL while paused, then restart); this
# script performs each and acknowledges it. Times are diagnostic.
set -uo pipefail
cd /opt/datomic
work=/out/work; mkdir -p "$work"; chmod 777 "$work"
data=$(mktemp -d); chmod 755 "$data"
install -d -o 65534 -g 65534 "$data/data" "$data/socket"
pg=/opt/thin-pg/usr/local/bin
pg_run() { setpriv --reuid=65534 --regid=65534 --clear-groups "$pg/$@"; }
addr=127.0.0.1
children=()
finish() { local s=$?; trap - EXIT; touch "$work/stop"; kill -CONT "$tx" 2>/dev/null; kill "$tx" 2>/dev/null; for p in "${children[@]}"; do kill "$p" 2>/dev/null || true; done
  for f in "$work"/gw-*.pid; do [[ -f $f ]] && kill "$(cat "$f")" 2>/dev/null; done; sleep 2; exit "$s"; }
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
for s in fsync synchronous_commit full_page_writes; do printf 'DX-S5R2_SQL %s %s\n' "$s" "$(sql -d datomic -c "SHOW $s")"; done
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
start_transactor() { java -server $tx_opts -cp "/opt/gateway/src:$cp" clojure.main -m datomic.launcher "$data/transactor.properties" >> "$work/transactor.log" 2>&1 & tx=$!; wait_tcp "$tx" 4334; }
gateway_loop() { local port=$1 claims=$2; while [[ ! -f $work/stop ]]; do
    TX2_ACCOUNT_CLAIMS=$claims java $peer_opts -cp "/opt/gateway/src:$cp" clojure.main -m triplex.gateway.main "$port" >> "$work/gw-$port.log" 2>&1 &
    echo $! > "$work/gw-$port.pid"; wait $!; sleep 1; done; }
healthy() { for port in 18081 18082; do node -e "fetch('http://127.0.0.1:$port/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" || return 1; done; }
start_transactor; echo "DX-S5R2_TX started $(date -u +%T)"
gateway_loop 18081 1 & children+=($!)
gateway_loop 18082 0 & children+=($!)
for ((i=0; i<480; i++)); do healthy && break; sleep .5; done
healthy || { echo "DX-S5R2_STACK gateways never healthy"; exit 1; }
echo "DX-S5R2_GATEWAYS healthy $(date -u +%T) G_on=18081 (TX2_ACCOUNT_CLAIMS=1) G_off=18082"
node /opt/s5/mixed-fleet.mjs "http://127.0.0.1:18081" "http://127.0.0.1:18082" "$work" "${S5_ROUNDS:-24}" > "$work/driver.out" 2>&1 &
driver=$!; children+=($driver)
n=0; actions=()
while kill -0 $driver 2>/dev/null; do
  next=$((n + 1))
  if [[ -f $work/req-$next ]]; then
    action=$(cat "$work/req-$next")
    case $action in
      stop) kill -STOP "$tx" ;;
      cont) kill -CONT "$tx" ;;
      kill) kill -KILL "$tx"; wait "$tx" 2>/dev/null; sleep 1; start_transactor ;;
    esac
    actions+=("$action"); n=$next; touch "$work/ack-$n"
  else
    sleep .05
  fi
done
wait $driver; status=$?
kill -CONT "$tx" 2>/dev/null
printf '%s\n' "${actions[@]}" | sort | uniq -c | sed 's/^/DX-S5R2_ACTIONS /'
grep -E '^DX-S5R2_(CASE|DONE)' "$work/driver.log" | cut -c1-3000
echo "DX-S5R2_STACK_DONE $status"
exit $status

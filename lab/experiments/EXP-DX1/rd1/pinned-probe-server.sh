#!/usr/bin/env bash
# [DX-RD2] One bare-metal run on a scratch copy of the sealed 1 billion record cluster: PostgreSQL (postgres:17-alpine,
# the scorecard's server settings), one transactor, and pinned-probe.clj in a peer JVM shaped like the scorecard's
# reader (one core, 3 GiB heap, Datomic's default 1.5 GiB object cache), then the same probe with a 12 GiB cache.
# Nothing is written to the sealed source. Usage (as root, from the scorecard build's repository checkout):
#   RD2_PGDATA_SOURCE=... RD2_PGDATA_COPY=... RD2_OUT=... RD2_PROBE=.../pinned-probe.clj \
#   NODE=.../node bash pinned-probe-server.sh
# Rejected: the scorecard's arms (a reader setting there needs code changes, and they do not attribute per read).
set -euo pipefail
: "${RD2_PGDATA_SOURCE:?held stopped PG17 directory}" "${RD2_PGDATA_COPY:?new path on the same NVMe}" \
  "${RD2_OUT:?new evidence directory}" "${RD2_PROBE:?pinned-probe.clj}"
# The scorecard build pins both images (v01/source.ts); the Datomic image is the Java 21 one its reader uses.
datomic_image=${RD2_DATOMIC_IMAGE:-tx2-datomic:1.0.7745-da00}
pg_image=postgres:17-alpine@sha256:526f86d93c6ea08fd3f1fe5605650cacc781b2c6013169a0ad8f42c7d3d84f32
NODE=${NODE:-node}
repo=${RD2_REPO:-$(git -c safe.directory='*' rev-parse --show-toplevel)}
db=${RD2_DB:-s2-WyJ0cmlwbGV4LXNjb3BlLXYxIiwidGVzdCIsInRlc3QiLCJkeC1zY2FsZS1kZWNpc2lvbi1hNjlkZjQ1Yi04YWI2LTQzNzctYjg2OC04NTJlMjhkOTY5MzQtMCIsMF0}
pin=${RD2_PIN:-87002} arm=${RD2_ARM:-600} seconds=${RD2_CONCURRENT_SECONDS:-60} peer_memory=${RD2_PEER_MEMORY:-20g} cpus_pg=${RD2_CPUS_PG:-1} cpus_tx=${RD2_CPUS_TX:-0,7,8} cpu_peer=${RD2_CPU_PEER:-6}
p=rd2-probe
[[ ! -e $RD2_OUT && ! -e $RD2_PGDATA_COPY ]] || { echo "RD2_OUT and RD2_PGDATA_COPY must not exist" >&2; exit 2; }
[[ $(cat "$RD2_PGDATA_SOURCE/PG_VERSION") == 17 && ! -e $RD2_PGDATA_SOURCE/postmaster.pid ]]
mkdir -p "$RD2_OUT"; chmod 700 "$RD2_OUT"
log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "$RD2_OUT/run.log"; }
cleanup() {
  docker logs "$p-tx" > "$RD2_OUT/transactor.log" 2>&1 || true
  docker rm -f "$p-peer" "$p-tx" "$p-pg" >/dev/null 2>&1 || true
  docker network rm "$p-net" >/dev/null 2>&1 || true
  if [[ -d $RD2_PGDATA_COPY && $RD2_PGDATA_COPY != "$RD2_PGDATA_SOURCE" && -f $RD2_PGDATA_COPY/.rd2-scratch-copy ]]; then
    rm -rf --one-file-system "$RD2_PGDATA_COPY"; log "scratch copy removed"
  fi
}
trap cleanup EXIT
docker rm -f "$p-peer" "$p-tx" "$p-pg" >/dev/null 2>&1 || true
git -c safe.directory='*' -C "$repo" rev-parse HEAD > "$RD2_OUT/source"; sha256sum "$RD2_PROBE" > "$RD2_OUT/probe.sha256"
log "copy start"; cp -a --reflink=never "$RD2_PGDATA_SOURCE" "$RD2_PGDATA_COPY"; touch "$RD2_PGDATA_COPY/.rd2-scratch-copy"; log "copy done"
# Subjects: the one-seat ladder's own order (account 0, subject 7919 n mod 100000, n = 1, 2, ...), then onward.
if [[ -n ${RD2_SUBJECTS:-} ]]; then cp "$RD2_SUBJECTS" "$RD2_OUT/subjects.json"; else  # the Mac gate passes its own people
(cd "$repo" && "$NODE" --no-warnings --experimental-transform-types -e '
  const { task, field } = await import("./lab/experiments/EXP-DX1/scale1/decision/plan.ts");
  const { SEED_VALID_FROM } = await import("./lab/bench/lib/world.ts");
  const [db, pin, arm] = process.argv.slice(1);
  const subjects = Array.from({ length: 100000 }, (_, i) => ({ account: 0, subject: (7919 * (i + 1)) % 100000,
    entity: task(0, (7919 * (i + 1)) % 100000) }));
  console.log(JSON.stringify({ db, pin: Number(pin), validAt: SEED_VALID_FROM, attribute: field(0), subjects, arm: Number(arm) }));
' "$db" "$pin" "$arm") > "$RD2_OUT/subjects.json"
fi
docker network create "$p-net" >/dev/null
docker run -d --name "$p-pg" --network "$p-net" --cpuset-cpus "$cpus_pg" --memory 8g --memory-swap 8g \
  --mount "type=bind,source=$RD2_PGDATA_COPY,target=/var/lib/postgresql/data" -e POSTGRES_PASSWORD=datomic \
  "$pg_image" postgres -c shared_buffers=2GB -c track_io_timing=on -c fsync=on -c synchronous_commit=on -c full_page_writes=on >/dev/null
for i in $(seq 1 120); do docker exec "$p-pg" pg_isready -U postgres -d datomic >/dev/null 2>&1 && break; sleep 1; done
docker exec "$p-pg" pg_isready -U postgres -d datomic >/dev/null; log "postgres ready"
cat > "$RD2_OUT/tx.properties" <<P
protocol=sql
host=$p-tx
alt-host=$p-tx
port=4334
sql-driver-class=org.postgresql.Driver
sql-url=jdbc:postgresql://$p-pg:5432/datomic
sql-user=datomic
sql-password=datomic
memory-index-threshold=256m
memory-index-max=1g
object-cache-max=4g
P
docker run -d --name "$p-tx" --network "$p-net" --cpuset-cpus "$cpus_tx" --memory 12g --memory-swap 12g \
  -v "$RD2_OUT/tx.properties:/rd2/tx.properties:ro" --entrypoint /bin/bash "$datomic_image" \
  -c 'cd /opt/datomic && exec bin/transactor -Xms1g -Xmx8g /rd2/tx.properties' >/dev/null
for i in $(seq 1 300); do docker logs "$p-tx" 2>&1 | grep -q "System started" && break; sleep 1; done
docker logs "$p-tx" 2>&1 | grep -q "System started"; log "transactor started"
# [DX-RD2] Why: a new transactor starts as standby and takes over only after the copy's old heartbeat expires.
# Rejected: connecting at "System started" (the peer then reads the previous transactor's location).
active() { docker exec "$p-pg" psql -XAtq -U postgres -d datomic -c "SELECT map FROM datomic_kvs WHERE id = 'pod-coord'" | grep -qF "\"$p-tx"; }
for i in $(seq 1 300); do active && break; sleep 1; done
active; log "transactor active"
uri="datomic:sql://{db}?jdbc:postgresql://$p-pg:5432/datomic?user=datomic&password=datomic"
pgstat() {  # PostgreSQL block reads for Datomic's table and its TOAST, and the cgroup CPU of PostgreSQL
  docker exec "$p-pg" psql -XAtq -U postgres -d datomic -c "SELECT json_build_object('at', now(), 'heapRead', heap_blks_read, 'heapHit', heap_blks_hit, 'toastRead', toast_blks_read, 'toastHit', toast_blks_hit, 'idxRead', idx_blks_read, 'idxHit', idx_blks_hit) FROM pg_statio_user_tables WHERE relname = 'datomic_kvs'"
  docker exec "$p-pg" sh -c 'grep usage_usec /sys/fs/cgroup/cpu.stat'
}
probe() {  # $1 pass name, $2 subject offset (arms), $3 java heap/cache flags
  local pass=$1 offset=$2 flags=$3
  python3 -c 'import json, sys
c = json.load(open(sys.argv[1])); o = int(sys.argv[3]) * c["arm"]
c.update(uriTemplate=sys.argv[2], subjects=c["subjects"][o:], threads=16, concurrentSeconds=int(sys.argv[4]), recentBack=1000)
print(json.dumps(c))' "$RD2_OUT/subjects.json" "$uri" "$offset" "$seconds" > "$RD2_OUT/$pass-config.json"
  { echo "$pass before"; pgstat; } >> "$RD2_OUT/pg-stats.txt"
  log "probe $pass start"
  docker run --rm --name "$p-peer" --network "$p-net" --cpuset-cpus "$cpu_peer" --memory "$peer_memory" --memory-swap "$peer_memory" \
    -e TX2_READ_PERMITS=16 -v "$RD2_OUT:/out" -v "$RD2_PROBE:/rd2/pinned-probe.clj:ro" \
    -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" -v "$repo/packages/datomic/src/codec-spec.json:/rd2/codec-spec.json:ro" \
    --entrypoint /bin/bash "$datomic_image" -c "cd /opt/datomic && exec java -XX:ActiveProcessorCount=1 -XX:+UseG1GC -XX:MaxGCPauseMillis=50 $flags \
      -Dtriplex.codec.spec=/rd2/codec-spec.json -Xlog:gc=info:file=/out/$pass-gc.log \
      -XX:StartFlightRecording=filename=/out/$pass.jfr,settings=profile,dumponexit=true \
      -cp \"\$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)\" clojure.main /rd2/pinned-probe.clj /out/$pass-config.json /out/$pass.ndjson" \
    > "$RD2_OUT/$pass.log" 2>&1
  { echo "$pass after"; pgstat; } >> "$RD2_OUT/pg-stats.txt"
  log "probe $pass done"
}
# Pass 1: the scorecard reader's shape (one core, 3 GiB heap, Datomic's default object cache of half the heap).
probe reader 0 "-Xms256m -Xmx3072m"
# Pass 2: the same core with a 12 GiB object cache, new people.
probe bigcache 50 "${RD2_BIG_FLAGS:--Xms1g -Xmx16g -Ddatomic.objectCacheMax=12g}"
log "complete"

#!/usr/bin/env bash
# [DX-S4] Why: fresh physical storage per variant isolates engine overhead. Rejected: measuring several databases in one KVS table.
set -euo pipefail
mode=${1:?clone|variant}; variant=${2:-}
p=$S4_PREFIX; out=$S4_EVIDENCE/$p
here=$(cd "$(dirname "$0")" && pwd)
pg_host=$p-pg;tx_host=$p-tx; pg_alias=();tx_alias=()
# [DX-S4] Why: a physical SQL clone retains its advertised storage/transactor identity. Resolve it only inside our new isolated network. Rejected: changing original containers or SQL catalog bytes.
if [[ $mode == clone ]]; then
 pg_host=tx2-dxh5-seed1000b-pg;tx_host=tx2-dxh5-seed1000b-tx
 pg_alias=(--network-alias "$pg_host");tx_alias=(--network-alias "$tx_host")
fi
if [[ $mode == variant ]]; then python3 "$here/check-input.py" "$S4_INPUT" > "$out/input-check.json"; fi
journal_mount=()
if [[ $variant == f ]]; then
 : "${S4_JOURNAL:?real prepared native journal corpus required}"
 python3 "$here/journal-input.py" check "$S4_JOURNAL" > "$out/journal-input-check.json"
 journal_mount=(-v "$S4_JOURNAL:/journals:ro")
fi
docker image inspect tx2-datomic:1.0.7745-da00 > "$out/datomic-image.json"
docker network create "$p-net" >/dev/null
docker volume create "$p-pg-data" >/dev/null
docker create --name "$p-extract" --pull never tx2-datomic:1.0.7745-da00 >/dev/null
for f in postgres-db.sql postgres-table.sql postgres-user.sql; do docker cp "$p-extract:/opt/datomic/bin/sql/$f" "$out/$f"; done
docker cp "$p-extract:/opt/datomic/config/samples/sql-transactor-template.properties" "$out/template.properties"
docker rm "$p-extract" >/dev/null
if [[ $mode == clone ]]; then
 [[ -z $(docker ps --filter volume=tx2-dxh5-seed-1000-pg-data -q) ]] || exit 2
 docker run --rm --pull never --name "$p-copy" -v tx2-dxh5-seed-1000-pg-data:/from:ro -v "$p-pg-data:/to" postgres:17-alpine sh -c 'du -sk /from; du -sk /from/pg_wal; cp -a /from/. /to/' > "$out/clone.txt"
fi
python3 - "$out" "$p" "$pg_host" "$tx_host" <<'PY'
import sys,pathlib
p=pathlib.Path(sys.argv[1]);prefix=sys.argv[2];pg_host=sys.argv[3];tx_host=sys.argv[4]
settings={'protocol':'sql','host':tx_host,'alt-host':tx_host,'sql-url':'jdbc:postgresql://'+pg_host+':5432/datomic','sql-user':'datomic','sql-password':'datomic','memory-index-threshold':'32m','memory-index-max':'256m','object-cache-max':'128m'}
lines=[s for s in (p/'template.properties').read_text().splitlines() if s.partition('=')[0].strip() not in settings]
(p/'sql.properties').write_text('\n'.join(lines)+'\n'+'\n'.join(k+'='+v for k,v in settings.items())+'\n')
PY
docker run -d --pull never --name "$p-pg" --network "$p-net" ${pg_alias[@]+"${pg_alias[@]}"} --memory 1g -e POSTGRES_PASSWORD=datomic -v "$p-pg-data:/var/lib/postgresql/data" postgres:17-alpine postgres -c max_wal_size=128MB -c min_wal_size=32MB -c checkpoint_timeout=1min > "$out/pg-id.txt"
ready=false
for i in {1..60}; do if docker exec "$p-pg" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=true; break; fi; sleep 1; done
$ready || exit 1
if [[ $mode == variant ]]; then
 docker exec -i "$p-pg" psql -v ON_ERROR_STOP=1 -U postgres > "$out/create.log" <<'SQL'
CREATE DATABASE datomic TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C';
CREATE ROLE datomic LOGIN PASSWORD 'datomic';
\connect datomic
CREATE TABLE datomic_kvs(id text NOT NULL PRIMARY KEY,rev integer,map text,val bytea);
GRANT ALL ON TABLE datomic_kvs TO datomic;
SQL
fi
docker exec "$p-pg" psql -U postgres -d datomic -c '\d+ datomic_kvs' > "$out/schema.txt"
docker exec -i "$p-pg" psql -U postgres -d datomic -At < "$here/anatomy.sql" > "$out/before.json"
docker exec "$p-pg" psql -U postgres -d datomic -Atc "SELECT json_build_object('id',id,'base64',encode(val,'base64')) FROM datomic_kvs WHERE substring(val from 1 for 2)=decode('1f8b','hex') ORDER BY octet_length(val) DESC LIMIT 12;" > "$out/gzip-samples.jsonl"
python3 "$here/gzip-samples.py" "$out"
docker exec "$p-pg" psql -v ON_ERROR_STOP=1 -U postgres -d datomic -c 'CREATE EXTENSION IF NOT EXISTS pgstattuple; SELECT row_to_json(s) FROM pgstattuple('\''datomic_kvs'\'') s;' > "$out/tuples-before.txt"
docker run -d --pull never --name "$p-tx" --network "$p-net" ${tx_alias[@]+"${tx_alias[@]}"} --memory 2g -e JAVA_OPTS='-Xms128m -Xmx1g' -v "$out:/s4:ro" --entrypoint /opt/datomic/bin/transactor tx2-datomic:1.0.7745-da00 /s4/sql.properties > "$out/tx-id.txt"
sleep 35
# [DX-S4] Why: retain the installed compression-related implementation symbols as format evidence. Rejected: identifying a compression codec only by missing gzip magic.
docker exec "$p-tx" sh -c 'find /opt/datomic -name "*.jar" -maxdepth 3' > "$out/jars.txt"
docker cp "$p-tx:/opt/datomic/log" "$out/transactor-initial-logs" > "$out/log-copy.txt" 2>&1 || true
base="datomic:sql://?jdbc:postgresql://$pg_host:5432/datomic?user=datomic&password=datomic"
docker inspect "$p-pg" "$p-tx" > "$out/containers-before.json"
peer_rc=0
docker run --pull never --name "$p-peer" --network "$p-net" --memory 3g -e DATOMIC_JAVA_OPTS='-Xms128m -Xmx2g' -e DATOMIC_EXT_CLASSPATH=/s4 ${journal_mount[@]+"${journal_mount[@]}"} -v "$here:/s4:ro" -v "$S4_INPUT:/input:ro" -v "$out:/attempt" --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m s4 "$mode" "$base" "$variant" > "$out/peer.jsonl" 2> "$out/peer.stderr" || peer_rc=$?
docker cp "$p-tx:/opt/datomic/log" "$out/transactor-final-logs" >> "$out/log-copy.txt" 2>&1 || true
if [[ $peer_rc != 0 ]]; then report=$(sed -n 's|^/tmp/clojure-[0-9]*.edn$|&|p' "$out/peer.stderr"); [[ -z $report ]] || docker cp "$p-peer:$report" "$out/peer-error.edn"; exit "$peer_rc"; fi
docker inspect "$p-pg" "$p-tx" "$p-peer" > "$out/containers.json"
if [[ $mode == variant ]]; then python3 "$here/verify.py" "$out" "$variant" > "$out/content-check.log"; else python3 "$here/verify-clone.py" "$out" > "$out/content-check.log"; fi
# [DX-S4] Why: gc-storage schedules background collection; wait for observed key-value stability before vacuum. Rejected: treating the API return as completed deletion.
last= stable=0
for i in {1..30}; do
 now=$(docker exec "$p-pg" psql -U postgres -d datomic -Atc 'SELECT count(*),sum(octet_length(val)) FROM datomic_kvs;')
 printf '%s %s\n' "$(date -u +%FT%TZ)" "$now" >> "$out/gc-observations.txt"
 if [[ $now == "$last" ]]; then stable=$((stable+1)); else stable=0; fi
 [[ $i -lt 7 || $stable -lt 6 ]] || break
 last=$now; sleep 5
done
[[ $stable -ge 6 ]] || { echo 'GC storage did not become stable' >&2;exit 1; }
docker exec -i "$p-pg" psql -v ON_ERROR_STOP=1 -U postgres -d datomic -At < "$here/anatomy.sql" > "$out/after-gc.json"
docker exec "$p-pg" psql -U postgres -d datomic -Atc "SELECT row_to_json(s) FROM pgstattuple('datomic_kvs') s; SELECT row_to_json(s) FROM pgstattuple((SELECT reltoastrelid::regclass FROM pg_class WHERE relname='datomic_kvs')) s;" > "$out/tuples-after-gc.jsonl"
docker stop -t 20 "$p-tx" >/dev/null
docker exec "$p-pg" psql -v ON_ERROR_STOP=1 -U postgres -d datomic -c 'VACUUM FULL;' -c 'CHECKPOINT;' > "$out/vacuum.log"
docker exec -i "$p-pg" psql -v ON_ERROR_STOP=1 -U postgres -d datomic -At < "$here/anatomy.sql" > "$out/after-vacuum.json"
docker exec "$p-pg" psql -U postgres -d datomic -Atc "SELECT row_to_json(s) FROM pgstattuple('datomic_kvs') s;" > "$out/tuples-after.json"
docker stop -t 20 "$p-pg" >/dev/null
docker run --rm --pull never --name "$p-du" -v "$p-pg-data:/data:ro" postgres:17-alpine sh -c 'du -sk /data; du -sk /data/pg_wal; du -sk /data/base/*' > "$out/stopped-du.txt"
cat "$out/after-vacuum.json"

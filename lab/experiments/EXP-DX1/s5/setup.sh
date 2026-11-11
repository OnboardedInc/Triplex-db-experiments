#!/usr/bin/env bash
# [DX-S5] Why: use R2's local image topology and H4 memory placement without changing stack/up.sh. Rejected: downloading tools.
if [[ ${S5_DIAGNOSTIC:-0} != 1 ]]; then
docker create --pull never --name "$prefix-extract" -v "$prefix-tools:/tool" node:22.23.2-bookworm-slim sh -c 'cp /usr/local/bin/node /tool/node; cp /usr/lib/*-linux-gnu/libstdc++.so.6 /usr/lib/*-linux-gnu/libgcc_s.so.1 /tool/'
docker start -a "$prefix-extract"; docker rm "$prefix-extract"
fi
mkdir -p "$out/config"
docker create --pull never --name "$prefix-extract" tx2-datomic:1.0.7745-da00
docker cp "$prefix-extract:/opt/datomic/config/samples/sql-transactor-template.properties" "$out/config/template.properties"
docker rm "$prefix-extract"
python3 - "$out/config" "$prefix" <<'PY'
import sys,pathlib
root=pathlib.Path(sys.argv[1]); prefix=sys.argv[2]
s={'protocol':'sql','host':prefix+'-tx','alt-host':prefix+'-tx','sql-url':'jdbc:postgresql://'+prefix+'-pg:5432/datomic','sql-user':'datomic','sql-password':'datomic','memory-index-threshold':'256m','memory-index-max':'1g','object-cache-max':'1g'}
lines=[l for l in (root/'template.properties').read_text().splitlines() if l.partition('=')[0].strip() not in s]
(root/'sql.properties').write_text('\n'.join(lines)+'\n'+'\n'.join(k+'='+v for k,v in s.items())+'\n')
PY
docker network create "$prefix-net"
docker run -d --pull never --name "$prefix-pg" --network "$prefix-net" --cpuset-cpus 0 --memory 2g --memory-swap 2g -e POSTGRES_PASSWORD=datomic -v "$prefix-pg-data:/var/lib/postgresql/data" postgres:17-alpine postgres -c shared_buffers=512MB -c max_wal_size=1GB -c checkpoint_timeout=5min
for ((i=0;i<90;i++)); do docker exec "$prefix-pg" pg_isready -h 127.0.0.1 -U postgres && break; sleep 1; done
if [[ $fresh == true ]]; then
docker exec -i "$prefix-pg" psql -v ON_ERROR_STOP=1 -U postgres <<'SQL'
CREATE DATABASE datomic TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C';
CREATE ROLE datomic LOGIN PASSWORD 'datomic';
\connect datomic
-- [DX-S5] Why: hash-partition the unchanged logical KVS so VACUUM FULL rewrites at most one sixteenth at a time.
-- Rejected: rewriting the entire 100k live table beside its old allocation (Mac reserve can make it inadmissible).
CREATE TABLE datomic_kvs(id text NOT NULL PRIMARY KEY,rev integer,map text,val bytea) PARTITION BY HASH(id);
DO $$ BEGIN
 FOR i IN 0..15 LOOP
  EXECUTE format('CREATE TABLE datomic_kvs_p%s PARTITION OF datomic_kvs FOR VALUES WITH (MODULUS 16, REMAINDER %s)',i,i);
 END LOOP;
END $$;
GRANT ALL ON TABLE datomic_kvs TO datomic;
SQL
fi
# [DX-S5] Why: record and enforce actual PostgreSQL durability settings on every fresh seed.
# Rejected: assuming image defaults are sufficient evidence for durable ACKs.
durability=$(docker exec "$prefix-pg" psql -U postgres -d datomic -Atc 'SHOW fsync; SHOW synchronous_commit; SHOW full_page_writes;')
printf 'durability fsync/synchronous_commit/full_page_writes:\n%s\n' "$durability"
[[ $durability == $'on\non\non' ]] || { echo 'durability settings refused'; exit 1; }
docker run -d --pull never -v "${S5_LOGBACK:-$repo/lab/experiments/EXP-DX1/s5/logback.xml}:/opt/datomic/bin/logback.xml:ro" --name "$prefix-tx" --network "$prefix-net" --cpuset-cpus 0,1,2,3 --memory 4g --memory-swap 4g -e "JAVA_OPTS=-Xms256m -Xmx3g ${S5_TX_JAVA_EXTRA:-}" -v "$out/config:/config:ro" --entrypoint /opt/datomic/bin/transactor tx2-datomic:1.0.7745-da00 /config/sql.properties
for role in w r; do
 # [DX-S5] Why: seeding has one JS main thread, leaving two private writer cores without changing evaluation placement.
 # Rejected: serializing writer preparation on core 1 while spare VM CPUs remain idle.
 cpu=4,5; [[ $role == w ]] || cpu=2,3
 host_port=18542; [[ $role == w ]] || host_port=18543
 docker run -d --pull never -v "${S5_LOGBACK:-$repo/lab/experiments/EXP-DX1/s5/logback.xml}:/opt/datomic/bin/logback.xml:ro" --restart on-failure:10 --name "$prefix-gw-$role" --network "$prefix-net" --cpuset-cpus "$cpu" --memory 3g --memory-swap 3g -e "DATOMIC_JAVA_OPTS=-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g -Dtriplex.codec.spec=/opt/replica-codec-spec.json ${S5_PEER_JAVA_EXTRA:-}" -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src -e "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic" -v "$repo/packages/datomic/gateway:/opt/gateway:ro" -v "$repo/packages/datomic/src/codec-spec.json:/opt/replica-codec-spec.json:ro" --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m triplex.gateway.main
 done
if [[ ${S5_DIAGNOSTIC:-0} == 1 ]]; then return 0; fi
docker run --rm --pull never --name "$prefix-copy" --network "$prefix-net" node:22.23.2-bookworm-slim node -e '
for (const role of ["w","r"]) { let ok=false; for(let i=0;i<180;i++){try{let r=await fetch("http://"+process.argv[1]+"-gw-"+role+":8080/health"); if(r.ok){console.log(await r.text());ok=true;break;}}catch{} await new Promise(r=>setTimeout(r,1000));}if(!ok)process.exit(1);}' "$prefix"

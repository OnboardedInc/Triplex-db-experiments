#!/bin/bash
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
SRC=$(cd "$(dirname "$0")" && pwd)
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1
mkdir -p "$OUT"
docker ps -a > "$OUT/initial-containers.txt"
docker image inspect tx2-datomic:1.0.7745-da00 postgres:17-alpine > "$OUT/images.json"
docker network create tx2-dxs1-net
docker volume create tx2-dxs1-pg-data
docker run -d --name tx2-dxs1-pg --network tx2-dxs1-net --cpuset-cpus 0 -m 1g -e POSTGRES_PASSWORD=local-spike -v tx2-dxs1-pg-data:/var/lib/postgresql/data postgres:17-alpine
until docker exec tx2-dxs1-pg pg_isready -U postgres; do sleep 1; done
# [DX-S1] Why: PG17 removed OIDS and Alpine lacks en_US.UTF-8; use UTF8/C and the same four-column table. Rejected: verbatim obsolete distribution SQL (syntax/locale failures).
docker exec -i tx2-dxs1-pg psql -v ON_ERROR_STOP=1 -U postgres <<'SQL'
CREATE DATABASE datomic TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C';
CREATE ROLE datomic LOGIN PASSWORD 'datomic';
\connect datomic
CREATE TABLE datomic_kvs (id text NOT NULL PRIMARY KEY, rev integer, map text, val bytea);
GRANT ALL ON TABLE datomic_kvs TO datomic;
SHOW fsync;
SHOW synchronous_commit;
SHOW full_page_writes;
SHOW wal_sync_method;
SQL
cat > "$OUT/transactor.properties" <<'PROPS'
protocol=sql
host=tx2-dxs1-tx
alt-host=tx2-dxs1-tx
port=4334
sql-url=jdbc:postgresql://tx2-dxs1-pg:5432/datomic
sql-user=datomic
sql-password=datomic
sql-driver-class=org.postgresql.Driver
memory-index-threshold=32m
memory-index-max=256m
object-cache-max=128m
PROPS
docker run -d --name tx2-dxs1-tx --network tx2-dxs1-net --cpuset-cpus 1 -m 2g -v "$OUT:/evidence" -e DATOMIC_JAVA_OPTS='-Xms1g -Xmx1g' --entrypoint /opt/datomic/bin/transactor tx2-datomic:1.0.7745-da00 /evidence/transactor.properties

#!/usr/bin/env bash
# [DX-RD2] Mac gate for pinned-probe-server.sh, run inside the lab VM as root: build a small stopped PG17 cluster
# holding a lean scope (PostgreSQL storage, this branch's gateway, writes through the SDK from the Mac), then run the
# server wrapper on it unchanged with Mac-sized overrides. Diagnostic only.
#   build:  bash pinned-probe-server-gate.sh up WORKDIR        (prints when the gateway on 127.0.0.1:18633 is ready)
#   stop:   bash pinned-probe-server-gate.sh down WORKDIR      (clean PostgreSQL shutdown; WORKDIR/sealed stays)
set -euo pipefail
mode=$1 work=$2 p=rd2g
repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
pg_image=postgres:17-alpine@sha256:526f86d93c6ea08fd3f1fe5605650cacc781b2c6013169a0ad8f42c7d3d84f32
image=${RD2_DATOMIC_IMAGE:-tx2-datomic:1.0.7745-da00}
if [[ $mode == up ]]; then
  [[ ! -e $work ]]; mkdir -p "$work/sealed"
  docker network create "$p-net" >/dev/null
  docker run -d --name "$p-pg" --network "$p-net" --memory 1g --mount "type=bind,source=$work/sealed,target=/var/lib/postgresql/data" \
    -e POSTGRES_PASSWORD=datomic "$pg_image" >/dev/null
  for i in $(seq 1 60); do docker exec "$p-pg" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done; sleep 2
  docker run --rm --entrypoint cat "$image" /opt/datomic/bin/sql/postgres-table.sql > "$work/table.sql"
  docker exec -i "$p-pg" psql -XAtq -v ON_ERROR_STOP=1 -U postgres -c "CREATE ROLE datomic LOGIN PASSWORD 'datomic'" -c "CREATE DATABASE datomic TEMPLATE template0"
  docker exec -i "$p-pg" psql -XAtq -v ON_ERROR_STOP=1 -U postgres -d datomic < "$work/table.sql"
  cat > "$work/tx.properties" <<P
protocol=sql
host=$p-dt
alt-host=$p-dt
port=4334
sql-driver-class=org.postgresql.Driver
sql-url=jdbc:postgresql://$p-pg:5432/datomic
sql-user=datomic
sql-password=datomic
memory-index-threshold=16m
memory-index-max=128m
object-cache-max=128m
P
  docker run -d --name "$p-dt" --network "$p-net" --memory 3g -p 127.0.0.1:18633:8080 \
    -v "$work/tx.properties:/rd2/tx.properties:ro" -v "$repo/packages/datomic/gateway/src:/opt/gateway/src:ro" \
    -v "$(dirname "$0"):/rd1:ro" -e RD2_TX_PROPERTIES=/rd2/tx.properties \
    -e "DATOMIC_URI_TEMPLATE=datomic:sql://{db}?jdbc:postgresql://$p-pg:5432/datomic?user=datomic&password=datomic" \
    --entrypoint /bin/bash "$image" /rd1/pinned-probe-gate.sh >/dev/null
  for i in $(seq 1 180); do curl -fsS http://127.0.0.1:18633/health >/dev/null 2>&1 && { echo ready; exit 0; }; sleep 1; done
  docker logs "$p-dt" | tail -20; exit 1
else
  docker rm -f "$p-dt" >/dev/null
  docker stop -t 60 "$p-pg" >/dev/null; docker rm "$p-pg" >/dev/null; docker network rm "$p-net" >/dev/null
  docker run --rm --mount "type=bind,source=$work/sealed,target=/d" --entrypoint pg_controldata "$pg_image" /d | grep "cluster state"
fi

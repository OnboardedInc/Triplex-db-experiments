#!/bin/bash
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
SRC=$(cd "$(dirname "$0")" && pwd)
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1
docker exec tx2-dxs1-pg psql -U postgres -c "ALTER SYSTEM SET log_min_duration_statement = 0"
docker exec tx2-dxs1-pg psql -U postgres -c 'SELECT pg_reload_conf()'
trap 'docker exec tx2-dxs1-pg psql -U postgres -c "ALTER SYSTEM RESET log_min_duration_statement"; docker exec tx2-dxs1-pg psql -U postgres -c "SELECT pg_reload_conf()"' EXIT
bash "$SRC/peer.sh" pgsample 2 closed dxs1-write q1-pg-sample 40 mix 200 50 > "$OUT/q1-pg-sample-peer.log" 2>&1
docker logs tx2-dxs1-pg > "$OUT/q1-pg-statements.log" 2>&1

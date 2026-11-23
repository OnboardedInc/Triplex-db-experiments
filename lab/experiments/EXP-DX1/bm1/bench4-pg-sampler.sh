#!/usr/bin/env bash
# [DX-BM1] Why: record whether autovacuum runs and how fast WAL grows on a never-vacuumed fresh copy during a measured run.
# One read-only query every 10 s per running "-pg" container; stops when the watched unit stops.
# Rejected: enabling extra PostgreSQL logging (changes the measured configuration).
# Usage: bench4-pg-sampler.sh UNIT OUTPUT_FILE
unit=$1 out=$2
q="select clock_timestamp(), pg_current_wal_lsn(), pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')::bigint, (select count(*) from pg_stat_activity where backend_type = 'autovacuum worker'), coalesce((select string_agg(relid::regclass::text || ':' || phase || ':' || heap_blks_scanned || '/' || heap_blks_total, ',') from pg_stat_progress_vacuum), '')"
while systemctl is-active -q "$unit"; do
  for c in $(docker ps --format '{{.Names}}' | grep -E -- '-pg$'); do
    row=$(timeout 5 docker exec "$c" psql -U postgres -At -F '|' -c "$q" 2>&1 | head -1)
    printf '%s|%s\n' "$c" "$row" >> "$out"
  done
  sleep 10
done

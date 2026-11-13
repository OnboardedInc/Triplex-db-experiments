#!/usr/bin/env bash
# [DX-T1-4] Why: pg_test_fsync measures this attempt's PG volume, with no acknowledged database writes weakened.
# Rejected: host fsync or an overlay filesystem benchmark (a different durability path).
set -euo pipefail
prefix=${1:?owned prefix};out=${2:?attempt directory}
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ && $(basename "$out") == "$prefix" ]] || exit 2
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
python3 - "$HOME/Claude/Projects/triplex-db-2/locks/measure/owner.json" <<'PY'
import json,os,sys
r=json.load(open(sys.argv[1]));assert r['id']=='DX-T1';os.kill(r['pid'],0)
PY
docker inspect "$prefix-pg" > "$out/fsync-container.json"
docker exec "$prefix-pg" sh -c '
set -eu
f=/var/lib/postgresql/data/dxt1-fsync-probe
[ ! -e "$f" ]
trap '\''rm -f "$f"'\'' EXIT INT TERM
date -u +%FT%TZ
cat /proc/mounts
pg_test_fsync -s 1 -f "$f"
date -u +%FT%TZ
' > "$out/fsync-probe.log" 2>&1
docker exec "$prefix-pg" psql -X -At -U postgres -d datomic -c 'SHOW fsync; SHOW synchronous_commit; SHOW full_page_writes; SHOW wal_sync_method; SHOW commit_delay; SHOW commit_siblings;' > "$out/fsync-settings.txt"

#!/usr/bin/env bash
# [DX-S4] Why: measure a fresh clone, never run a database on the supplied source. Rejected: destructive vacuum as part of observation.
set -euo pipefail
source=$1; subjects=$2; commands=$3; rows=$4; exportbytes=$5
p=$S4_PREFIX; out=$S4_EVIDENCE/$p
here=$(cd "$(dirname "$0")" && pwd)
# A running source is refused even if it happens to accept read-only connections.
[[ -z $(docker ps --filter "volume=$source" -q) ]] || { echo 'source volume is in use' >&2; exit 2; }
docker volume inspect "$source" > "$out/source-volume.json"
docker volume create "$p-pg-data" >/dev/null
docker run --rm --pull never --name "$p-copy" -v "$source:/from:ro" -v "$p-pg-data:/to" postgres:17-alpine sh -c 'du -sk /from; du -sk /from/pg_wal; cp -a /from/. /to/; du -sk /to; LC_ALL=C pg_controldata /from | sed -n "/Database cluster state/p"' > "$out/clone.txt"
grep -q 'shut down$' "$out/clone.txt" || { echo 'source was not cleanly stopped' >&2; exit 2; }
docker run -d --pull never --name "$p-pg" --memory 1g -v "$p-pg-data:/var/lib/postgresql/data" postgres:17-alpine > "$out/pg-id.txt"
ready=false
for i in {1..60}; do if docker exec "$p-pg" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=true; break; fi; sleep 1; done
$ready || exit 1
docker inspect "$p-pg" > "$out/container.json"
docker exec -i "$p-pg" psql -v ON_ERROR_STOP=1 -U postgres -d datomic -At < "$here/anatomy.sql" > "$out/sql.json"
docker stop -t 20 "$p-pg" >/dev/null
docker run --rm --pull never --name "$p-du" -v "$p-pg-data:/data:ro" postgres:17-alpine sh -c 'du -sk /data; du -sk /data/pg_wal' > "$out/stopped-du.txt"
python3 "$here/summarize.py" "$out" "$subjects" "$commands" "$rows" "$exportbytes" "$source"

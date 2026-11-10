#!/usr/bin/env bash
# [DX-S4] Why: typed columns and three explicit indexes provide a size-only relational comparison. Rejected: claiming a CSV heap supplies Triplex's history/feed semantics.
set -euo pipefail
p=$S4_PREFIX; out=$S4_EVIDENCE/$p
here=$(cd "$(dirname "$0")" && pwd)
python3 "$here/check-input.py" "$S4_INPUT" > "$out/input-check.json"
docker volume create "$p-pg-data" >/dev/null
docker run -d --pull never --name "$p-pg" --memory 2g -e POSTGRES_PASSWORD=datomic -v "$p-pg-data:/var/lib/postgresql/data" -v "$S4_INPUT:/input:ro" postgres:17-alpine postgres -c max_wal_size=128MB -c min_wal_size=32MB > "$out/pg-id.txt"
ready=false
for i in {1..60}; do if docker exec "$p-pg" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=true; break; fi; sleep 1; done
$ready || exit 1
docker inspect "$p-pg" > "$out/container.json"
docker exec -i "$p-pg" psql -v ON_ERROR_STOP=1 -U postgres <<'SQL' > "$out/load.log"
CREATE TABLE facts(recorded_position bigint,id text,entity_id text,attribute text,value_type text,value_string text,value_number double precision,value_boolean smallint,value_datetime double precision,value_json text,recorded_at double precision,valid_from double precision,valid_to double precision,created_by text,entity_type text,schema_version bigint,tx_id text);
COPY facts FROM '/input/rows.csv' WITH (FORMAT csv,NULL '\N');
CREATE INDEX facts_subject ON facts(entity_id,attribute);
CREATE INDEX facts_predicate_value ON facts(attribute,value_type,value_string,value_number,value_boolean,value_datetime,value_json);
CREATE INDEX facts_transaction ON facts(recorded_position,id);
VACUUM FULL facts;
CHECKPOINT;
SQL
docker exec "$p-pg" psql -v ON_ERROR_STOP=1 -U postgres -Atc "SELECT json_build_object('rows',count(*),'main_bytes',pg_relation_size('facts'),'index_bytes',pg_indexes_size('facts'),'total_bytes',pg_total_relation_size('facts'),'wal_bytes',(select sum(size) from pg_ls_waldir())) FROM facts;" > "$out/size.json"
# Exact source cells are compared after PostgreSQL reads them back; time fields are integral in this corpus.
docker exec "$p-pg" psql -U postgres -Atc "SELECT row_to_json(f) FROM facts f ORDER BY recorded_position,entity_id,id;" > "$out/readback.jsonl"
python3 - "$out" "$S4_INPUT" <<'PY'
import sys,pathlib,json,hashlib
p=pathlib.Path(sys.argv[1]);src=pathlib.Path(sys.argv[2]);fields=json.loads((src/'summary.json').read_text())['fields']
binding=json.loads((p/'input-check.json').read_text())
assert hashlib.sha256((src/'rows.jsonl').read_bytes()).hexdigest()==binding['input_files']['rows.jsonl']['sha256']
n=0
with (src/'rows.jsonl').open() as expected,(p/'readback.jsonl').open() as actual:
 import itertools
 for e,a in itertools.zip_longest(expected,actual):
  assert e and a
  row=json.loads(e);row[0]=int(row[0]);obs=json.loads(a)
  actual=[obs[k] for k in fields]
  same=lambda x,y: x==y and ((type(x) is type(y)) or (type(x) in (int,float) and type(y) in (int,float)))
  assert all(same(x,y) for x,y in zip(row,actual)),(row,obs)
  n+=1
assert n==binding['rows']
(p/'content-check.json').write_text(json.dumps({'classification':'DIAGNOSTIC-CONTENT-MATCH-NOT-ACCEPTANCE','rows':n,'readback_sha256':hashlib.sha256((p/'readback.jsonl').read_bytes()).hexdigest(),'source_sha256':hashlib.sha256((src/'rows.jsonl').read_bytes()).hexdigest()})+'\n')
PY
docker stop -t 20 "$p-pg" >/dev/null
docker run --rm --pull never --name "$p-du" -v "$p-pg-data:/data:ro" postgres:17-alpine sh -c 'du -sk /data; du -sk /data/pg_wal' > "$out/stopped-du.txt"
cat "$out/size.json"

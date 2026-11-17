#!/usr/bin/env bash
# [DX-T1-14] Why: size/counter observations must survive an incomplete seed without querying application data or warming it.
# Rejected: guessing database size from host sparse-file allocation, or keeping the application connection active.
set -euo pipefail
prefix=${1:?tx2-dxt1-prefix}
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
out=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}/$prefix
[[ -f $out/trace-run.json && ! -e $out/scale-storage.jsonl ]] || exit 2
lock=$HOME/Claude/Projects/triplex-db-2/locks/measure/owner.json
python3 - "$lock" "$prefix" <<'PY'
import json,os,sys
o=json.load(open(sys.argv[1]));assert o['id']=='DX-T1' and o.get('prefix')==sys.argv[2];os.kill(o['pid'],0)
PY
python3 - "$out" "$0" <<'PY'
import hashlib,json,pathlib,sys,time
p=pathlib.Path(sys.argv[1]);r=json.loads((p/'trace-run.json').read_text())
(p/'scale-observer.json').write_text(json.dumps({'run':r['tag'],'source':r['source'],'slot':r['slot'],'startedAt':time.time()*1000,'programSha256':hashlib.sha256(pathlib.Path(sys.argv[2]).read_bytes()).hexdigest(),'periodS':30,'scope':'Postgres administrative size/statistics; no application data or keep-warm requests'},indent=2)+'\n')
PY
while python3 - "$lock" "$prefix" <<'PY'
import json,os,sys
try:
 o=json.load(open(sys.argv[1]));assert o['id']=='DX-T1' and o.get('prefix')==sys.argv[2];os.kill(o['pid'],0)
except Exception:sys.exit(1)
PY
do
  docker exec "$prefix-pg" psql -X -Atq -U postgres -d datomic -c "SELECT json_build_object('type','scale-storage','at',extract(epoch from clock_timestamp())*1000,'databaseBytes',pg_database_size(current_database()),'tableBytes',pg_total_relation_size('datomic_kvs'),'walBytes',(SELECT sum(size) FROM pg_ls_waldir()),'database',(SELECT row_to_json(d) FROM pg_stat_database d WHERE datname=current_database()),'wal',(SELECT row_to_json(w) FROM pg_stat_wal w));" >> "$out/scale-storage.jsonl" 2>> "$out/scale-observer-errors.log" || break
  sleep 30
done

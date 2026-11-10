#!/usr/bin/env python3
# [DX-S4] Why: compare row datom bytes and attribute totals before/after maintenance on this clone. Rejected: treating a smaller volume as proof of preservation.
import sys,json,pathlib,hashlib
p=pathlib.Path(sys.argv[1]);events=[json.loads(s) for s in (p/'peer.jsonl').read_text().splitlines() if s.startswith('{')]
before={x['database']:x['census'] for x in events if x.get('event')=='census-before'}
after={x['database']:x['census'] for x in events if x.get('event')=='census-after'}
assert before and before.keys()==after.keys()
for name,b in before.items():
 a=after[name]
 for key in ['current-row-proof','history-row-proof','current','history','row-anatomy']:
  assert b[key]==a[key],(name,key)
assert len([x for x in events if x.get('event')=='gc-scheduled'])==len(before)
result={'classification':'DIAGNOSTIC-ROW-DATOMS-PRESERVED-NOT-ACCEPTANCE','databases':list(before),'checks':['current and history row datom byte digests','current and history per-attribute counts/string bytes','current logical row anatomy'],'peer_log_sha256':hashlib.sha256((p/'peer.jsonl').read_bytes()).hexdigest(),'source_volume':'tx2-dxh5-seed-1000-pg-data','pg_container_id':(p/'pg-id.txt').read_text().strip()}
(p/'content-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

#!/usr/bin/env python3
# [DX-S4] Why: rank only completed, content-checked measurements of the same corpus. Rejected: including partial loads or normalizing by duplicated journal values.
import pathlib,json
r=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4');s=json.loads((r/'input-all/summary.json').read_text());n=s['rows'];rows=[]
def add(name,b,kind):rows.append((name,b,kind))
for name,b in s['floors'].items():add(name,b,'archive / raw stream')
add('Packed typed cells + dictionary (raw, not a DB)',s['lengths']['packed_cells']+s['dictionary_bytes'],'reversible representation')
add('Row-string UTF-8 payload sum (unescaped)',s['lengths']['row_text_utf8'],'reversible representation')
for p in sorted(r.glob('tx2-dxs4-batch*-*')):
 if not (p/'exit.json').exists() or json.loads((p/'exit.json').read_text())['exit']!=0:continue
 if not (p/'content-check.json').exists() and not (p/'driver.jsonl').exists():continue
 if any(not (p/name).exists() or (p/name).stat().st_size for name in ['remaining-containers.txt','remaining-volumes.txt','remaining-networks.txt']):continue
 if (p/'after-vacuum.json').exists():
  d=json.loads((p/'after-vacuum.json').read_text());variant=json.loads((p/'content-check.json').read_text())['variant'];add(f'Datomic {variant} ({p.name})',d['relations'][0]['total_bytes'],'bare payload DB, WAL excluded')
 elif (p/'size.json').exists():add('PostgreSQL typed table + 3 indexes',json.loads((p/'size.json').read_text())['total_bytes'],'bare payload DB, WAL excluded')
 elif (p/'stopped-du.txt').exists():
  events=[json.loads(l) for l in (p/'driver.jsonl').read_text().splitlines() if l.startswith('{')]
  assert any(e.get('event')=='content-match' and e.get('rows')==n for e in events)
  du=[int(x.split()[0])*1024 for x in (p/'stopped-du.txt').read_text().splitlines()[:3]]
  add('XTDB local storage + logical log',du[1]+du[2],'bare payload DB, logical log included')
for f,label in [('before.json','Gateway Datomic, sealed seed'),('after-vacuum.json','Gateway Datomic, maintained')]:
 d=json.loads((r/'tx2-dxs4-anatomy4'/f).read_text());add(label,d['relations'][0]['total_bytes'],'full gateway + retained history, WAL excluded')
print('| Form — same 442,410 assertion payloads | Bytes | Bytes/assertion | ÷ 656 | Scope |')
print('| --- | ---: | ---: | ---: | --- |')
for name,b,kind in sorted(rows,key=lambda x:x[1]):print(f'| {name} | {b:,} | {b/n:.3f} | {b/n/656:.5f} | {kind} |')

#!/usr/bin/env python3
# [DX-S4] Why: recompute expected content digests from source-bound input after each attempt. Rejected: blessing the peer's own row count.
import pathlib,json,hashlib,sys,os
p=pathlib.Path(sys.argv[1]);variant=sys.argv[2];src=pathlib.Path(os.environ.get('S4_INPUT',str(p.parent/'input')))
def sha(b):return hashlib.sha256(b).hexdigest()
binding=json.loads((p/'input-check.json').read_text());
assert hashlib.sha256((src/'variants.jsonl').read_bytes()).hexdigest()==binding['input_files']['variants.jsonl']['sha256']
assert hashlib.sha256((src/'dictionary.json').read_bytes()).hexdigest()==binding['input_files']['dictionary.json']['sha256']
proofs=[]
for line in (src/'variants.jsonl').open():
 position,rr=json.loads(line)
 for entity,text,compact,packed in rr:
  v=packed if variant=='d' else compact if variant=='c-full' else text
  if variant=='c':
   r=json.loads(compact);kind=r[4];value=r[{'string':5,'ref':5,'integer':5,'boolean':7,'json':9,'number':6,'datetime':8}[kind]]
   v=json.dumps([int(r[0]),r[1],r[3],kind,value,r[10],r[11],r[12]],ensure_ascii=False,separators=(',',':'))
  proofs.append(sha((entity+'\n'+v).encode()))

journal_rows=0
if variant=='f':
 journal=pathlib.Path(os.environ['S4_JOURNAL']);jb=json.loads((p/'journal-input-check.json').read_text())
 assert hashlib.sha256((journal/'variants.jsonl').read_bytes()).hexdigest()==jb['variants_sha256']
 for line in (journal/'variants.jsonl').open():
  position,rr=json.loads(line)
  for entity,text in rr:proofs.append(sha((entity+'\n'+text).encode()));journal_rows+=1
 assert journal_rows==jb['rows']==800613
dictionary_hash=None
if variant=='d':
 dictionary=json.loads((src/'dictionary.json').read_text())
 chunks=[sha((f'dictionary/{i//1000}\n'+json.dumps(dictionary[i:i+1000],ensure_ascii=False,separators=(',',':'))).encode()) for i in range(0,len(dictionary),1000)]
 dictionary_hash=sha('\n'.join(sorted(chunks)).encode())
expected={'rows':len(proofs),'sha256':sha('\n'.join(sorted(proofs)).encode()),'dictionary-sha256':dictionary_hash}
observed=[json.loads(x) for x in (p/'peer.jsonl').read_text().splitlines() if x.startswith('{')]
assert expected['rows']==binding['rows']+journal_rows
actual=[x['proof'] for x in observed if x.get('event')=='value-proof']
assert actual==[expected],(actual,expected)
assert len([x for x in observed if x.get('event')=='gc-scheduled'])==1
record={'classification':'DIAGNOSTIC-PROJECTION-MATCH-NOT-FULL-ROW-EQUIVALENCE' if variant=='c' else 'DIAGNOSTIC-CONTENT-MATCH-NOT-ACCEPTANCE','variant':variant,'expected':expected,'observed':actual[0],'peer_log_sha256':sha((p/'peer.jsonl').read_bytes()),'input_sha256':sha((src/'variants.jsonl').read_bytes()),'journal_rows':journal_rows,'journal_input':jb if variant=='f' else None}
(p/'content-check.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record))

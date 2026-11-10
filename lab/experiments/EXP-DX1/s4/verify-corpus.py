#!/usr/bin/env python3
# [DX-S4] Why: prove native current rows plus explicitly exported retracted assertions equal the common corpus. Rejected: inventing rows to match a denominator.
import pathlib,json,hashlib,sys,gzip
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4');p=pathlib.Path(sys.argv[1]);src=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else root/'input';expected={}
for line in (src/'variants.jsonl').open():
 _,rs=json.loads(line)
 for entity,text,compact,packed in rs:
  row=json.loads(compact);expected[row[1]]=(entity,text)
total=len(expected);n=0;h=hashlib.sha256();native=p/'subject-rowtexts.jsonl'
if not native.exists():native=native.with_name(native.name+'.gz')
op=gzip.open if native.suffix=='.gz' else open
with op(native,'rb') as f:
 for line in f:
  h.update(line);entity,text=json.loads(line);rid=text[5:5+int(text[1:5],16)]
  assert expected.pop(rid)==(entity,text),rid
  n+=1
summary=json.loads((src/'summary.json').read_text());supp=summary.get('historical_supplement',{});extra={}
if supp:
 for line in pathlib.Path(supp['path']).open():
  entity,text=json.loads(line);rid=text[5:5+int(text[1:5],16)];assert rid not in extra;extra[rid]=(entity,text)
 assert len(extra)==214 and expected==extra
else:assert not expected
result={'classification':'DIAGNOSTIC-EXACT-CORPUS-MATCH-NOT-ACCEPTANCE','rows':total,'current_rows':n,'historical_supplement_rows':len(extra),'requested_rows':442410,'native_export_sha256':h.hexdigest(),'recorded_input_sha256':hashlib.sha256((src/'variants.jsonl').read_bytes()).hexdigest(),'historical_supplement':supp,'source':'sealed-volume clone native current rows plus separately exported retraction values when supplied'}
(src/'native-corpus-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

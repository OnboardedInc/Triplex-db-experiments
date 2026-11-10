#!/usr/bin/env python3
# [DX-S4] Why: deduplicate shared closure rows by assertion identity and reject conflicting bytes. Rejected: treating repeated page rows as additional facts.
import json,pathlib,hashlib,struct,gzip,lzma,collections,base64,csv,sys
src=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/recorded-pages')
out=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4/input');out.mkdir(exist_ok=True,parents=True)
def enc(x):return json.dumps(x,ensure_ascii=True,separators=(',',':'))
manifest=json.loads((src/'manifest.json').read_bytes())
rows={}; hashes={}; occurrences=0
for i in range(16):
 p=src/f'response-{i}.json'; hashes[str(p)]=hashlib.sha256(p.read_bytes()).hexdigest()
 assert hashes[str(p)]==manifest['files'][p.name]
 for entity,rev,rr in json.loads(p.read_bytes())['entities']:
  for r in rr:
   assert len(r)==17 and r[2]==entity
   if r[1] in rows: assert rows[r[1]]==r
   rows[r[1]]=r;occurrences+=1
supplement={};retired_native={}
if len(sys.argv)>1:
 extra=pathlib.Path(sys.argv[1]);supplement={'path':str(extra),'sha256':hashlib.sha256(extra.read_bytes()).hexdigest(),'rows':0,'reason':'Historical assertions retracted before the recorded current pages; native history supplement.'}
 for line in extra.open():
  entity,text=json.loads(line);start=5+int(text[1:5],16);refsize=int(text[start+32:start+36],16);r=json.loads(text[start+37+refsize:])
  assert len(r)==17 and r[2]==entity and r[1] not in rows
  rows[r[1]]=r;retired_native[r[1]]=text;supplement['rows']+=1
 assert supplement['rows']==214
rows=sorted(rows.values(),key=lambda r:(int(r[0]),r[2],r[1]))
# [DX-S4] Why: dictionary-coded typed cells retain every source column exactly. Rejected: dropping IDs/times from a compact value (not the same facts).
dictionary=sorted({x for r in rows for x in r if isinstance(x,str)})
dictid={v:i for i,v in enumerate(dictionary)}
(out/'dictionary.json').write_text(enc(dictionary))
def pack(r):
 b=bytearray()
 for x in r:
  if x is None:b+=b'\x00'
  elif isinstance(x,str):b+=b'\x01'+struct.pack('>I',dictid[x])
  elif isinstance(x,bool):b+=b'\x04'+bytes([x])
  elif isinstance(x,int):b+=b'\x02'+struct.pack('>q',x)
  else:b+=b'\x03'+struct.pack('>d',x)
 return bytes(b)
def unpack(b):
 r=[];p=0
 while p<len(b):
  t=b[p];p+=1
  if t==0:r.append(None)
  elif t==1:r.append(dictionary[struct.unpack('>I',b[p:p+4])[0]]);p+=4
  elif t in [2,3]:r.append(struct.unpack('>q' if t==2 else '>d',b[p:p+8])[0]);p+=8
  elif t==4:r.append(bool(b[p]));p+=1
 return r
def bits(n):return struct.pack('>d',n).hex()
def text(r):
 ref=r[5] if r[4]=='ref' else ''
 # Recorded position already has the fixed-width form; header duplicates ID/time/ref as the gateway does.
 return '2'+format(len(r[1]),'04x')+r[1]+bits(r[11])+('----------------' if r[12] is None else bits(r[12]))+format(len(ref),'04x')+ref+('P' if r[3]==':_tx/position' else '-')+enc(r)
fields=['recorded_position','id','entity_id','attribute','value_type','value_string','value_number','value_boolean','value_datetime','value_json','recorded_at','valid_from','valid_to','created_by','entity_type','schema_version','tx_id']
groups=collections.defaultdict(list); lengths=collections.Counter(); encoded_hash=hashlib.sha256()
with (out/'rows.jsonl').open('w') as raw,(out/'rowtexts.jsonl').open('w') as texts,(out/'rows.csv').open('w',newline='') as csvfile,(out/'variants.jsonl').open('w') as variants:
 writer=csv.writer(csvfile,lineterminator='\n')
 for r in rows:
  raw.write(enc(r)+'\n'); t=text(r)
  if r[1] in retired_native: assert retired_native[r[1]]==t
  texts.write(enc(t)+'\n');packed=pack(r);decoded=unpack(packed);assert decoded==r and all(type(x) is type(y) for x,y in zip(decoded,r))
  encoded_hash.update((t+'\n').encode())
  groups[int(r[0])].append([r[2],t,enc(r),base64.b64encode(packed).decode()])
  writer.writerow(['\\N' if x is None else (int(r[0]) if i==0 else x) for i,x in enumerate(r)])
  lengths['row_text_utf8']+=len(t.encode());lengths['compact_utf8']+=len(enc(r).encode());lengths['packed_cells']+=len(packed)
 for position,rs in sorted(groups.items()):variants.write(enc([position,rs])+'\n')
# Streaming floors avoid retaining several representations in memory.
floors={}
for name in ['rows.jsonl','rowtexts.jsonl']:
 p=out/name
 with p.open('rb') as f,gzip.GzipFile(filename='',mode='wb',fileobj=(out/(name+'.gz')).open('wb'),compresslevel=9,mtime=0) as z:
  while b:=f.read(1024*1024):z.write(b)
 with p.open('rb') as f,lzma.open(out/(name+'.xz'),'wb',preset=9) as z:
  while b:=f.read(1024*1024):z.write(b)
 for n in [name,name+'.gz',name+'.xz']:floors[n]=(out/n).stat().st_size
import datetime
def filehash(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while b:=f.read(1024*1024):h.update(b)
 return h.hexdigest()
input_files={name:{'sha256':filehash(out/name),'bytes':(out/name).stat().st_size} for name in ['rows.jsonl','rowtexts.jsonl','rows.csv','dictionary.json','variants.jsonl']}
summary={'input_files':input_files,'prepared_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'prepare_script_sha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'classification':'DIAGNOSTIC-NOT-ACCEPTANCE','rows':len(rows),'page_occurrences':occurrences,'duplicate_occurrences':occurrences-(len(rows)-supplement.get('rows',0)),'historical_supplement':supplement,'requested_rows':442410,'commands_in_rows':len(groups),'entities':len({r[2] for r in rows}),'page_bytes':sum((src/f'response-{i}.json').stat().st_size for i in range(16)),'source_hashes':hashes,'lengths':dict(lengths),'floors':floors,'dictionary_bytes':(out/'dictionary.json').stat().st_size,'rowtext_sha256':encoded_hash.hexdigest(),'fields':fields}
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k not in ['source_hashes','fields']},indent=2))

#!/usr/bin/env python3
# [DX-S4] Why: bind the f payload to actual native journal bytes and align each command with its subject rows. Rejected: hand-built journal approximations or accepting count alone.
import pathlib,json,sys,hashlib,sqlite3,collections

def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while b:=f.read(1024*1024):h.update(b)
 return h.hexdigest()
def check(p):
 s=json.loads((p/'summary.json').read_text())
 assert s['rows']==800613 and s['changes']==442624 and s['row_text_bytes']==363584827
 for name in ['variants.jsonl']:
  assert sha(p/name)==s['variants_sha256']
 assert sha(pathlib.Path(s['native_export']))==s['native_sha256']
 assert sha(pathlib.Path(s['peer_log']))==s['peer_log_sha256']
 print(json.dumps(s))
if sys.argv[1]=='check':check(pathlib.Path(sys.argv[2]));sys.exit()
src=pathlib.Path(sys.argv[2]);out=pathlib.Path(sys.argv[3]);out.mkdir()
events=[json.loads(l) for l in (src/'export.jsonl').read_text().splitlines() if l.startswith('{')];event,=[e for e in events if e.get('event')=='journal-export']
raw=src/'journal-rowtexts.jsonl';assert sha(raw)==event['sha256']
con=sqlite3.connect(out/'sorting.tmp');con.execute('CREATE TABLE rows(position INTEGER, entity TEXT, value TEXT)');n=changes=textbytes=0
with raw.open() as f:
 for line in f:
  pos,entity,text=json.loads(line);start=5+int(text[1:5],16);refsize=int(text[start+32:start+36],16);cells=json.loads(text[start+37+refsize:])
  assert len(cells)==17 and cells[2]==entity and int(cells[0])==pos
  con.execute('INSERT INTO rows VALUES(?,?,?)',(pos,entity,text));n+=1;textbytes+=len(text.encode());changes+=cells[3]==':_tx/change'
con.commit();commands=0;positions=[]
with (out/'variants.jsonl').open('w') as w:
 for pos,group in __import__('itertools').groupby(con.execute('SELECT position,entity,value FROM rows ORDER BY position,entity,value'),lambda r:r[0]):
  rr=[[entity,text] for _,entity,text in group];w.write(json.dumps([pos,rr],ensure_ascii=False,separators=(',',':'))+'\n');commands+=1;positions.append(pos)
assert [n,changes,textbytes,commands]==[800613,442624,363584827,42775]
expected=[json.loads(l)[0] for l in pathlib.Path(sys.argv[4],'variants.jsonl').open()];assert expected==positions
summary={'classification':'DIAGNOSTIC-NATIVE-JOURNAL-INPUT','rows':n,'changes':changes,'row_text_bytes':textbytes,'commands':commands,'native_export':str(raw),'native_sha256':sha(raw),'peer_log':str(src/'export.jsonl'),'peer_log_sha256':sha(src/'export.jsonl'),'variants_sha256':sha(out/'variants.jsonl'),'source_volume':'tx2-dxh5-seed-1000-pg-data','clone_container_id':(src/'pg-id.txt').read_text().strip(),'native_peer_container':json.loads((src/'journal-container.json').read_text())[0]['Id']}
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');con.close();(out/'sorting.tmp').unlink();check(out)

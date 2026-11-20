"""Extract the same published populations used by the queue analyst without copying production identities."""
import hashlib,json,pathlib,runpy,sys,uuid
thin,fixed,out=map(pathlib.Path,sys.argv[1:])
out.mkdir()
def hashfile(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
sys.argv=['cost',str(thin),str(out/'busy.json')]
replay=runpy.run_path(str(pathlib.Path(__file__).resolve().parents[1]/'group/cost.py'))
ledger='driver/ns-writes.jsonl'
pins={l[66:]:l[:64] for l in (fixed/'SHA256SUMS').read_text().splitlines()}
assert hashfile(fixed/ledger)==pins[ledger]
base=[]
for l in (fixed/ledger).open():
    w=json.loads(l)
    if w['stream']=='background' and not w['resend'] and not w['burst'] and 5<=w['facts']<=10:
        assert w['outcome']=='committed' and not w['expired']
        base.append(w['verdictMs'])
assert len(base)==3425 and len(replay['rows'])==1255
(out/'inputs.json').write_text(json.dumps({'attempt':str(uuid.uuid4()),'thin':replay['result']['inputs'],'fixed':pins[ledger],'baseMs':base,'gapMs':[r[1] for r in replay['rows']]})+'\n')

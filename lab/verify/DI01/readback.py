"""[CX-VDI01] Why: check raw retained bytes without importing the DI01 checker.
Rejected: accepting result counters without reading SQLite and worker outputs.
"""
import collections, hashlib, json, pathlib, sqlite3, subprocess, datetime, sys
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DI01')
OUT=pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=False)
def sha(b): return hashlib.sha256(b).hexdigest()
def load(p): return json.loads(p.read_text())
def dbopen(p): return sqlite3.connect(f'file:{p}?mode=ro',uri=True)
def snapshot(p):
    db=dbopen(p); db.row_factory=sqlite3.Row
    def get(t,order): return [dict(r) for r in db.execute(f'SELECT * FROM {t} WHERE consumer=? ORDER BY {order}',('c',))]
    effect=lambda t:[{k:v for k,v in r.items() if k!='consumer'} for r in get(t,'epoch,position,subject')]
    checkpoint=get('checkpoints','consumer')
    result=dict(effects=effect('effects'),affected=effect('affected'),checkpoint={k:v for k,v in checkpoint[0].items() if k!='consumer'} if checkpoint else None,dependencies={t:get(t,o) for t,o in [('di_ref','entity,attribute,value'),('di_release','consumer'),('di_boundary','subject,at,kind'),('di_basis','subject'),('di_config','consumer')]})
    db.close(); return result
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
# [CX-VDI01] Why: the review names a committed input, not mutable main bytes. Rejected: comparing historical source to the merged runtime.
manifest_count=0
for row in pathlib.Path('lab/experiments/EXP-DI01/SHA256SUMS').read_text().splitlines():
    h,p=row.split(maxsplit=1); assert sha(pathlib.Path(p).read_bytes())==h,p; manifest_count+=1
bindings={}
for stage in ['final-r4','final-r8','final-r12']:
    manifest=load(ROOT/stage/'binding.json'); bindings[stage]={r['path']:r['sha256'] for r in manifest['files']}
    for r in manifest['files']:
        b=(ROOT/stage/'preimages'/r['sha256']).read_bytes(); assert len(b)==r['bytes'] and sha(b)==r['sha256']
        if not '/dist/' in r['path']:
            historical=subprocess.run(['git','show','7ae302bc:'+r['path']],capture_output=True)
            # Earlier harness revisions are retained, while final source must equal the reviewed commit.
            if stage=='final-r12': assert historical.returncode==0 and sha(historical.stdout)==r['sha256'],r['path']
for stage in ['final-r4','final-r8']:
    for p,h in bindings['final-r12'].items():
        if p.startswith(('packages/host/','packages/core/','packages/testkit/','packages/w0/','lab/oracles/domain/','lab/world/W0/')):
            assert bindings[stage][p]==h,(stage,p)
crash=load(ROOT/'final-r4/crash/result.json'); cdir=ROOT/'final-r4/crash'
assert snapshot(cdir/'baseline.db')==crash['after']
counts=collections.Counter(); methods=collections.defaultdict(set); duplicate=0
for line in (cdir/'observations.jsonl').open():
    row=json.loads(line); arm,point,attempt=row['arm'],row['point'],row['attempt']; counts[(arm,point)]+=1
    assert row['exit']==77 and row['trace']['inputSha256']==sha((cdir/'input.json').read_bytes())
    assert row['trace']['point']==point and row['trace']['arm']==arm
    target=crash['after'] if point in ['after-checkpoint','after-commit'] else crash['before']
    if arm=='keyed-atomic': assert row['beforeReplay']==target
    if arm=='keyed-split': assert row['beforeReplay']!=target
    state=snapshot(cdir/f'{arm}-{point}-{attempt}.db'); assert state==crash['after']
    methods[arm].add(row['trace']['methodSha256'])
    if arm=='unkeyed-split':
        db=dbopen(cdir/f'{arm}-{point}-{attempt}.db'); n=db.execute('SELECT count(*) FROM unkeyed_effects').fetchone()[0]-len(crash['after']['effects']); db.close()
        assert n==row['duplicateEffects']; duplicate+=n
assert sum(counts.values())==900 and duplicate==100
assert all(counts[('keyed-atomic',p)]==100 for p in ['before-effect','after-effect','before-commit','after-commit','after-checkpoint'])
assert all(len(v)==1 for v in methods.values()) and len(set.union(*methods.values()))==3
trace_dir=ROOT/'final-r12/trace'; result=load(trace_dir/'result.json'); db=dbopen(trace_dir/'trace.db')
assert result['status']=='MATCH' and result['binding']['sha256']==sha((ROOT/'final-r12/binding.json').read_bytes())
assert db.execute('SELECT token FROM checkpoints WHERE consumer=?',('c',)).fetchone()==('438140',)
assert db.execute('SELECT count(*) FROM deliveries').fetchone()==(438140,)
assert not db.execute('SELECT * FROM effects EXCEPT SELECT * FROM affected').fetchone()
assert not db.execute('SELECT * FROM affected EXCEPT SELECT * FROM effects').fetchone()
rows=iter(db.execute('SELECT position,subject FROM affected WHERE consumer=? ORDER BY CAST(position AS INTEGER),subject',('c',))); nxt=next(rows,None)
groups=iter((trace_dir/'oracle.jsonl').open()); workers=[iter((trace_dir/f'oracle-worker-{i}.jsonl').open()) for i in range(3)]
pending={}; ordinals=[0]*3; full=diff=0; p=0
for line in (trace_dir/'checks.jsonl').open():
    c=json.loads(line); p+=1; assert c['position']==p==c['oracleRequestId']
    while p not in pending:
        g=json.loads(next(groups)); assert g['requestId'] not in pending; pending[g['requestId']]=g
    g=pending.pop(p); assert g['basis']=={'tx':p-1,'validTime':'2026-12-01T00:00:00.000000Z'}
    assert g['requests']==c['oracleRequests'] and sum(r['worlds'] for r in g['requests'])==g['worlds']==c['worlds']
    oracle=[]
    for r in g['requests']:
        w=r['worker']; ordinals[w]+=1; assert r['ordinal']==ordinals[w]
        oracle.extend(json.loads(next(workers[w]))['affected'])
    oracle.sort(); assert len(oracle)==len(set(oracle)); assert oracle==g['result']['affected']==c['observed']==c['expected']
    stored=[]
    while nxt and int(nxt[0])==p: stored.append(nxt[1]); nxt=next(rows,None)
    assert not nxt or int(nxt[0])>p
    assert stored==oracle
    full+=c['full']; diff+=c['differsFromDirect']
assert p==438140 and full==662 and diff==379108 and nxt is None and not pending and next(groups,None) is None
assert all(next(w,None) is None for w in workers)
db.close()
receipt=dict(started=start,finished=datetime.datetime.now(datetime.timezone.utc).isoformat(),head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),scriptSha256=sha(pathlib.Path(__file__).read_bytes()),content='raw worker answers == reported answers == durable rows at every position',tracePositions=p,fullWorldPositions=full,differFromDirect=diff,crashTrials=sum(counts.values()),crashCounts={str(k):v for k,v in counts.items()},unkeyedDuplicates=duplicate,originalManifestEntries=manifest_count,oracleOrdinals=ordinals,slot=None,offline=True)
(OUT/'result.json').write_text(json.dumps(receipt,indent=2)+'\n'); print(json.dumps(receipt))

"""[CX-VA01-0314-R2] Why: check every active pin form against actual round-2 changes. Rejected: relying on the earlier pin inventory."""
import hashlib,json,os,pathlib,re,subprocess
R=pathlib.Path(__file__).resolve().parents[4]
D=pathlib.Path(os.environ['V_P2Q_OUT']);D.mkdir(parents=True,exist_ok=True)
g=lambda *a:subprocess.check_output(['git',*a],cwd=R)
sha=lambda b:hashlib.sha256(b).hexdigest()
pins={};origins={}
def add(p,h,o):
    if isinstance(p,str) and isinstance(h,str) and re.fullmatch('[a-f0-9]{64}',h) and (R/p).is_file():
        pins.setdefault(p,set()).add(h);origins.setdefault(p,set()).add(o)
def walk(x,o):
    if isinstance(x,dict):
        for k in ['path','file']:add(x.get(k),x.get('sha256'),o)
        for k,v in x.items():add(k,v,o+'/'+k);walk(v,o+'/'+k)
    elif isinstance(x,list):
        for i,v in enumerate(x):walk(v,o+'/'+str(i))
for f in (R/'lab/acceptance').glob('*.json'):walk(json.loads(f.read_bytes()),str(f.relative_to(R)))
q=list(pins);seen=set()
while q:
    p=q.pop()
    if p in seen:continue
    seen.add(p)
    if 'SHA256SUMS' not in p:continue
    for l in (R/p).read_text().splitlines():
        m=re.fullmatch(r'([a-f0-9]{64})\s+\*?(.+)',l)
        if not m:continue
        h,f=m.groups()
        for c in [f,str(pathlib.Path(p).parent/f),'lab/world/W0/'+f,'lab/oracles/replay/'+f,'lab/oracles/obs/'+f]:
            if (R/c).is_file():add(c,h,p);q.append(c);break
rows=[{'path':p,'before':sha(g('show','bed67f1f:'+p)),'after':sha((R/p).read_bytes()),'expected':sorted(pins[p]),'origins':sorted(origins[p])} for p in sorted(pins)]
moved=[r for r in rows if r['before']!=r['after']]
assert not moved,moved
changed=g('diff','--name-only','bed67f1f','HEAD','--','packages').decode().splitlines()
active=[f for f in (R/'lab/acceptance').rglob('*') if f.is_file() and f.suffix in ['.py','.json','.md'] and '__pycache__' not in str(f) and f.name!='_negtest_tmp.py']
hits=[]
for p in changed:
    old=subprocess.run(['git','show','bed67f1f:'+p],cwd=R,capture_output=True)
    for side,b in [('before',old.stdout if old.returncode==0 else None),('after',(R/p).read_bytes())]:
        if b is not None:
            digest=sha(b);found=[str(f.relative_to(R)) for f in active if digest.encode() in f.read_bytes()]
            if found:hits.append({'path':p,'side':side,'sha256':digest,'hits':found})
assert not hits,hits
assert not g('diff','bed67f1f','HEAD','--','lab/acceptance')
doc=json.loads((R/'lab/acceptance/obligations.json').read_bytes())
for p,h in doc['inputs'].items():assert sha((R/p).read_bytes())==h
record={'head':g('rev-parse','HEAD').decode().strip(),'pins':len(pins),'moved':moved,'wholeHashHitsForChangedSource':hits,'changedSourcePaths':changed,'rows':rows,'inputCount':len(doc['inputs']),'contractHash':doc['transitiveContractSha256']}
(D/'pins.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({k:v for k,v in record.items() if k not in ['rows','changedSourcePaths']}))

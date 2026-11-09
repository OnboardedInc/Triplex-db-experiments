"""[CX-VA01-0314] Why: independently trace literal authority and indirect pins. Rejected: trusting builder inventories."""
import hashlib, json, pathlib, re, subprocess, uuid
R = pathlib.Path(__file__).resolve().parents[4]
OUT = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0314')/('audit-'+str(uuid.uuid4()))
OUT.mkdir(parents=True, exist_ok=False)
git = lambda *a: subprocess.check_output(['git', *a], cwd=R)
sha = lambda b: hashlib.sha256(b).hexdigest()
BASE = '3e8afaddb88cb0e552d1382c6cf720dd49b0d371'
MERGE = 'a317c52b608f98ce2c200e0a2bbd6d1694729e4c'
old = json.loads(git('show', BASE+':lab/acceptance/obligations.json'))
doc = json.loads((R/'lab/acceptance/obligations.json').read_bytes())
load = json.loads((R/'lab/acceptance/load-contract.json').read_bytes())

def rows(text):
    return {m[1]: line for line in text.splitlines() if (m := re.match(r'^\| (Q\d+[a-z]?(?:-S)?)\b', line))}

pending_bytes = git('show', BASE+':lab/acceptance/RULINGS-PENDING.md')
before = rows(pending_bytes.decode())
after = rows((R/'lab/acceptance/RULINGS-PENDING.md').read_text())
compiled = rows((R/'lab/acceptance/RULINGS.md').read_text())
new_ids = {'Q96'+s for s in 'abcd'} | {'Q97'+s for s in 'abc'}
assert after == {k:v for k,v in before.items() if k not in new_ids}
assert pending_bytes == (R/'lab/experiments/EXP-A01-acceptance-contract/evidence-0.3.14/pending-authority.md').read_bytes()
authority = {}
for rid in sorted(new_ids):
    assert compiled[rid] == before[rid], rid
    cells = before[rid].split('|')
    v = {'topic': cells[1].strip()[len(rid):].strip(), 'rule': cells[2].strip(), 'basis': cells[3].strip()}
    dest = 'laneXP2Rules' if rid.startswith('Q96') else 'laneQP4Rules'
    assert doc[dest][rid] == v == load[dest][rid]
    assert next(r for r in doc['rulings'] if r['id']==rid)['ruling'] == v['rule']
    authority[rid] = v
held = {k for k in before if k.startswith(('Q89','Q90','Q92','Q95','Q98'))} | {'Q78e','Q86g','Q94a'}
assert held <= set(after) and not held & {r['id'] for r in doc['rulings']}

pins = {}; origins = {}
def add(p, h, origin):
    if not isinstance(p,str) or not isinstance(h,str) or not re.fullmatch('[a-f0-9]{64}',h): return
    if not (R/p).is_file(): return
    pins.setdefault(p,set()).add(h); origins.setdefault(p,set()).add(origin)
def walk(x, origin):
    if isinstance(x,dict):
        for key in ['path','file']: add(x.get(key), x.get('sha256'), origin)
        for k,v in x.items(): add(k,v,origin+'/'+k); walk(v,origin+'/'+k)
    elif isinstance(x,list):
        for i,v in enumerate(x): walk(v,origin+'/'+str(i))
for f in (R/'lab/acceptance').glob('*.json'): walk(json.loads(f.read_bytes()),str(f.relative_to(R)))
direct = set(pins)
queue = list(pins); seen = set()
while queue:
    p = queue.pop()
    if p in seen: continue
    seen.add(p)
    if 'SHA256SUMS' not in p: continue
    for line in (R/p).read_text().splitlines():
        m = re.fullmatch(r'([a-f0-9]{64})\s+\*?(.+)',line)
        if not m: continue
        h,q = m.groups()
        for candidate in [q,str(pathlib.Path(p).parent/q),'lab/world/W0/'+q,'lab/oracles/replay/'+q,'lab/oracles/obs/'+q]:
            if (R/candidate).is_file(): add(candidate,h,p); queue.append(candidate); break
pin_rows = []
for p in sorted(pins):
    found = subprocess.run(['git','show',BASE+':'+p],cwd=R,capture_output=True)
    base = found.stdout if found.returncode==0 else None
    now = (R/p).read_bytes()
    pin_rows.append({'path':p,'baseSha256':sha(base) if base is not None else None,'currentSha256':sha(now),'expected':sorted(pins[p]),'changed':base!=now,'origins':sorted(origins[p])})
changed = [r for r in pin_rows if r['changed']]
(OUT/'pins.json').write_text(json.dumps({'directCount':len(direct),'expandedCount':len(pins),'changed':changed,'rows':pin_rows},indent=2)+'\n')
assert {r['path'] for r in changed if r['path'].startswith('packages/')} == {'packages/testkit/src/index.ts'}
p = 'packages/testkit/src/index.ts'; h = sha((R/p).read_bytes())
for section, key in [('oracleFilesPinned','O-TESTKIT'),('caseSourcesPinned','CS-U44')]:
    assert doc[section][key] == [{'path':p,'sha256':h}]
assert doc['caseSets']['CS-U44']['pinnedSourceFiles'] == [{'path':p,'sha256':h}]
merge_doc = json.loads(git('show',MERGE+':lab/acceptance/obligations.json'))
assert sha(git('show',MERGE+':'+p)) == h
assert merge_doc['oracleFilesPinned']['O-TESTKIT'] == [{'path':p,'sha256':h}]
assert merge_doc['caseSourcesPinned']['CS-U44'] == [{'path':p,'sha256':h}]
assert merge_doc['caseSets']['CS-U44']['pinnedSourceFiles'] == [{'path':p,'sha256':h}]
diff = git('diff',MERGE+'^1',MERGE,'--',p)
(OUT/'testkit-merge.diff').write_bytes(diff)
assert [l for l in diff.decode().splitlines() if l.startswith('+') and not l.startswith('+++')] == ['+export { exactIntegerLimitCase, valueLimitCases } from "./valueLimits.js";']
assert not git('diff',MERGE,'HEAD','--','packages')
assert doc['imagePins'] == old['imagePins']
for lane, pin in doc['imagePins'].items():
    slot = json.loads((R/'lab/config/slots.json').read_bytes())['lanes'][lane]
    assert pin == {k:slot[k] for k in ['image','imageId']}
input_mismatches = [p for p,h in doc['inputs'].items() if sha((R/p).read_bytes())!=h]
assert not input_mismatches

changed_packages = git('diff','--name-only',BASE,'HEAD','--','packages').decode().splitlines()
active = {str(f.relative_to(R)):f.read_bytes() for f in (R/'lab/acceptance').rglob('*') if f.is_file() and f.suffix in ['.py','.json','.md'] and '__pycache__' not in str(f) and f.name != '_negtest_tmp.py'}
whole_hash_hits = []
for p in changed_packages:
    found = subprocess.run(['git','show',BASE+':'+p],cwd=R,capture_output=True)
    b = found.stdout if found.returncode==0 else None
    for side, content in [('base',b),('current',(R/p).read_bytes() if (R/p).is_file() else None)]:
        if content is None: continue
        h = sha(content)
        hits = [f for f,v in active.items() if h.encode() in v]
        if hits: whole_hash_hits.append({'path':p,'side':side,'sha256':h,'hits':hits})
(OUT/'whole-hash-search.json').write_text(json.dumps(whole_hash_hits,indent=2)+'\n')
assert not [x for x in whole_hash_hits if x['path'].startswith('packages/core/')]

conflicts = ['packages/core/src/runtime/index.ts','packages/core/src/storage/StorageAdapter.ts']
for side in ['3c2e4b8','2fdf491']:
    (OUT/(side+'-conflicts.diff')).write_bytes(git('diff',side,MERGE,'--',*conflicts))
for ref in ['3c2e4b8','c14cdfc9','2fdf491','f5664a1']:
    subprocess.check_call(['git','merge-base','--is-ancestor',ref,MERGE],cwd=R)
for p in ['lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs']:
    assert git('show',BASE+':'+p) == (R/p).read_bytes()
summary = {'base':BASE,'merge':MERGE,'head':git('rev-parse','HEAD').decode().strip(),'newRulings':sorted(new_ids),'held':sorted(held),'pending':len(after),'directPins':len(direct),'expandedPins':len(pins),'changedPinPaths':[x['path'] for x in changed],'coreWholeHashHits':[],'inputHashesChecked':len(doc['inputs']),'imagesUnchanged':True,'packageBytesUnchangedSinceMerge':True,'authority':authority}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='authority'},indent=2))
print('audit evidence:', OUT)

"""EXP-O06: final regression comparison and runner byte manifest (run under heavy.mjs)."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = HERE / 'evidence'
# [EXP-O06] Why: the first isolated baseline lacked selfcheck dependencies. Rejected: hiding its failed attempt.
with (OUT/'baseline-unit-recheck.log').open('w') as f:
    cmd=['python3','-I',str(OUT/'baseline-source/lab/oracles/replay/cli.py'),'--test']
    p=subprocess.run(cmd,cwd=ROOT,stdout=f,stderr=subprocess.STDOUT)
summary={'baselineUnitExit':p.returncode,'comparisons':[]}
for lane in ['core','qlever']:
    old=json.loads((OUT/f'baseline-{lane}-gate/results.json').read_text())
    new=json.loads((OUT/f'final-{lane}-bound/results.json').read_text())
    latest=json.loads((OUT/f'updated-{lane}-bound/results.json').read_text())
    triples=lambda doc:[(r['vector'],r['item'],r['verdict']) for r in doc['items']]
    aa,bb=triples(old),triples(new)
    stable=lambda rows:[r for r in rows if r[0] not in ['G9-CUT-02','G9-CUT-02b']]
    summary['comparisons'].append({'lane':lane,'legacyItems':len(aa),'legacyUnchanged':aa==bb,
        'otherGoldenUnchanged':stable(aa)==stable(triples(latest)),
        'baselineCounts':old['itemCounts'],'updatedCounts':latest['itemCounts'],
        'replacementItems':[r for r in latest['items'] if r['vector']=='G9-CUT-02b']})
a=(OUT/'baseline-unit-recheck.log').read_text(); b=(OUT/'unit-final.log').read_text()
names=lambda text:re.findall(r'^(?:FAIL|ERROR): (.+)$',text,re.M)
summary['unitFailures']={'baseline':names(a),'final':names(b),'unchanged':names(a)==names(b)}
assert names(a)==names(b) and len(names(a))==2 and 'FAILED (failures=2)' in a
assert all(c['legacyUnchanged'] and c['otherGoldenUnchanged'] for c in summary['comparisons'])
# Hash all executable oracle and authored runner files, including tests; runtime output binds its 14 source modules.
files=sorted((ROOT/'lab/oracles/replay').rglob('*.py'))+sorted((ROOT/'lab/oracles/replay').rglob('*.mjs'))+sorted(HERE.glob('*.py'))
manifest=''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT)}\n' for p in files)
(HERE/'SHA256SUMS').write_text(manifest)
summary['runnerFiles']=len(files)
runtime = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'lab/oracles/replay').glob('*.py')}
bound = []
for path in sorted(OUT.glob('*-bound/runs/*.json')):
    doc=json.loads(path.read_text())
    assert doc['oracle']['sourceSha256'] == runtime, str(path)
    bound.append(str(path.relative_to(OUT)))
summary['sourceBoundOutputs']=len(bound)
inventory=[]
for path in sorted(OUT.rglob('*')):
    if path.is_file() and ('baseline-source' in path.parts or 'cases' in path.parts or 'runs' in path.parts):
        data=path.read_bytes()
        inventory.append({'path':str(path.relative_to(OUT)), 'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest()})
(OUT/'raw-inventory.json').write_text(json.dumps(inventory,indent=1)+'\n')
summary['retainedRawFiles']=len(inventory)
summary['status']='PASS'
(OUT/'proof.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))

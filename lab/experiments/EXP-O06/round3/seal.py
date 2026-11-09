"""EXP-O06 round 3: seal the completed attempt, including copied reproduction bytes."""
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
OUT=Path(sys.argv[1]).resolve()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
target=OUT/'seal.json'
if target.exists(): raise SystemExit('Prior seal retained; select another attempt')
audit=json.loads((OUT/'audit.json').read_text())
assert len(audit['mutationsCaught'])==6 and not audit['coverageGaps']
assert audit['status']=='PASS'
inputs=json.loads((OUT/'inputs.json').read_text())
assert all(sha(ROOT/p)==h for p,h in inputs.items())
commands=json.loads((OUT/'commands.json').read_text())
assert all(sha(OUT/(r['label']+'.log'))==r['logSha256'] for r in commands)
runtime=audit['runtimeHashes']
selfcheck=json.loads((OUT/'selfcheck.log').read_text())
assert selfcheck['oracleSourceSha256']==runtime
for value in selfcheck['sources'].values():
 assert value['sha256']==sha(ROOT/value['path'])==inputs[value['path']]
bindings=[]
for row in audit['probes']:
 case=OUT/'probes'/(row['id']+'.case.json')
 actual=OUT/'probes'/(row['id']+'.actual.json')
 copied=HERE.parent/'round2/reviewer/reproductions'/case.name
 doc=json.loads(actual.read_text())
 # [EXP-O06] Why: source/input digests and exact copied bytes bind the observed report. Rejected: trusting a verdict string.
 assert doc['caseSha256']==sha(case)==row['caseSha256']
 assert doc['oracle']['sourceSha256']==runtime
 assert copied.read_bytes()==case.read_bytes()
 bindings.append({'id':row['id'],'caseSha256':sha(case),'actualSha256':sha(actual),'reviewerCopyIdentical':True})
assert len(bindings)==22
files=sorted((ROOT/'lab/oracles/replay').rglob('*.py'))+sorted((ROOT/'lab/oracles/replay').rglob('*.mjs'))
files+=sorted(HERE.parent.glob('*.py'))+sorted(HERE.glob('*.py'))+sorted((HERE.parent/'round2').glob('*.py'))
(HERE.parent/'SHA256SUMS').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in files))
inventory=[]
for p in sorted(OUT.rglob('*')):
 if p.is_file() and p.name not in ('seal.log','seal.json','inventory.json'):
  inventory.append({'path':str(p.relative_to(OUT)),'bytes':p.stat().st_size,'sha256':sha(p)})
(OUT/'inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
target.write_text(json.dumps({'status':'PASS','scope':'sealed builder attempt; 403 tests pass; six wrong variants caught',
 'auditSha256':sha(OUT/'audit.json'),'commandReceiptSha256':sha(OUT/'commands.json'),'probeBindings':bindings,
 'runnerFiles':len(files),'runnerManifestSha256':sha(HERE.parent/'SHA256SUMS'),
 'inventorySha256':sha(OUT/'inventory.json')},indent=2)+'\n')
print('seal PASS: source and log bytes unchanged; 22 exact reviewer cases bound; runner manifest refreshed')

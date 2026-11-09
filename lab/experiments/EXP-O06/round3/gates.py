"""EXP-O06 round 3: fresh offline attempts with content/source/input binding."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
OUT=Path(sys.argv[1]).resolve()
OUT.mkdir(parents=True, exist_ok=False)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
# [EXP-O06] Why: bind actual source and inputs before execution. Rejected: reusing prior PASS receipts.
files=sorted((ROOT/'lab/oracles/replay').rglob('*.py'))+sorted((ROOT/'lab/oracles/replay').rglob('*.mjs'))
files+=sorted(HERE.parent.glob('*.py'))+sorted(HERE.glob('*.py'))
files+=sorted((HERE.parent/'fixtures').glob('*.json'))+sorted((HERE/'fixtures').glob('*.json'))
files += [HERE/'reviewer/coverage.original.py', HERE/'reviewer/summary.original.json']
files += sorted((HERE.parent/'round2/reviewer/reproductions').glob('*.case.json'))
files += sorted((HERE.parent/'round2').glob('*.py'))
files+=sorted((ROOT/'lab/acceptance/golden').glob('*'))
files += [ROOT/'lab/acceptance/obligations.json', ROOT/'lab/acceptance/RULINGS.md']
files += sorted((HERE.parent/'evidence/baseline-golden').glob('*'))
files += [HERE.parent/f'evidence/baseline-{lane}-gate/results.json' for lane in ('core','qlever')]
files += [ROOT/p for p in (
 'qualification/capacity/historical-assertion-metadata-v2/oracle.mjs',
 'qualification/capacity/historical-assertion-metadata-v1/oracle.mjs',
 'qualification/capacity/configured-entities-v1/xtdb-tiny-v4/oracle.json',
 'qualification/capacity/configured-entities-v1/CONTRACT.md',
 'qualification/workloads/temporal-workloads.json','qualification/workloads/event_oracles.py')]
before={str(p.relative_to(ROOT)):sha(p) for p in files if p.is_file()}
(OUT/'inputs.json').write_text(json.dumps(before,indent=2)+'\n')
runner_files=[p for p in files if p.suffix in ('.py','.mjs') and ('lab/oracles/replay' in str(p) or p.parent in (HERE, HERE.parent, HERE.parent/'round2'))]
(HERE.parent/'SHA256SUMS').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in runner_files))
commands=[('unit',['python3','-I','lab/oracles/replay/cli.py','--test'],{},0),
 ('selfcheck',['python3','-I','lab/oracles/replay/cli.py','--self-check'],{},0),
 ('fixtures',['python3','-I','lab/experiments/EXP-O06/fixture_runner.py'],{},0),
 ('review-probes',['python3','-I',str(HERE.parent/'round2/probes.py'),str(OUT)],{},0)]
for lane in ('core','qlever'):
 for kind in ('legacy','updated'):
  env={'O02_LANE':lane}
  if kind=='updated':env['O06_GOLD']=str(ROOT/'lab/acceptance/golden')
  commands.append((f'{lane}-{kind}',['python3','-I','lab/experiments/EXP-O06/golden_runner.py',str(OUT/f'{lane}-{kind}')],env,0))
receipts=[]
for label,cmd,env,want in commands:
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with (OUT/(label+'.log')).open('w') as f:
  p=subprocess.run(cmd,cwd=ROOT,env=dict(os.environ,**env,PYTHONDONTWRITEBYTECODE='1'),stdout=f,stderr=subprocess.STDOUT)
 receipts.append({'label':label,'command':cmd,'env':env,'expectedExit':want,'exit':p.returncode,'start':start,
  'end':datetime.datetime.now(datetime.timezone.utc).isoformat(),'logSha256':sha(OUT/(label+'.log'))})
 (OUT/'commands.json').write_text(json.dumps(receipts,indent=2)+'\n')
 print(label,p.returncode,flush=True)
mutations=[]
variants=['Q70E-unfiltered-prefixes','Q70H-compare-page-bodies','Q70I-choose-ambiguous-journal',
 'Q70I-ignore-journal-scope','Q70K-default-nonjournal-scope','Q70L-ignore-entity-scope-key']
for variant in variants:
 cmd=['python3','-I',str(HERE/'mutations.py'),variant,str(OUT/'mutations'/variant)]
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 log=OUT/(variant+'.log')
 with log.open('w') as f:
  proc=subprocess.run(cmd,cwd=ROOT,env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1'),stdout=f,stderr=subprocess.STDOUT)
 receipts.append({'label':variant,'command':cmd,'env':{},'expectedExit':0,'exit':proc.returncode,'start':start,
  'end':datetime.datetime.now(datetime.timezone.utc).isoformat(),'logSha256':sha(log)})
 (OUT/'commands.json').write_text(json.dumps(receipts,indent=2)+'\n')
 assert proc.returncode==0
 row=json.loads((OUT/'mutations'/variant/'result.json').read_text())
 letter=variant.split('-')[0]
 assert row['testsRun']==403 and row['failures'] and not row['errors'],row
 # [EXP-O06] Why: wrong scope selection also invalidates L's own-scope control. Rejected: calling that related detection unexpected.
 allowed=[letter]+(['Q70L'] if letter=='Q70K' else [])
 assert any('test_'+letter+'_' in name for name in row['failures']),row
 assert all(any('test_'+target+'_' in name for target in allowed) for name in row['failures']), row
 mutations.append(row)
 print(variant,'caught',len(row['failures']),flush=True)
(OUT/'commands.json').write_text(json.dumps(receipts,indent=2)+'\n')
assert all(r['expectedExit']==r['exit'] for r in receipts)
# [EXP-O06] Why: exit zero is only transport evidence; inspect the actual verdict and named gaps.
unit=(OUT/'unit.log').read_text()
assert 'Ran 403 tests' in unit and unit.rstrip().endswith('OK') and 'FAIL:' not in unit and 'ERROR:' not in unit
selfcheck=json.loads((OUT/'selfcheck.log').read_text()); assert selfcheck['status']=='PASS'
fixtures=json.loads((OUT/'fixtures.log').read_text()); assert fixtures['status']=='PASS'
probes=json.loads((OUT/'probes/results.json').read_text());assert not probes['specMismatches'] and probes['manifestAllMatch']
comparisons=[]
triples=lambda d:[(r['vector'],r['item'],r['verdict']) for r in d['items']]
for lane in ('core','qlever'):
 baseline_path=HERE.parent/f'evidence/baseline-{lane}-gate/results.json'
 baseline=json.loads(baseline_path.read_text())
 legacy=json.loads((OUT/f'{lane}-legacy/results.json').read_text())
 updated=json.loads((OUT/f'{lane}-updated/results.json').read_text())
 assert len(triples(legacy))==341 and triples(baseline)==triples(legacy)
 other=lambda d:[t for t in triples(d) if t[0] not in ('G9-CUT-02','G9-CUT-02b')]
 assert other(baseline)==other(updated) and len(other(updated))==331
 replacement=[t for t in triples(updated) if t[0]=='G9-CUT-02b']; assert len(replacement)==10 and all(t[2]=='AGREE' for t in replacement)
 comparisons.append({'lane':lane,'legacyItemsUnchanged':341,'otherItemsUnchanged':331,'replacementAgrees':10,
  'baselinePath':str(baseline_path.relative_to(ROOT)),'baselineSha256':sha(baseline_path), 'counts':legacy['itemCounts']})
runtime={p.name:sha(p) for p in (ROOT/'lab/oracles/replay').glob('*.py')}
bindings=[]
for path in sorted(OUT.glob('*-*/runs/*.json')):
 doc=json.loads(path.read_text());case=path.parent.parent/'cases'/path.name.replace('.expected.json','.case.json')
 assert doc['caseSha256']==sha(case) and doc['oracle']['sourceSha256']==runtime
 bindings.append({'path':str(path.relative_to(OUT)),'sha256':sha(path),'caseSha256':sha(case)})
assert len(bindings)==348
assert before=={str(p.relative_to(ROOT)):sha(p) for p in files if p.is_file()}
summary={'status':'PASS','scope':'builder regression checks; 403 tests pass; legacy future-position error explicitly mapped',
 'runtimeHashes':runtime,'mutationsCaught':mutations,'coverageGaps':[],'comparisons':comparisons,'boundGoldenOutputs':bindings,
 'probes':probes['checks'],'inputManifestSha256':sha(OUT/'inputs.json'),'runnerManifestSha256':sha(HERE.parent/'SHA256SUMS')}
(OUT/'audit.json').write_text(json.dumps(summary,indent=2)+'\n')
print('audit PASS: 403 tests, 22 probes, 348 bound golden outputs',flush=True)

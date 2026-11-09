"""CX-VO06 round 2: fresh offline probes, units, legacy and migrated golden runs."""
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'round2/evidence'
BASE=OUT/'baseline-source'
REV='4efe962e3faf79b3330973891b4533dae5f83704'

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def golden():
    dest=Path(sys.argv[2]);version,corpus=sys.argv[3:5]
    file=ROOT/'lab/experiments/EXP-O06/golden_runner.py'
    sys.argv=[str(file),str(dest)]
    spec=importlib.util.spec_from_file_location('golden',file)
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    mod.CLI=(BASE if version=='baseline' else ROOT)/'lab/oracles/replay/cli.py'
    mod.GOLD=(BASE if corpus=='legacy' else ROOT)/'lab/acceptance/golden'
    mod.main()

if len(sys.argv)>1 and sys.argv[1]=='golden':
    golden();raise SystemExit(0)
if len(sys.argv)>1 and sys.argv[1]=='probes':
    # [CX-VO06-R2] Why: rerun unchanged authored predicates with fresh output routing.
    # Rejected: using builder's copied probe outputs (not independent execution).
    file=HERE/'probes.py'
    source=file.read_text().replace("OUT = HERE/'evidence/probes'", "OUT = HERE/'round2/evidence/probes'")
    source=source.replace("subprocess.run([sys.executable,'-I',str(HERE/'audit.py')],check=True)", '')
    exec(compile(source,str(file),'exec'),{'__file__':str(file),'__name__':'__main__'})
    raise SystemExit(0)
OUT.mkdir(parents=True,exist_ok=False)
commands=[]
inputs=list((ROOT/'lab/oracles/replay').rglob('*.py'))+list((ROOT/'lab/oracles/replay/selfcheck_fixtures').glob('*'))
inputs=[p for p in inputs if p.is_file()]
inputs+=list((ROOT/'lab/experiments/EXP-O06/fixtures').glob('*.json'))
inputs+=list((ROOT/'lab/acceptance/golden').glob('*.json'))
inputs += [ROOT/'lab/acceptance/obligations.json',ROOT/'lab/acceptance/RULINGS.md',HERE/'probes.py',
           HERE/'round2_run.py',ROOT/'lab/experiments/EXP-O06/golden_runner.py',
           ROOT/'lab/experiments/EXP-O06/fixture_runner.py',ROOT/'lab/experiments/EXP-O06/SHA256SUMS']
selfcheck=['qualification/capacity/historical-assertion-metadata-v2/oracle.mjs',
 'qualification/capacity/historical-assertion-metadata-v1/oracle.mjs',
 'qualification/capacity/configured-entities-v1/xtdb-tiny-v4/oracle.json',
 'qualification/capacity/configured-entities-v1/CONTRACT.md',
 'qualification/workloads/temporal-workloads.json','qualification/workloads/event_oracles.py']
inputs += [ROOT/p for p in selfcheck]
pinned={str(p.relative_to(ROOT)):sha(p) for p in inputs}
(OUT/'inputs.json').write_text(json.dumps(pinned,indent=2)+'\n')
prefixes=['lab/oracles/replay','lab/acceptance/golden','lab/acceptance/obligations.json',
          'lab/acceptance/RULINGS.md',*selfcheck]
inventory=[]
for name in git('ls-tree','-r','--name-only',REV,'--',*prefixes).decode().splitlines():
    data=git('show',REV+':'+name);p=BASE/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
    inventory.append({'path':name,'sha256':sha(p),'bytes':len(data)})
(OUT/'baseline-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
def launch(label,cmd,env=None):
    started=stamp()
    with (OUT/(label+'.log')).open('w') as f:
        p=subprocess.run(cmd,cwd=ROOT,env=dict(os.environ,**(env or {})),stdout=f,stderr=subprocess.STDOUT)
    commands.append({'label':label,'command':cmd,'environment':env or {},'started':started,
        'finished':stamp(),'exit':p.returncode,'logSha256':sha(OUT/(label+'.log'))})
    print(label,p.returncode,flush=True)
launch('probes',[sys.executable,'-I',str(Path(__file__)),'probes'])
launch('unit-final',[sys.executable,'-I','lab/oracles/replay/cli.py','--test'])
launch('fixtures',[sys.executable,'-I','lab/experiments/EXP-O06/fixture_runner.py'])
launch('selfcheck',[sys.executable,'-I','lab/oracles/replay/cli.py','--self-check'])
for lane in ['core','qlever']:
    for version,corpus in [('baseline','legacy'),('final','legacy'),('final','updated')]:
        label=f'{lane}-{version}-{corpus}'
        launch(label,[sys.executable,'-I',str(Path(__file__)),'golden',str(OUT/label),version,corpus],{'O02_LANE':lane})
(OUT/'commands.json').write_text(json.dumps({'sourceHead':git('rev-parse','HEAD').decode().strip(),
    'reviewedBuilder':'823f454a607d045616d274b4bcb978459d66fcb2','commands':commands},indent=2)+'\n')
checks=[];bound=[]
triples=lambda d:[(r['vector'],r['item'],r['verdict']) for r in d['items']]
stable=lambda rows:[r for r in rows if r[0] not in ('G9-CUT-02','G9-CUT-02b')]
for lane in ['core','qlever']:
    docs={}
    for suffix in ['baseline-legacy','final-legacy','final-updated']:
        folder=OUT/(lane+'-'+suffix);docs[suffix]=json.loads((folder/'results.json').read_text())
        runtime={p.name:sha(p) for p in ((BASE if suffix.startswith('baseline') else ROOT)/'lab/oracles/replay').glob('*.py')}
        for p in (folder/'runs').glob('*.json'):
            d=json.loads(p.read_text());case=folder/'cases'/p.name.replace('.expected.json','.case.json')
            bound.append({'path':str(p.relative_to(OUT)),'outputSha256':sha(p),
                'caseMatches':d['caseSha256']==sha(case),'runtimeMatches':d['oracle']['sourceSha256']==runtime})
    old,new,updated=[triples(docs[s]) for s in ['baseline-legacy','final-legacy','final-updated']]
    checks.append({'lane':lane,'legacyItems':len(old),'legacyEqual':old==new,
        'otherItems':len(stable(old)),'otherEqual':stable(old)==stable(updated),
        'replacement':[r for r in docs['final-updated']['items'] if r['vector']=='G9-CUT-02b'],
        'legacyCounts':docs['baseline-legacy']['itemCounts']})
probe=json.loads((OUT/'probes/results.json').read_text())
runtime={p.name:sha(p) for p in (ROOT/'lab/oracles/replay').glob('*.py')}
probeBindings=[]
for row in probe['checks']:
    case=OUT/'probes'/(row['id']+'.case.json');actual=OUT/'probes'/(row['id']+'.actual.json')
    original=HERE/'evidence/probes'/case.name
    d=json.loads(actual.read_text())
    probeBindings.append({'id':row['id'],'sameOriginalBytes':case.read_bytes()==original.read_bytes(),
        'caseMatches':d.get('caseSha256')==sha(case),'runtimeMatches':d.get('oracle',{}).get('sourceSha256')==runtime})
unit=(OUT/'unit-final.log').read_text()
audit={'sourceInputsUnchanged':all(sha(ROOT/p)==s for p,s in pinned.items()),'comparisons':checks,
    'boundOutputs':bound,'probeBindings':probeBindings,'probeSpecMismatches':probe['specMismatches'],
    'unitFailureHeaders':re.findall(r'^FAIL: (.+)$',unit,re.M),'unitSummary':re.findall(r'^(?:Ran .+|FAILED .+)$',unit,re.M)}
(OUT/'audit.json').write_text(json.dumps(audit,indent=2)+'\n')
raw=[{'path':str(p.relative_to(OUT)),'sha256':sha(p),'bytes':p.stat().st_size} for p in OUT.rglob('*') if p.is_file()]
(OUT/'raw-inventory.json').write_text(json.dumps(raw,indent=1)+'\n')
print(json.dumps({k:v for k,v in audit.items() if k not in ('boundOutputs','probeBindings')},indent=2))

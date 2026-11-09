"""CX-VO06 audit of fresh reruns, raw bytes, and short-circuited coverage checks."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'evidence'
BASE=OUT/'baseline-source'
if (OUT/'audit.json').exists():
    raise SystemExit('Prior audit retained; select a new attempt directory')

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def triples(doc):return [(r['vector'],r['item'],r['verdict']) for r in doc['items']]
def stable(rows):return [r for r in rows if r[0] not in ('G9-CUT-02','G9-CUT-02b')]
comparisons=[]
bindings=[]
for lane in ['core','qlever']:
    docs={}
    for label in ['baseline-legacy','final-legacy','final-updated']:
        folder=OUT/(lane+'-'+label)
        docs[label]=json.loads((folder/'results.json').read_text())
        source=(BASE if label.startswith('baseline') else ROOT)/'lab/oracles/replay'
        runtime={p.name:sha(p) for p in source.glob('*.py')}
        for output in sorted((folder/'runs').glob('*.json')):
            report=json.loads(output.read_text())
            case=folder/'cases'/output.name.replace('.expected.json','.case.json')
            bindings.append({'output':str(output.relative_to(OUT)),
                'outputSha256':sha(output),'caseSha256Matches':report['caseSha256']==sha(case),
                'sourceSha256Matches':report['oracle']['sourceSha256']==runtime})
    old=triples(docs['baseline-legacy']);new=triples(docs['final-legacy']);updated=triples(docs['final-updated'])
    comparisons.append({'lane':lane,'legacyCount':len(old),'legacyTriplesEqual':old==new,
        'legacyCounts':docs['baseline-legacy']['itemCounts'],
        'otherCount':len(stable(old)),'otherTriplesEqual':stable(old)==stable(updated),
        'replacement':[r for r in docs['final-updated']['items'] if r['vector']=='G9-CUT-02b']})
failures={}
for label in ['unit-baseline','unit-final']:
    text=(OUT/(label+'.log')).read_text()
    failures[label]={'identities':re.findall(r'^(?:FAIL|ERROR): (.+)$',text,re.M),
        'counts':re.findall(r'^Ran (\d+) tests?',text,re.M),
        'summary':re.findall(r'^FAILED .+$',text,re.M),'sha256':sha(OUT/(label+'.log'))}

# [CX-VO06] Why: the two old assertions short-circuit further coverage checks.
# Rejected: treating identical failure names as proof that those tails pass.
tails={}
for version,root in [('baseline',BASE),('final',ROOT)]:
    code='''import json,sys
sys.path.insert(0,sys.argv[1])
from lab.oracles.replay.tests import test_contract_section4 as t
missing={}
missing['lanes']=[e for e in t.CONTRACT['laneIntegerRange'] if not hasattr(t.LaneRanges,'test_lane_'+e)]
missing['decimal']=[e for e in t.CONTRACT['decimalRules'] if e!='source' and not hasattr(t.DecimalRules,'test_decimal_'+e)]
missing['erasure']=[e for e in t.CONTRACT['caseSets']['CS-ERASURE']['requiredCases']+t.CONTRACT['erasure']['tests'] if not hasattr(t.Erasure,'test_'+e.replace('-','_'))]
missing['positions']=[e for k in ('positionDenseCases','positionRequiredCases') for e in t.CONTRACT[k] if not hasattr(t.Positions,'test_'+e.replace('-','_'))]
missing['cardMany']=not hasattr(t.CardManyOrder,'test_card_many_order')
missing['producedNotInErrorTable']=sorted(t.ERR.PRODUCED-set(t.ERR.ERROR_TABLE))
missing['oracleErrorsNotInContract']=sorted(set(t.ERR.ERROR_TABLE)-{r['id'] for r in t.CONTRACT['errorTable']})
print(json.dumps(missing))
'''
    p=subprocess.run([sys.executable,'-I','-c',code,str(root)],capture_output=True,text=True,cwd=ROOT)
    tails[version]={'exit':p.returncode,'result':json.loads(p.stdout) if p.returncode==0 else p.stderr}
inventory=[]
for p in OUT.rglob('*'):
    if p.is_file() and p.name not in ('raw-inventory.json','audit.json'):
        inventory.append({'path':str(p.relative_to(OUT)),'sha256':sha(p),'bytes':p.stat().st_size})
(OUT/'raw-inventory.json').write_text(json.dumps(sorted(inventory,key=lambda r:r['path']),indent=1)+'\n')
summary={'comparisons':comparisons,'unitFailures':failures,'coverageTails':tails,
    'outputsChecked':len(bindings),'allCaseHashesMatch':all(b['caseSha256Matches'] for b in bindings),
    'allSourceHashesMatch':all(b['sourceSha256Matches'] for b in bindings),'outputBindings':bindings}
(OUT/'audit.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='outputBindings'},indent=2))

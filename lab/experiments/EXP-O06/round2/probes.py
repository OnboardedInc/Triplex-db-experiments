"""CX-VO06 authored semantic probes; no product source or builder observations used."""
import copy
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))
from lab.oracles.replay import run, values

HERE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1])/'probes'
OUT.mkdir(parents=True, exist_ok=True)
if (OUT/'results.json').exists():
    raise SystemExit('Prior attempt retained; select a new directory')
BASE = json.loads((ROOT/'lab/experiments/EXP-O06/fixtures/G9-CUT-02b.json').read_text())['case']
BASE['queries'] = []
results = []

def evaluate(name, case, expected, check):
    case['caseId'] = 'CX-VO06/'+name
    data = (json.dumps(case, indent=2)+'\n').encode()
    (OUT/(name+'.case.json')).write_bytes(data)
    try:
        report = json.loads(values.dumps(run.evaluate_text(data)))
        actual = {'type':'report','verdict':report['verdict']}
        (OUT/(name+'.actual.json')).write_text(json.dumps(report,indent=2)+'\n')
        agrees = bool(check(report))
    except Exception as e:
        actual = {'type':type(e).__name__,'message':str(e)}
        (OUT/(name+'.actual.json')).write_text(json.dumps(actual,indent=2)+'\n')
        agrees = False
    results.append({'id':name,'expected':expected,'observed':actual,'matchesSpec':agrees,
                    'caseSha256':hashlib.sha256(data).hexdigest()})

def verdict(want):
    return lambda r:r['verdict']==want

def error(want):
    return lambda r: r['verdict']=='PASS' and r['queries'][0].get('error',{}).get('error')==want

def basis(t, start=None, p=None):
    q={'id':'q','kind':'match','cut':{'recordedAt':t,'validAt':500},'pattern':{'entityId':'e'}}
    if start is not None:q['readStart']=start
    if p is not None:q['cut']['position']=p
    return q

def mutate(name, change, want):
    c=copy.deepcopy(BASE)
    change(c)
    evaluate(name,c,{'verdict':want},verdict(want))

mutate('correct-clock-driven',lambda c:None,'PASS')
mutate('staging-clock-tie',lambda c:c['receipts'][1].update(instant=500),'FAIL')
mutate('decreasing-stamp',lambda c:c['receipts'][1].update(instant=499),'FAIL')
mutate('wrong-reference-increasing',lambda c:c['receipts'][1].update(instant=501),'FAIL')
mutate('staged-clock-mismatch',lambda c:c['receipts'][1].update(stagedAt=499),'FAIL')
mutate('non-microsecond-stamp',lambda c:c['receipts'][1].update(instant=500.0001),'FAIL')
mutate('engine-clock-valid',lambda c:(c['adapter'].update(clockDriven=False),c['receipts'][1].update(instant=501)),'PASS')
mutate('engine-clock-tie',lambda c:(c['adapter'].update(clockDriven=False),c['receipts'][1].update(instant=500)),'FAIL')
mutate('engine-clock-backward',lambda c:(c['adapter'].update(clockDriven=False),c['receipts'][1].update(instant=499)),'FAIL')
for valid in [True,False]:
    c=copy.deepcopy(BASE)
    c['receipts'][1]['replays']=[{'instant':500.001 if valid else 501}]
    evaluate('replay-'+str(valid).lower(),c,{'verdict':'PASS' if valid else 'FAIL'},verdict('PASS' if valid else 'FAIL'))
for valid in [True,False]:
    c=copy.deepcopy(BASE)
    for cmd in c['commands']:cmd['physicalGroup']='outer'
    if valid:c['receipts'][1]['instant']=500
    evaluate('interior-'+str(valid).lower(),c,{'verdict':'PASS' if valid else 'FAIL'},verdict('PASS' if valid else 'FAIL'))
for name,t,start,p,want in [
    ('published-watermark',500,1,None,None),
    ('pending-refusal',500.001,1,None,'E-BASIS-NOT-AVAILABLE'),
    ('pending-with-explicit-p',500.001,1,1,'E-BASIS-NOT-AVAILABLE'),
    ('idle-future-refusal',501,None,None,'E-BASIS-NOT-AVAILABLE'),
    ('large-future-refusal',2**43,None,None,'E-BASIS-NOT-AVAILABLE'),
]:
    c=copy.deepcopy(BASE);c['queries']=[basis(t,start,p)]
    evaluate(name,c,{'error':want} if want else {'count':1},error(want) if want else
             lambda r:r['verdict']=='PASS' and r['queries'][0].get('result',{}).get('count')==1)

c=copy.deepcopy(BASE)
c['queries']=[basis(500.001),{'id':'j','kind':'journalFacts','txId':'t1'}]
def staged_and_journal(r):
    q=r['queries'][0]['result']['raw'][0]
    journal=r['queries'][1]['result']['facts']
    changes=[f['value']['value'] for f in journal if f['attribute']==':_tx/change']
    return (r['verdict']=='PASS' and q['validFrom']==500 and q['recordedAt']==500.001
            and all(f['validFrom']==500 for f in journal)
            and 'recordedAt' not in changes[1] and 'retractedAt' not in changes[0]
            and changes[0]['recordedAt']==500
            and r['state'][0]['transactions'][1]['changes'][0]['retractedAt']==500.001)
evaluate('staged-valid-time-and-journal',c,{'validFrom':500,'rawOwnInstants':'absent','olderInstant':500},staged_and_journal)

# [CX-VO06] Why: two logical ordinals share one physical transaction stamp (R33 S3).
# Rejected: only testing assert+retract in one logical command (misses cross-ordinal JSON).
c=copy.deepcopy(BASE)
for cmd in c['commands']:cmd['physicalGroup']='outer'
c['receipts'][1]['instant']=500
c['queries']=[{'id':'j','kind':'journalFacts','txId':'t1'}]
def no_own_instant(r):
    changes=[f['value']['value'] for f in r['queries'][0]['result']['facts'] if f['attribute']==':_tx/change']
    return r['verdict']=='PASS' and all('recordedAt' not in v and 'retractedAt' not in v for v in changes)
evaluate('cross-ordinal-journal-own-instant',c,{'rawOwnInstants':'absent'},no_own_instant)

# [CX-VO06] Why: resolvedOutcome is the documented lost-ACK channel, independent of clock declaration.
# Rejected: only testing synthetic replays with deterministic command clocks (masks normalization).
for unknown in [False,True]:
    c=copy.deepcopy(BASE);c['adapter']['clockDriven']=False
    for cmd in c['commands']:cmd.pop('clock')
    if unknown:
        for rec in c['receipts']:rec.update(outcome='unknown',resolvedOutcome='committed')
    evaluate('resolved-receipt-'+str(unknown).lower(),c,{'verdict':'PASS'},verdict('PASS'))

manifest=[]
for row in (ROOT/'lab/experiments/EXP-O06/SHA256SUMS').read_text().splitlines():
    expected,path=row.split('  ',1)
    actual=hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
    manifest.append({'path':path,'expected':expected,'actual':actual,'matches':expected==actual})
(OUT/'builder-manifest-check.json').write_text(json.dumps(manifest,indent=2)+'\n')
summary={'attemptStarted':datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'runtimeHashes':dict(run.source_hashes()),'checks':results,
         'specMismatches':[r['id'] for r in results if not r['matchesSpec']],
         'manifestAllMatch':all(r['matches'] for r in manifest)}
(OUT/'results.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))

raise SystemExit(1 if summary['specMismatches'] or not summary['manifestAllMatch'] else 0)

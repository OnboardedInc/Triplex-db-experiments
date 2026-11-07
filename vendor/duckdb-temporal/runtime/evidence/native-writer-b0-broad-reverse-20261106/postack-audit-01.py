from pathlib import Path
from collections import Counter
import datetime,hashlib,json,math
run=Path(__file__).resolve().parent
roles={}
for role in ('cpp_candidate','original_B0'):
    raw=run/role/'result.json'
    d=json.loads(raw.read_text()); a=json.loads((run/role/'arm.json').read_text())
    assert d['status']=='passed' and a['status']=='passed'
    cells=d['stages'][0]['cells']; assert len(cells)==10
    mixed=[c for c in cells if c['mixedIngestion']]; assert len(mixed)==1
    m=mixed[0]; assert not m['errors'] and not m['writeAcknowledgementErrors']
    assert m['finalReadVerified'] and m['reopenVerified'] and not m['writeLimitReached']
    assert m['pool']['maxObservedActive']==16
    assert m['pool']['after']==dict(capacity=16,available=16,active=0,waiting=0)
    violations=[]
    for c in cells:
        xs=sorted(v['elapsedMs'] for v in c['samples'])
        for f,key in ((.5,'p50'),(.99,'p99')):
            assert math.isclose(xs[math.ceil(f*len(xs))-1],c['latencyMs'][key],rel_tol=1e-9,abs_tol=1e-6)
        assert math.isclose(len(xs)*1000/c['wallMs'],c['throughputQueriesPerSecond'],rel_tol=1e-9)
        for v in c['samples']:
            if not c['mixedIngestion'] or v['cut']=='fixed':
                assert int(v['position'])==39087
            else:
                ack=sum(w['startOffsetMs']+w['elapsedMs']<=v['startOffsetMs'] for w in c['writes'])
                issued=sum(w['startOffsetMs']<=v['startOffsetMs']+v['elapsedMs'] for w in c['writes'])
                if not (39087+ack<=int(v['position'])<=39087+issued): violations.append(v)
    assert not violations
    writes=m['writes']; assert all(int(w['position'])==39088+i and not w['reconciled'] for i,w in enumerate(writes))
    assert len({w['commandId'] for w in writes})==len(writes)
    windows=[sum(i*10000<=w['startOffsetMs']+w['elapsedMs']<(i+1)*10000 for w in writes) for i in range(math.floor(m['wallMs']/10000))]
    assert len(windows)==6 and all(windows)
    before=json.loads((run/role/'before.json').read_text());after=json.loads((run/role/'after.json').read_text())
    assert {k:v for k,v in before.items() if k!='atUtc'}=={k:v for k,v in after.items() if k!='atUtc'}
    roles[role]=dict(totalSamples=sum(len(c['samples']) for c in cells),fixedSamples=sum(len(c['samples']) for c in cells if not c['mixedIngestion']),mixedReads=len(m['samples']),acks=len(writes),ackWindows=windows,latestFrontierViolations=violations,childPid=a['terminal']['pid'],outerPid=a['terminal']['parentPid'],finalK=str(39087+len(writes)),mixedKinds=dict(Counter(v['kind'] for v in m['samples'])),mixedCuts=dict(Counter(v['cut'] for v in m['samples'])),maxObservedActive=m['pool']['maxObservedActive'],rawSha256=hashlib.sha256(raw.read_bytes()).hexdigest())
proof=dict(schema='td.native-writer-b0-reverse-postack/1',status='passed',atUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),roles=roles,totalSavedSamples=sum(v['totalSamples'] for v in roles.values()),nativeACKs=sum(v['acks'] for v in roles.values()),scope='Offline raw timestamps, quantiles, positions and saved closure receipts; full typed answers checked in flight by unchanged driver')
with (run/'postack-audit-first.json').open('x') as out:
    json.dump(proof,out,indent=2);out.write('\n')
print(json.dumps(proof))

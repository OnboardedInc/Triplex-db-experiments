"""[DX-W1] Why: price actual overlapping submissions with native completion boundaries.
Rejected: estimating saturation from scheduled offer-to-ACK p99 or attributing its whole residual to a queue.
"""
import gzip, hashlib, json, math, pathlib, statistics, sys

root, output = map(pathlib.Path, sys.argv[1:])
files = ['head.txt', 'trace-run.json', 'trace-summary.json', 'driver/ns-report.json', 'driver/ns-writes.jsonl',
         'trace/raw/gw-w.jsonl.gz', 'trace/raw/tx.jfr.jsonl.gz']
pins = {s[66:]: s[:64] for s in (root/'SHA256SUMS').read_text().splitlines()}
for name in files:
    with (root/name).open('rb') as f:
        assert hashlib.file_digest(f, 'sha256').hexdigest() == pins[name], name
run = json.loads((root/files[1]).read_bytes())
report = json.loads((root/files[3]).read_bytes())
assert run['tag'] == run['slot'] == root.name and run['source'] == (root/files[0]).read_text().strip()
assert report['seed']['complete'] and report['seed']['seededSubjects']==100000 and report['config']['zeroReaders']
ref = json.loads((root/files[2]).read_bytes())['clockAlignment']['reference']
def shift(r):
    c=r['clock']
    assert r['slot']==r['run']==run['slot'] and r['source']==run['source'] and c['bootId']==ref['bootId'] and c.get('crossProcessQualified',True)
    return ref['offsetMs']-c['offsetMs']
writers={}
with (root/files[4]).open() as f:
    for l in f:
        w=json.loads(l)
        if w['stream']=='background' and not w['resend']:
            assert w['outcome']=='committed' and not w['expired'] and w['traceId'] not in writers
            writers[w['traceId']]=w
assert len(writers)==7408
gateway={}
with gzip.open(root/files[5],'rt') as f:
    for l in f:
        r=json.loads(l); a=r.get('attributes',{})
        if r.get('type')!='request' or not a.get('datomicT'):continue
        s=shift(r); key=(a['databaseHash'],a['datomicT'])
        assert key not in gateway
        gateway[key]=(a['submittedAt']+s,r['end']+s,writers.get(r.get('traceId')))
native=[]
with gzip.open(root/files[6],'rt') as f:
    for l in f:
        r=json.loads(l)
        if r.get('nativeType')!='triplex.NativeTransaction' or (r['databaseHash'],r['datomicT']) not in gateway:continue
        s=shift(r); submit,end,w=gateway[(r['databaseHash'],r['datomicT'])]
        finish=r['start']+s; st=r['nativeStats']
        assert submit-1<=finish<=end+1 and 0<=st['apply-msec']<=st['msec']+0.5
        native.append((int(r['datomicT']),finish,submit,end,st,w,r['databaseHash']))
native.sort()
assert sum(r[5] is not None for r in native)==len(writers)
rows=[]
for old,new in zip(native,native[1:]):
    t,finish,submit,end,stats,w,db=new
    if w and w['burst'] and old[6]==db and submit<=old[1] and old[1]<finish:
        # Native t can skip values. Restrict to adjacent acknowledged gateway transactions; the
        # completion gap still includes unobserved scheduling and other writers outside the ledger.
        rows.append((w['facts'],finish-old[1],stats['apply-msec'],stats['msec'],end-finish))
def quant(values,p):return sorted(values)[math.ceil(len(values)*p)-1]
def fit(index):
    # Fit per-size medians, weighted by their counts, to resist breaks in an unsaturated burst.
    sizes=sorted(set(r[0] for r in rows))
    points=[(k,statistics.median(v),len(v)) for k in sizes if len(v:=[r[index] for r in rows if r[0]==k])>=5]
    n=sum(z for _,_,z in points);xm=sum(x*z for x,_,z in points)/n;ym=sum(y*z for _,y,z in points)/n
    slope=sum(z*(x-xm)*(y-ym) for x,y,z in points)/sum(z*(x-xm)**2 for x,_,z in points)
    return {'fixedMs':ym-slope*xm,'msPerBusinessFact':slope,'rows':n}
fit_gap=fit(1);fit_apply=fit(2);facts=statistics.mean(r[0] for r in rows)
hypotheses={}
for k in [1,4,8,16,64]:
    ms=fit_gap['fixedMs']+fit_gap['msPerBusinessFact']*facts*k
    hypotheses[k]={'commandsPerSecond':1000*k/ms,'factsPerSecond':1000*k*facts/ms}
result={'source':run['source'],'slot':run['slot'],'inputs':{f:pins[f] for f in files},'primary':len(writers),'busy':len(rows),
        'meanFacts':facts,'completionGapFit':fit_gap,'nativeApplyFit':fit_apply,'observed':{},'amortizationModel':hypotheses,
        'optimisticFactLimit':1000/fit_gap['msPerBusinessFact'],'seedFactsPerSecond':report['seed']['factsPerS']}
for i,key in enumerate(['gapMs','applyMs','nativeProcessMs','completionToGatewayEndMs'],1):
    v=[r[i] for r in rows];result['observed'][key]={'mean':statistics.mean(v),'p50':quant(v,.5),'p99':quant(v,.99)}
with output.open('x') as f:json.dump(result,f,indent=2);f.write('\n')

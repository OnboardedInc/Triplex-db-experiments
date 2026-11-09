"""[EXP-P2B-R3] Why: derive tables from bound raw attempts and correlate, rather than guess, host interference.
Rejected: selecting favorable repeats or interpreting host coincidence as causal proof.
"""
import pathlib, json, gzip, hashlib, bisect, statistics, sys
ROOT = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round3')
SPECS = [('baseline','matrix-baseline-feed-local-40.json',9),('feed','matrix-step1-feed-guarded-40.json',9),('source','matrix-step2-source-guarded-40.json',9),('pool','sweep-step3.json',24),('pool-zero','matrix-step3-pool-40.json',3),('maintenance-sync','matrix-step4-sync-40.json',9),('maintenance-async','matrix-step4-async-40.json',9),('fullsync','matrix-step5-fullsync-corrected-40.json',9)]
def sha(path):
    h=hashlib.sha256()
    with open(path,'rb') as stream:
        for data in iter(lambda:stream.read(1024*1024),b''):h.update(data)
    return h.hexdigest()
def stats(values):
    a=sorted(values)
    if not a:return dict(n=0,p50=None,p95=None,p99=None,max=None)
    def q(p):return a[max(0,__import__('math').ceil(len(a)*p)-1)]
    return dict(n=len(a),p50=q(.5),p95=q(.95),p99=q(.99),max=a[-1])
def original(directory,name):
    file=directory/name
    if file.exists():return open(file,encoding='utf8')
    index=json.loads((directory/'ARCHIVE.json').read_text())
    entry=next(x for x in index['files'] if x['file']==name)
    assert sha(directory/entry['gzip'])==entry['gzipSha256']
    return gzip.open(directory/entry['gzip'],'rt',encoding='utf8')
def inspect(row,profile):
    directory=pathlib.Path(row['out']);report=json.loads((directory/'report.json').read_text())
    assert directory.parent==ROOT and directory.name==report['attempt']==row['attempt']
    expected=dict(line.split('  ',1)[::-1] for line in (directory/'SHA256SUMS').read_text().splitlines())
    assert sha(directory/'report.json')==expected['report.json']
    phases=dict(baseline='baseline-feed-local-40',feed='step1-feed-guarded-40',source='step2-source-guarded-40',pool='step3-pool-40',**{'pool-zero':'step3-pool-40','maintenance-sync':'step4-sync-40','maintenance-async':'step4-async-40','fullsync':'step5-fullsync-corrected-40'})
    assert report['phase']==phases[profile]
    assert row['exit']==0 and report['sourceUnchanged'] and not report['failures']
    assert report['offered']==report['committed']==3000 and report['rate']==40
    assert report['readers']==row['readers'] and report['readerResult']['reads']==report['readerResult']['checks']
    assert not report.get('maintenance',{}).get('errors',[])
    if profile not in ['baseline','feed']:assert report['mainReadRpcs']==0
    assert sha(directory/'trace.json')==expected['trace.json']==report['traceHash']
    assert [b['facts'] for b in report['perBandSummary']]==[10,20,40]
    assert all(b['stages']['offerToAck']['n']==1000 for b in report['perBandSummary'])
    if 'workers' in row:assert report['workerCount']==row['workers']
    commits={};frames=[];applies=[];digest=hashlib.sha256()
    with original(directory,'raw.jsonl') as stream:
        for line in stream:
            digest.update(line.encode())
            item=json.loads(line)
            if item['type']=='commit':commits[item['event']['seq']]=item
            elif item['type']=='frames':frames=item['frameEvents'];applies=item['applyEvents']
    assert digest.hexdigest()==expected['raw.jsonl'] and len(commits)==3000
    assert len(frames)==report['brokerStats']['frames']
    start=min(int(c['scheduledNs']) for c in commits.values());end=max(int(c['ackNs']) for c in commits.values())
    host=[json.loads(line) for line in (directory/'host.jsonl').read_text().splitlines()]
    host_rows=[r for r in host if r['type']=='host' and start<=int(r['ns'])<=end]
    assert host_rows
    io=[];first=True
    for item in host:
        if item['type']!='iostat':continue
        for line in item['text'].splitlines():
            try:values=list(map(float,line.split()))
            except ValueError:continue
            if not values or len(values)%3:continue
            if first:first=False;continue
            io.append((int(item['ns']),sum(values[2::3])))
    processes=[r for r in host if r['type']=='processes'];probe_errors=[r for r in host if r['type']=='probe-error']
    hosts=[int(r['ns']) for r in host if r['type']=='host'];host_all=[r for r in host if r['type']=='host']
    def nearby(ns):
        index=bisect.bisect_left(hosts,ns)
        choices=host_all[max(0,index-1):index+2]
        return min(choices,key=lambda r:abs(int(r['ns'])-ns)) if choices else None
    def disk(ns):return min(io,key=lambda r:abs(r[0]-ns))[1] if io else None
    tails=[]
    for band in [0,1,2]:
        for duration in sorted((d for d in report['durations'] if d['band']==band),key=lambda d:d['offerToAck'],reverse=True)[:10]:
            sample=commits[duration['seq']];ns=int(sample['ackNs']);h=nearby(ns)
            proc=min(processes,key=lambda r:abs(int(r['ns'])-ns)) if processes else None
            tails.append(dict(seq=duration['seq'],band=band,facts=[10,20,40][band],position=sample['receipt']['position'],offerToAckMs=duration['offerToAck'],commitFullEnvelopeMs=duration['commitFullFsyncEnvelope'],nonCommitMs=duration['offerToAck']-duration['commitFullFsyncEnvelope'],schedulingMs=duration['scheduling'],queueMs=duration['queue'],durableToHostMs=duration['durableToHost'],nearHostBusy=h['busy'] if h else None,nearLoad1=h['load'][0] if h else None,nearDiskMBps=disk(ns),hostSampleDeltaMs=abs(ns-int(h['ns']))/1e6 if h else None,processes=proc['rows'] if proc else []))
    envelope=[(int(f['stageTiming']['log']['durableNs'])-int(f['stageTiming']['log']['bodyEndNs']))/1e6 for f in frames]
    replica_lag=[];apply_span=[]
    for frame in frames:
        apply=next(a for a in applies if a['fromLsn']<=frame['lsn']<=a['toLsn'])
        lag=(int(apply['completedNs'])-int(frame['sourceDurableAtNs']))/1e6
        assert lag>=0
        replica_lag.append(lag);apply_span.append((int(apply['completedNs'])-int(apply['startedNs']))/1e6)
    rr=report['readerResult'];parts=rr.get('workers',[rr]);source_costs=[r.get('sourceCosts') for r in parts if r.get('sourceCosts')]
    proof=report['brokerStats'].get('fullFsyncProof')
    if profile=='fullsync':
        assert proof and proof['primitive']=='F_FULLFSYNC'
        archive=json.loads((directory/'ARCHIVE.json').read_text())
        db=next(e for e in archive['files'] if e['file']=='broker/broker.db')
        assert proof['dev']==db['sourceDevice'] and proof['ino']==db['sourceInode']
    return dict(profile=profile,attempt=report['attempt'],out=str(directory),repeat=row['repeat'],readers=report['readers'],workers=report.get('workerCount',1),traceHash=report['traceHash'],committed=3000,reads=rr['reads'],readGoodput=rr['reads']/rr['wallMs']*1000,readLatencyMs=rr['latencyMs'],bands=report['perBandSummary'],commitFrameEnvelopeMs=stats(envelope),replicaVisibilityLagMs=stats(replica_lag),replicaApplyRequestMs=stats(apply_span),routes=rr['routes'],feedLagMs=report['feedLagMs'],stageCpu=report['stageCpu'],cpu=report['cpu'],readerCosts=rr['costs'],readerThreadCpu=rr['threadCpu'],sourceSnapshotCpuUs=sum(x['cpuUs'] for x in source_costs),sourceMaxSnapshotMs=max((x['maxMs'] for x in source_costs),default=0),sourceWalPeakBytes=max((x['walBytes'] for x in source_costs),default=0),mainReadRpcs=report.get('mainReadRpcs'),mainReadRpcCounts=report.get('mainReadRpcCounts'),maintenance=report.get('maintenance'),fullFsyncProof=proof,runtime=report['runtime'],host=dict(busy=stats([x['busy'] for x in host_rows]),load1=stats([x['load'][0] for x in host_rows]),diskMBps=stats([v for ns,v in io if start<=ns<=end]),probeErrors=probe_errors),tails=tails)
def main():
    partial='--partial' in sys.argv;results=[];missing=[]
    for profile,file,count in SPECS:
        path=ROOT/file
        if not path.exists():missing.append(file);continue
        rows=json.loads(path.read_text())
        if len(rows)!=count:
            if not partial:raise RuntimeError(f'{file}: {len(rows)}/{count}')
            missing.append(f'{file}: {len(rows)}/{count}')
        for row in rows:results.append(inspect(row,profile))
    if not partial:assert not missing and len(results)==81 and len({r['traceHash'] for r in results})==1
    out=ROOT/('analysis-partial.json' if partial else 'analysis.json')
    out.write_text(json.dumps(dict(diagnosticOnly=True,partial=partial,missing=missing,results=results,inputs={name:sha(ROOT/name) for name in [*[file for _,file,_ in SPECS if (ROOT/file).exists()],'selected-workers.json']}),indent=2)+'\n')
    print(json.dumps(dict(file=str(out),attempts=len(results),missing=missing)))
if __name__=='__main__':main()

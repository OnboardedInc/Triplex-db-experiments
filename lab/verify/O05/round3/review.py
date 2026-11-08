"""Independent generalized transition, obligation and timing review for O-OBS R3.

Uses the review's encoder, never builder fixtures or expected answers. The pure
selector matrix supplements full authenticated CLI coverage, not vice versa.
"""
import copy
from fractions import Fraction
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
sys.path.insert(0,str(HERE.parent/'round2'))
import review_round2 as old
ORACLE=ROOT/'lab/acceptance/oracle/observe.py'
CONTRACT=ROOT/'lab/acceptance/obligations.json'

def raw(x):return old.raw(x)
def sha(x):return hashlib.sha256(x).hexdigest()


def transition_facts():
    payload=dict(operationId='command-a',position=7,contents=dict(status='approved'))
    effect=dict(entity='subject-a',attribute='status',value='approved')
    absence=dict(entity='subject-a',attribute='status',value='pending')
    commit=dict(payload,type='COMMIT',effects=[effect],absences=[absence])
    return {
        'QT0-RECEIVED':dict(requestPresent=True,request=copy.deepcopy(payload)),
        'QT1-VALIDATED':dict(accepted=True,request=copy.deepcopy(payload),validation=copy.deepcopy(payload)),
        'QT2-LOGGED':dict(recordType='COMMIT',decision='commit',durable=True,commitRecord=copy.deepcopy(commit)),
        'QT3-APPLY-SENT':dict(updateSent=True,updateRequest=copy.deepcopy(payload)),
        'QT4s-SOURCE-PUBLISHED':dict(decisionDurable=True,sourceReadable=True,commitRecord=copy.deepcopy(commit),
            sourceReadback=dict(payload,effects=[effect],absences=[absence])),
        'QT4r-REPLICA-APPLIED':dict(markerVisible=True,marker=copy.deepcopy(payload)),
        'QT5-VERIFIED':dict(accessPaths={p:dict(effects=[effect],absences=[absence]) for p in ['eav','ave','vea']}),
        'QT6-ACKED':dict(callerOutcome='success',receipt=copy.deepcopy(payload)),
        'XT0-RECEIVED':dict(requestPresent=True,request=copy.deepcopy(payload)),
        'XT1-BEGIN-SENT':dict(beginSent=True,beginRequest=copy.deepcopy(payload)),
        'XT2-ENGINE-COMMITTED':dict(committed=True,operationMarkerPresent=True,
            transaction=copy.deepcopy(payload),marker=copy.deepcopy(payload)),
        'XT3-ACKED':dict(callerOutcome='success',receipt=copy.deepcopy(payload)),
    }


def fault(transition,facts,t=30):
    record=dict(transition=transition,t=t,operationId='command-a',position=7,facts=copy.deepcopy(facts))
    obj=dict(record=record,sha256=sha(raw(record)),tReadBack=120,readbackOperationId='command-a',readbackPosition=7)
    row=dict(transition=transition,t=t,durableEvidenceObject=obj)
    return dict(row,transitions=[copy.deepcopy(row)],tCrash=100,
        variant='engine-source' if transition.startswith('XT') else 'log-source')


def sync_fault(e):
    for row in e['transitions']:
        obj=row['durableEvidenceObject']
        if obj is not None:
            obj['record']['t']=row['t'];obj['sha256']=sha(raw(obj['record']))
    e.update(copy.deepcopy(e['transitions'][-1]))


def timing_bases(base):
    b=copy.deepcopy(base)
    e=b['CANCEL']
    e.update(tCancelRequested=10,tCallerSettled=40,tDrained=2000,tReuseOk=2100,
        transportAck=dict(kind='cancel-ack',t=20),
        engineActiveSamples=[dict(t=t,activeQueryIds=[]) for t in range(0,8001,500)])
    e['reuseResult']['t']=2100
    b['PREABORT'].update(engineStatementLog=[dict(t=50,tag='other')],
        coverage={'from':10,'to':90,'maxGapMs':0,'segments':[{'from':0,'to':100}]})
    e=b['CONNECTIONS'];e['tClose']=20
    e['engineConnectionSamples']=[dict(t=t,label=label,count=count) for label,initial in [('reads',3),('writes',2)]
        for t,count in [(0,initial),(4000,e['baseline'][label]),(6000,e['baseline'][label])]]
    b['AVAILABILITY'].update(tFailure=20,events=[],probes=[dict(t=200,kind=k,outcome='success') for k in ['read','write']])
    b['MAINTENANCE'].update(tStart=10,tEnd=990,events=[dict(kind='start',t=10),dict(kind='end',t=990)],
        lagSamples=[dict(t=t,lagMs=200) for t in [0,500,1000]])
    e=b['ERASURE-SCAN']
    for scan in e['scans']:
        scan.update(tScan=30);scan['positiveControl'].update(tWritten=0,tFound=10)
    e.update({k:copy.deepcopy(e['scans'][0][k]) for k in e['scans'][0]})
    e=b['WATERMARK'];e.update(tReadStart=100,tRouteStart=106,tRouteEnd=120,tReadEnd=130,waitMs=6)
    e['waitEvents']['start']['t']=100;e['waitEvents']['end']['t']=106
    b['ACK-ORDER'].update(tSourcePublished=80,tAck=90,ryowPullRoute=copy.deepcopy(e))
    b['FAULT-TRANSITIONS']=fault('QT2-LOGGED',transition_facts()['QT2-LOGGED'])
    return b


def main():
    out=HERE/'general-evidence'
    if out.exists():raise SystemExit('Retain previous attempt')
    out.mkdir(parents=True)
    free=shutil.disk_usage(HERE).free
    if free<5*1024**3:raise SystemExit('Below disk admission floor')
    start=time.time()
    source_paths=[ORACLE,CONTRACT,HERE/'review.py',HERE.parent/'round2/normalize.py',HERE.parent/'round2/review_round2.py']
    before={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in source_paths}
    c=json.loads(CONTRACT.read_bytes());base,inventory,oldexpect=old.positives(c)
    facts=transition_facts();results=[]

    def run(protocol,label,e=None,expected='REJECT',reason=None,u=0,expectations=None,ctx=None):
        p=out/str(len(results)).zfill(4)
        e=copy.deepcopy(base[protocol] if e is None else e)
        encoded,context=old.encode(p,protocol,e,c,inventory,expectations or oldexpect)
        envelope=json.loads((p/'bundle/bundle.json').read_bytes());envelope['clock']['maxUncertaintyMs']=u
        (p/'bundle/bundle.json').write_bytes(raw(envelope))
        context.update(clockMaxUncertaintyMs=u,bundleSha256=sha(raw(envelope)))
        if ctx:ctx(context,encoded)
        (p/'evidence.json').write_bytes(raw(encoded));(p/'context.json').write_bytes(raw(context))
        cmd=[sys.executable,'-I','-B',str(ORACLE),'check','OBS-'+protocol,str(p/'evidence.json'),
            '--contract',str(CONTRACT),'--context',str(p/'context.json'),'--bundle',str(p/'bundle'),'--key-file',str(p/'run.key')]
        proc=subprocess.run(cmd,capture_output=True,text=True,timeout=45)
        (p/'stdout.txt').write_text(proc.stdout);(p/'stderr.txt').write_text(proc.stderr)
        try:report=json.loads(proc.stdout)
        except ValueError:report={'verdict':'CRASH','reasons':[proc.stderr]}
        ok=(proc.returncode==0 and report['verdict']=='PASS') if expected=='PASS' else (proc.returncode in (1,2) and report['verdict'] in ['FAIL','REFUSED'])
        intended=reason is None or any(reason in text for text in report.get('reasons',[]))
        result=dict(id=protocol+'/'+label,path=str(p.relative_to(HERE)),expected=expected,expectedReason=reason,
            code=proc.returncode,result=report,ok=ok,intendedGuard=intended,command=cmd)
        (p/'result.json').write_text(json.dumps(result,sort_keys=True)+'\n');results.append(result)

    for transition,payload in facts.items():
        e=fault(transition,payload)
        expectations={transition:dict(operationId='command-a',position=7,facts=copy.deepcopy(payload))}
        run('FAULT-TRANSITIONS',transition+'-positive',e,expected='PASS',expectations=expectations)
        for field in [k for k,v in payload.items() if isinstance(v,dict)]:
            bad=copy.deepcopy(e);value=bad['transitions'][0]['durableEvidenceObject']['record']['facts'][field]
            if field=='accessPaths':value['ave']['effects']=[]
            elif field=='commitRecord':value['effects'][0]['value']='wrong'
            elif field=='sourceReadback':value['absences']=[]
            else:value['contents']['status']='wrong'
            sync_fault(bad)
            run('FAULT-TRANSITIONS',transition+'-mismatch-'+field,bad,reason='case expectations',expectations=expectations)
        missing=copy.deepcopy(expectations);missing[transition].pop('facts')
        run('FAULT-TRANSITIONS',transition+'-missing-expected-facts',e,expectations=missing,reason='facts')

    known={'G8.reuse.positive-witness':('reuse','T-REUSE-AVOIDED'),
           'G8.support.incremental-witness':('incremental','T-INCR-WORK')}
    for obligation in c['obligations']:
        for kind,bar in [('reuse','T-REUSE-AVOIDED'),('incremental','T-INCR-WORK')]:
            e=copy.deepcopy(base['WORK']);e['threshold']=bar
            if kind=='incremental':e['engineWorkUnits'].update(rowsScanned=1,triplesTouched=0)
            def context(ctx,e,obligation=obligation,kind=kind,bar=bar):
                ctx.update(obligation=obligation['id'],witnessKind=kind,selectedThreshold=bar,
                    thresholdIds=sorted(set(obligation['thresholds']+[bar])))
            run('WORK',obligation['id']+'-'+kind,e,expected='PASS' if known.get(obligation['id'])==(kind,bar) else 'REJECT',ctx=context)
    for bar in c['thresholds']:
        e=copy.deepcopy(base['MAINTENANCE']);e['threshold']=bar
        run('MAINTENANCE','selector-'+bar,e,expected='PASS' if bar=='NS-P3-LAG-P99-MS' else 'REJECT',
            ctx=lambda ctx,e,bar=bar:ctx.update(selectedThreshold=bar,thresholdIds=sorted(set(ctx['thresholdIds']+[bar]))))
    for oid,(_,bar) in known.items():
        e=copy.deepcopy(base['WORK']);e['threshold']=bar
        if bar=='T-INCR-WORK':e['engineWorkUnits'].update(rowsScanned=1,triplesTouched=0)
        run('WORK',oid+'-threshold-union',e,ctx=lambda ctx,e,oid=oid,bar=bar:ctx.update(obligation=oid,
            selectedThreshold=bar,witnessKind=known[oid][0],thresholdIds=['T-INCR-WORK','T-REUSE-AVOIDED']))

    b=timing_bases(base)
    fault_expect={'QT2-LOGGED':dict(operationId='command-a',position=7,facts=copy.deepcopy(facts['QT2-LOGGED']))}
    protocols=['CANCEL','PREABORT','CONNECTIONS','AVAILABILITY','MAINTENANCE','ERASURE-SCAN','WATERMARK','ACK-ORDER','FAULT-TRANSITIONS']
    for protocol in protocols:run(protocol,'uncertain-positive',b[protocol],expected='PASS',u=1,expectations=fault_expect if protocol=='FAULT-TRANSITIONS' else None)

    def timed(protocol,label,edit,reason,expected='REJECT'):
        e=copy.deepcopy(b[protocol]);edit(e)
        if protocol=='FAULT-TRANSITIONS':sync_fault(e)
        run(protocol,label,e,expected=expected,reason=reason,u=1,
            expectations=fault_expect if protocol=='FAULT-TRANSITIONS' else None)

    timed('CANCEL','uncertain-start-settle',lambda e:e.update(tCallerSettled=11),'caller/reuse')
    timed('CANCEL','uncertain-settle-reuse',lambda e:e.update(tCallerSettled=2099),'caller/reuse')
    timed('CANCEL','uncertain-drain',lambda e:e.update(tDrained=2010),'drain deadline')
    timed('CANCEL','uncertain-ack-start',lambda e:e['transportAck'].update(t=11),'acknowledgement')
    timed('CANCEL','uncertain-ack-drain',lambda e:e['transportAck'].update(t=1999),'acknowledgement')
    timed('CANCEL','uncertain-drain-reuse',lambda e:(e.update(tReuseOk=2001),e['reuseResult'].update(t=2001)),'same-connection')
    timed('CANCEL','uncertain-first-sample',lambda e:e['engineActiveSamples'][0].update(t=9),'cover uncertain')
    timed('CANCEL','uncertain-last-sample',lambda e:e.update(engineActiveSamples=[dict(t=t,activeQueryIds=[]) for t in list(range(0,7000,500))+[7001]]),'cover uncertain')
    timed('CANCEL','uncertain-sample-gap',lambda e:e['engineActiveSamples'].pop(1),'coverage gap')
    timed('CANCEL','uncertain-sample-order',lambda e:e['engineActiveSamples'][1].update(t=1),'sample time order')
    timed('CANCEL','possible-active-after-drain',lambda e:e['engineActiveSamples'].append(dict(t=1999,activeQueryIds=['query-a'])),'sample times')
    def active_before(e):
        e['engineActiveSamples'].append(dict(t=1999,activeQueryIds=['query-a']))
        e['engineActiveSamples'].sort(key=lambda s:s['t'])
        e['engineActiveSamples']=[s for s in e['engineActiveSamples'] if s['t']!=2000]
    timed('CANCEL','possible-active-at-drain-sorted',active_before,'query still active')
    def timeout(e):e.update(expectedError='E-TIMEOUT',callerError='E-TIMEOUT',tDeadline=20,tCallerSettled=120)
    e=copy.deepcopy(b['CANCEL']);timeout(e)
    def timeout_context(ctx,e):
        ctx.update(obligation='G6.deadline.enforced',thresholdIds=['T-DRAIN-MS','T-DEADLINE-GRACE-MS'])
        ctx['bindings']['tDeadline']=20
    run('CANCEL','uncertain-timeout-grace',e,u=1,reason='timeout grace',ctx=timeout_context)
    e['tCallerSettled']=118
    run('CANCEL','uncertain-timeout-positive',e,u=1,expected='PASS',ctx=timeout_context)
    e['tDeadline']=11;e['tCallerSettled']=40
    run('CANCEL','uncertain-start-deadline',e,u=1,reason='timeout grace',
        ctx=lambda ctx,e:(timeout_context(ctx,e),ctx['bindings'].update(tDeadline=11)))

    timed('PREABORT','uncertain-window-order',lambda e:e['coverage'].update(to=11),'empty coverage')
    timed('PREABORT','uncertain-first-segment',lambda e:e['coverage']['segments'][0].update(**{'from':9}),'coverage hole')
    timed('PREABORT','uncertain-final-segment',lambda e:e['coverage']['segments'][0].update(to=91),'coverage incomplete')
    timed('PREABORT','uncertain-segment-overlap',lambda e:e['coverage'].update(segments=[{'from':0,'to':55},{'from':54,'to':100}]),'coverage hole')
    timed('PREABORT','proven-segment-overlap',lambda e:e['coverage'].update(segments=[{'from':0,'to':55},{'from':53,'to':100}]),None,expected='PASS')
    timed('PREABORT','uncertain-statement-start',lambda e:e['engineStatementLog'][0].update(t=11),'statement outside')
    timed('PREABORT','uncertain-statement-end',lambda e:e['engineStatementLog'][0].update(t=89),'statement outside')

    def connection_time(e,t):
        for sample in e['engineConnectionSamples']:
            if sample['t']==4000:sample['t']=t
    timed('CONNECTIONS','uncertain-release-after-close',lambda e:connection_time(e,21),'baseline')
    timed('CONNECTIONS','uncertain-release-deadline',lambda e:connection_time(e,5020),'baseline')
    def leak(e):
        e['engineConnectionSamples'].append(dict(t=5020,label='reads',count=2))
        e['engineConnectionSamples'].sort(key=lambda s:s['t'])
    timed('CONNECTIONS','possible-post-deadline-leak',leak,'leaked after')
    def probe_time(e,t):
        for probe in e['probes']:probe['t']=t
    timed('AVAILABILITY','uncertain-probe-start',lambda e:probe_time(e,21),'availability')
    timed('AVAILABILITY','uncertain-probe-deadline',lambda e:probe_time(e,60020),'availability')
    timed('AVAILABILITY','possible-manual-restart',lambda e:e.update(events=[dict(kind='manual-restart',t=19)]),'manual restart')
    timed('AVAILABILITY','proven-prior-restart',lambda e:e.update(events=[dict(kind='manual-restart',t=17)]),None,expected='PASS')

    timed('MAINTENANCE','uncertain-interval',lambda e:(e.update(tEnd=12),e['events'][1].update(t=12)),'empty maintenance')
    timed('MAINTENANCE','uncertain-lag',lambda e:e['lagSamples'][1].update(lagMs=250),'threshold exceeded')
    timed('MAINTENANCE','uncertain-sample-last',lambda e:e['lagSamples'][-1].update(t=991),'cover uncertain')
    timed('MAINTENANCE','uncertain-sample-gap',lambda e:e['lagSamples'].pop(1),'coverage gap')
    timed('MAINTENANCE','possibly-overlapping-lag-before',lambda e:e['lagSamples'].insert(1,dict(t=9,lagMs=300)),'threshold exceeded')
    timed('MAINTENANCE','possibly-overlapping-lag-after',lambda e:e['lagSamples'].insert(2,dict(t=991,lagMs=300)),'threshold exceeded')
    timed('ERASURE-SCAN','uncertain-canary-order',lambda e:e['scans'][-1]['positiveControl'].update(tFound=1),'scanner blind')
    timed('ERASURE-SCAN','uncertain-canary-before-publication',lambda e:e['scans'][-1]['positiveControl'].update(tFound=19),'scanner blind')
    timed('ERASURE-SCAN','uncertain-post-publication-scan',lambda e:e['scans'][-1].update(tScan=22),'follow erasure')
    def key_order(e):
        e['scans'][-1]['keyDestroyedEvidence']=dict(subjectKey='subject-key',destroyedKey='subject-key',tDestroyed=29,
            survivingCopies=[dict(id='cipher-copy',encryptionKeys=['subject-key'])])
    timed('ERASURE-SCAN','uncertain-key-destruction',key_order,'destruction after scan')
    def wait(e,t):e.update(tRouteStart=t,waitMs=t-100);e['waitEvents']['end']['t']=t
    timed('WATERMARK','uncertain-wait-upper',lambda e:wait(e,109),'watermark wait exceeded')
    timed('WATERMARK','uncertain-wait-order',lambda e:wait(e,101),'watermark wait exceeded')
    timed('WATERMARK','uncertain-route-order',lambda e:e.update(tRouteEnd=107),'route latency')
    timed('WATERMARK','uncertain-read-containment',lambda e:e.update(tReadEnd=121),'route latency')
    timed('ACK-ORDER','uncertain-publication-ack',lambda e:e.update(tSourcePublished=89),'ACK preceded')
    timed('ACK-ORDER','uncertain-ack-pull',lambda e:e.update(tAck=99),'pull not at returned')
    timed('FAULT-TRANSITIONS','uncertain-transition-crash',lambda e:e['transitions'][0].update(t=99),'transition time order')
    timed('FAULT-TRANSITIONS','uncertain-crash-readback',lambda e:e['transitions'][0]['durableEvidenceObject'].update(tReadBack=102),'after crash')
    e=copy.deepcopy(b['FAULT-TRANSITIONS']);e['transitions'].append(copy.deepcopy(e['transitions'][0]));e['transitions'][1]['t']=31;sync_fault(e)
    run('FAULT-TRANSITIONS','uncertain-inter-transition-order',e,u=1,reason='transition time order',expectations=fault_expect)

    # [CX-VO05-R3] Why: enumerate the whole authority registry with independent expected IDs. Rejected: testing only two handpicked bad contexts.
    spec=importlib.util.spec_from_file_location('reviewed_observe',ORACLE)
    subject=importlib.util.module_from_spec(spec);spec.loader.exec_module(subject)
    selector=[]
    for obligation in c['obligations']:
        for bar in c['thresholds']:
            for kind in ['reuse','incremental']:
                context=dict(selectedThreshold=bar,witnessKind=kind,thresholdIds=sorted(set(obligation['thresholds']+[bar])))
                expected=known.get(obligation['id'])==(kind,bar)
                try:value=subject.work_selection(obligation,context);actual=value==bar;error=None
                except (subject.Refused,subject.Failed) as exc:actual=False;error=str(exc)
                selector.append(dict(obligation=obligation['id'],threshold=bar,kind=kind,expected=expected,accepted=actual,error=error,ok=expected==actual))
    (out/'selector-matrix.json').write_text(json.dumps(selector,sort_keys=True)+'\n')
    clock=subject.ClockBounds(0.1);primitive=[]
    for a in ['0','0.1','0.2','0.3','1.1']:
        for bvalue in ['0','0.1','0.2','0.3','1.1']:
            for op in ['le','lt']:
                lhs=Fraction(a)+Fraction(1,10);rhs=Fraction(bvalue)-Fraction(1,10)
                expected=lhs<=rhs if op=='le' else lhs<rhs
                actual=getattr(clock,op)(float(a),float(bvalue))
                primitive.append(dict(a=a,b=bvalue,op=op,expected=expected,actual=actual,ok=expected==actual))
    (out/'decimal-clock-matrix.json').write_text(json.dumps(primitive,sort_keys=True)+'\n')
    after={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in source_paths}
    summary=dict(start=start,end=time.time(),freeBytes=free,sourceBefore=before,sourceAfter=after,sourceStable=before==after,
        cliTotal=len(results),cliMatched=sum(r['ok'] for r in results),intendedGuardMatches=sum(r['intendedGuard'] for r in results),
        discrepancies=[r for r in results if not r['ok'] or not r['intendedGuard']],selectorTotal=len(selector),selectorMatched=sum(r['ok'] for r in selector),
        primitiveTotal=len(primitive),primitiveMatched=sum(r['ok'] for r in primitive))
    (out/'results.json').write_text(json.dumps(results,sort_keys=True)+'\n')
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))

if __name__=='__main__':main()

"""Follow-up source-kind and uncertainty controls after the initial review run."""
import copy
import hashlib
import hmac
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import time

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import review_round2 as r


def main():
    out=HERE/'supplement-evidence'
    if out.exists():raise SystemExit('Retain previous attempt')
    out.mkdir()
    free=shutil.disk_usage(HERE).free
    if free < 5*1024**3:raise SystemExit('Insufficient disk')
    before=r.sha(r.ORACLE.read_bytes()); started=time.time()
    c=json.loads(r.CONTRACT.read_bytes());base,inventory,expectations=r.positives(c)
    results=[]

    def run(protocol,label,edit=None,context_edit=None,retag=None,engine='xtdb',expected='REJECT',attack=None):
        p=out/str(len(results)).zfill(3)
        e=copy.deepcopy(base[protocol])
        if edit:edit(e)
        e,ctx=r.encode(p,protocol,e,c,inventory,expectations)
        if context_edit:context_edit(ctx,e)
        if retag:
            envelope=json.loads((p/'bundle/bundle.json').read_bytes())
            envelope['sut']['lane']=engine;ctx['engine']=engine
            field='counterSource' if protocol=='NO-MUTATION' else 'source'
            sources=[e[field]]+e.get('corroboration',[])
            for i,kind in enumerate(retag):
                for item in [envelope['streams'][i],ctx['streams'][i]]:
                    item.update(kind=kind,sourceId=kind.split('/')[-1])
                sources[i]['kind']=kind
            (p/'bundle/bundle.json').write_bytes(r.raw(envelope));ctx['bundleSha256']=r.sha(r.raw(envelope))
        for fname,obj in [('evidence.json',e),('context.json',ctx),('contract.json',c)]:
            (p/fname).write_bytes(r.raw(obj))
        if attack:attack(p,e,ctx)
        v=r.invoke(protocol,p)
        v.update(id=protocol+'/'+label,expected=expected,path=str(p.relative_to(HERE)))
        v['ok']=(v['code']==0 and v['result']['verdict']=='PASS') if expected=='PASS' else (v['code'] in [1,2] and v['result']['verdict'] in ['FAIL','REFUSED'])
        (p/'invocation.json').write_bytes(r.raw(v));results.append(v)

    run('NO-MUTATION','single-kind',context_edit=lambda c,e:e.pop('corroboration'))
    run('NO-MUTATION','two-ei-sources',retag=['EI-metric/xtdb/X1.node.tx.latestCompletedTxId','EI-trace/xtdb/X7'])
    run('NO-MUTATION','wrong-xtdb-gauge',retag=['EI-metric/xtdb/X1.latestSubmittedMsgId','TO/xtdb/T1'])
    run('NO-MUTATION','CR',retag=['CR/xtdb/X1.node.tx.latestCompletedTxId','TO/xtdb/T1'])
    run('WORK','HR-engine-facts',retag=['HR/any/HR'])
    run('WORK','EI-unknown-subtype',retag=['EI-invented/xtdb/X7'])
    run('NO-MUTATION','qlever-two-kinds',retag=['EI-metric/qlever/Q1','TO/qlever/T2'],engine='qlever',expected='PASS')
    for protocol in ['CANCEL','PREABORT']:
        run(protocol,'datomic-HO-TO',retag=['HO/datomic/H5','TO/datomic/T3'],engine='datomic',expected='PASS')
    run('PREABORT','datomic-EI-TO-insufficient',retag=['EI-log/datomic/D2','TO/datomic/T3'],engine='datomic')
    run('PREABORT','kind-id-mismatch',retag=['HO/xtdb/X6','TO/xtdb/T1'])
    run('NO-MUTATION','source-disagreement',context_edit=lambda c,e:e['corroboration'][0]['records'].update(engineMutationCounterAfter=18))

    def rewrite_chain(p,e,c):
        policy=c['streams'][0];previous=None
        for entry in policy['chunks']:
            path=p/'bundle'/entry['header'];hdr=json.loads(path.read_bytes())
            hdr['tStartReal']+=1;hdr['prevHeaderSha256']=previous;hdr.pop('hmac')
            hdr['hmac']=hmac.new((p/'run.key').read_bytes(),r.raw(hdr),hashlib.sha256).hexdigest()
            path.write_bytes(r.raw(hdr));previous=r.sha(r.raw(hdr));entry['headerSha256']=previous
        sealpath=p/'bundle/seal.json';seal=json.loads(sealpath.read_bytes());seal.pop('hmac')
        seal['heads'][policy['streamId']]=previous
        seal['hmac']=hmac.new((p/'run.key').read_bytes(),r.raw(seal),hashlib.sha256).hexdigest()
        sealpath.write_bytes(r.raw(seal));(p/'context.json').write_bytes(r.raw(c))
    run('WORK','consistent-resealed-chain-old-witness',attack=rewrite_chain)

    def inc(c,e):
        c.update(obligation='G8.support.incremental-witness',witnessKind='incremental',
                 selectedThreshold='T-INCR-WORK',thresholdIds=['T-INCR-WORK'])
    run('WORK','proper-incremental-context-rejects-2pct',
        edit=lambda e:(e.update(operation='one-entity-maintenance',threshold='T-INCR-WORK'),
            e['comparison'].update(operation='full-recomputation'),e['engineWorkUnits'].update(rowsScanned=2,triplesTouched=0)),context_edit=inc)
    run('RESOURCE','wrong-evidence-obligation',edit=lambda e:e.update(obligation='G1.found.unchanged44'))
    run('RESOURCE','context-omits-planner-bar',context_edit=lambda c,e:c.update(thresholdIds=['T-REUSE-AVOIDED']))
    def late_wait(e):
        e.update(waitMs=11,tRouteStart=111,tRouteEnd=121,tReadEnd=121)
        e['waitEvents']['end']['t']=111
    run('WATERMARK','source-events-over-wait-bound',edit=late_wait)
    def concealed_wait(e):
        e.update(tRouteStart=60110,tRouteEnd=60120,tReadEnd=60120)
        e['waitEvents']['end']['t']=60110
    run('WATERMARK','matching-source-events-concealed-wait',edit=concealed_wait)

    def uncertain(c,e):
        # [CX-VO05-2] Why: nonzero u should reject unresolved timing boundaries; rejected: always-zero fixture clocks (hide margin bugs).
        path=Path(c['streams'][0]['normalizerPath'])  # evaluator pin stays unchanged
        assert path.is_file()
        p=out/str(len(results)).zfill(3)
        envelope=json.loads((p/'bundle/bundle.json').read_bytes())
        envelope['clock']['maxUncertaintyMs']=1
        (p/'bundle/bundle.json').write_bytes(r.raw(envelope))
        c.update(bundleSha256=r.sha(r.raw(envelope)),clockMaxUncertaintyMs=1)
    def drain_inside(e):
        e['tCancelRequested']=102
    run('CANCEL','clock-margin-positive',edit=drain_inside,context_edit=uncertain,expected='PASS')
    def timeout(e):
        e.update(expectedError='E-TIMEOUT',callerError='E-TIMEOUT',tDeadline=100,tCallerSettled=200)
    def timeout_context(c,e):
        c['obligation']='G6.deadline.enforced';c['thresholdIds']=['T-DRAIN-MS','T-DEADLINE-GRACE-MS']
        c['bindings']['tDeadline']=100
        uncertain(c,e)
    run('CANCEL','timeout-uncertain-boundary',edit=timeout,context_edit=timeout_context)

    summary=dict(start=started,end=time.time(),hostDiskFreeBefore=free,total=len(results),matched=sum(x['ok'] for x in results),
        discrepancies=[x for x in results if not x['ok']],sourceStable=before==r.sha(r.ORACLE.read_bytes()),sourceSha256=before)
    (out/'results.json').write_bytes(r.raw(results));(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps(summary,indent=2))


if __name__=='__main__':main()

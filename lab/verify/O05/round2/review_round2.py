"""CX-VO05-2: independent bundle encoder and contract-derived adversarial CLI cases.

Uses only the prior review's independent hand-counted protocol examples. Does not
import builder fixtures, normalizers, tests or oracle implementation.
"""
import copy
import hashlib
import hmac
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SUBJECT = HERE / 'subject'
ORACLE = SUBJECT / 'lab/acceptance/oracle/observe.py'
CONTRACT = SUBJECT / 'lab/acceptance/obligations.json'
spec = importlib.util.spec_from_file_location('prior_review', HERE.parent / 'review.py')
prior = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prior)


def raw(x):
    return json.dumps(x, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode()


def sha(x):
    return hashlib.sha256(x).hexdigest()


KINDS = {
    'CANCEL': ['EI-log/xtdb/X6', 'TO/xtdb/T1'],
    'PREABORT': ['EI-log/xtdb/X6', 'TO/xtdb/T1'],
    'CONNECTIONS': ['HO/any/H4'], 'SCRATCH': ['DR/xtdb/X4'],
    'NO-MUTATION': ['EI-metric/xtdb/X1.node.tx.latestCompletedTxId', 'TO/xtdb/T1'],
    'RESOURCE': ['HO/any/H1'], 'AVAILABILITY': ['EI-metric/xtdb/X1'],
    'SCALE-COUNT': ['EI-query/xtdb/X4'], 'WORK': ['EI-trace/xtdb/X7'],
    'MAINTENANCE': ['EI-log/xtdb/X6'], 'ERASURE-SCAN': ['HO/any/H6'],
    'WATERMARK': ['TO/xtdb/T1'], 'ACK-ORDER': ['HO/any/H7', 'DR/any/H6'],
    'FAULT-TRANSITIONS': ['DR/xtdb/X4'],
}
OBLIGATIONS = dict(zip(KINDS, [
    'G6.cancel.observed-drain', 'G6.cancel.preaborted-no-work',
    'G6.ownership.bounded-connections', 'G6.cleanup.scratch-zero',
    'G3.recursion.read-only-frontier', 'G3.admission.preconstruction',
    'G6.resource.memory-failure-contained', 'S.population.year-one',
    'G8.reuse.positive-witness', 'NS.P3', 'G9.erasure.protected-copies',
    'G8.composition.watermark-routing', 'G7.composition.ack-and-routed-ryow',
    'G7.commit.protocol-transitions']))
BINDINGS = {
    'CANCEL': 'requestId connectionId expectedError', 'PREABORT': 'requestId coverage',
    'CONNECTIONS': 'poolDeclarations baseline tClose', 'SCRATCH': 'relation unknownOutcomes',
    'NO-MUTATION': '', 'RESOURCE': 'obligation forecast envelope', 'AVAILABILITY': 'tFailure',
    'SCALE-COUNT': 'population', 'WORK': 'operation', 'MAINTENANCE': 'kind',
    'ERASURE-SCAN': 'tErasurePublished', 'WATERMARK': 'readId basisPosition tReadStart',
    'ACK-ORDER': 'commitPosition sourceOfTruth', 'FAULT-TRANSITIONS': 'tCrash variant',
}


def fault(transition='QT2-LOGGED'):
    effect = {'entity': 'subject-a', 'attribute': 'status', 'value': 'approved'}
    absent = {'entity': 'subject-a', 'attribute': 'status', 'value': 'pending'}
    payload = dict(operationId='command-a', position=7)
    facts = {
        'QT2-LOGGED': dict(recordType='COMMIT', decision='commit', durable=True,
                          commitRecord=dict(payload, type='COMMIT', effects=[effect], absences=[absent])),
        'QT4s-SOURCE-PUBLISHED': dict(decisionDurable=True, sourceReadable=True,
            commitRecord=dict(payload, type='COMMIT', effects=[effect], absences=[absent]),
            sourceReadback=dict(payload, effects=[effect], absences=[absent])),
        'QT5-VERIFIED': dict(accessPaths={p: dict(effects=[effect], absences=[absent]) for p in ['eav', 'ave', 'vea']}),
        'XT2-ENGINE-COMMITTED': dict(committed=True, operationMarkerPresent=True,
            transaction=dict(payload, effects=[effect]), marker=dict(payload, visible=True)),
    }[transition]
    record = dict(transition=transition, t=30, **payload, facts=facts)
    obj = dict(record=record, sha256=sha(raw(record)), tReadBack=901,
               readbackOperationId='command-a', readbackPosition=7,
               restartIdentity='restart-a', logIdentity='source-a')
    row = dict(transition=transition, t=30, durableEvidenceObject=obj)
    evidence = dict(row, transitions=[copy.deepcopy(row)], tCrash=900,
                    variant='engine-source' if transition.startswith('XT') else 'log-source')
    expected = dict(payload, facts=copy.deepcopy(facts))
    return evidence, {transition: expected}


def positives(c):
    base = prior.bases(c)
    for k, e in base.items():
        e.pop('source', None)
        e.pop('counterSource', None)
    base['WATERMARK']['waitEvents'] = dict(
        start=dict(kind='read-start', readId='read-a', t=100),
        end=dict(kind='engine-request', readId='read-a', t=110))
    base['ACK-ORDER']['ryowPullRoute'] = copy.deepcopy(base['WATERMARK'])
    inventory = []
    for i, category in enumerate(c['protectedCopyInventory'] + ['observer outputs', 'old index generations', 'freed blocks']):
        inventory.append(dict(id='copy-' + str(i), category=category, location='fixture-volume/copy-' + str(i),
                              scanMethod='decoded-byte-scan-v1', canary='review-canary-' + str(i)))
    scans = []
    for x in inventory:
        scans.append(dict(inventoryEntry=x['id'], location=x['location'], scanMethod=x['scanMethod'],
            plaintextHits=0, derivedChannelHits=0, keyDestroyedEvidence=None, tScan=21,
            positiveControl=dict(canary=x['canary'], tWritten=10, tFound=11, hits=1,
                                 scanMethod=x['scanMethod'], location=x['location'])))
    base['ERASURE-SCAN'] = dict(scans[0], scans=scans, tErasurePublished=20)
    base['FAULT-TRANSITIONS'], expectations = fault()
    return base, inventory, expectations


def encode(directory, protocol, evidence, contract, inventory, expectations):
    directory.mkdir(parents=True)
    bundle = directory / 'bundle'
    bundle.mkdir()
    key = hashlib.sha256(str(directory.name).encode()).digest()
    (directory / 'run.key').write_bytes(key)
    e = copy.deepcopy(evidence)
    policies, streams, witnesses, heads = [], [], [], {}
    run = 'review-' + directory.name
    normalizer = HERE / 'normalize.py'

    def bind(obj, kinds, keyname='source'):
        # [CX-VO05-2] Why: independently encode field events in two chained chunks; rejected: builder fixtures (correlated bugs).
        records = copy.deepcopy(obj)
        entries = []
        for kind in kinds:
            sid = 'stream-' + str(len(streams))
            path = bundle / 'streams' / sid
            path.mkdir(parents=True)
            events = [raw(dict(field=k, value=v)) + b'\n' for k, v in records.items()]
            split = max(1, len(events) // 2)
            parts = [b''.join(events[:split]), b''.join(events[split:])]
            previous = None
            chunks = []
            for seq, chunk in enumerate(parts):
                hdr = dict(streamId=sid, seq=seq, tStartMono=seq * 50000, tEndMono=(seq+1)*50000,
                    tStartReal=seq*50000, byteLength=len(chunk), sha256=sha(chunk), prevHeaderSha256=previous)
                hdr['hmac'] = hmac.new(key, raw(hdr), hashlib.sha256).hexdigest()
                hb = raw(hdr)
                prefix = 'streams/' + sid + '/' + str(seq)
                (bundle / (prefix + '.bin')).write_bytes(chunk)
                (bundle / (prefix + '.json')).write_bytes(hb)
                previous = sha(hb)
                chunks.append(dict(raw=prefix+'.bin', header=prefix+'.json', headerSha256=previous))
                witnesses.append(dict(runId=run, streamId=sid, seq=seq, headSha256=previous, tMono=(seq+1)*50000))
            meta = dict(streamId=sid, kind=kind, sourceId=kind.split('/')[-1], endpoint='review-synthetic-events',
                method='capture', cadenceMs=1000, normalizer=dict(id='review-events', version=1, sha256=sha(normalizer.read_bytes())))
            streams.append(meta)
            policies.append(dict(meta, normalizerPath=str(normalizer), chunks=chunks))
            heads[sid] = previous
            entries.append(dict(kind=kind, streamRefs=[sid], records=copy.deepcopy(records)))
        obj[keyname] = entries[0]
        if len(entries) > 1:
            obj['corroboration'] = entries[1:]

    if protocol == 'ACK-ORDER':
        bind(e['ryowPullRoute'], KINDS['WATERMARK'])
    bind(e, KINDS[protocol], 'counterSource' if protocol == 'NO-MUTATION' else 'source')
    bridge = b'{"send":0,"receive":0,"observerMono":0}\n'
    (bundle / 'bridge.jsonl').write_bytes(bridge)
    envelope = dict(format='obs-bundle/1', runId=run, receiptId=run+'-receipt', keyId=run+'-key',
        collector=dict(imageDigest='synthetic-review-only', sourceSha256=sha(normalizer.read_bytes()), configSha256='1'*64,
            containerId='synthetic-observer', cgroupPath='/synthetic', cpuset='0', startedAtMono=0, startedAtReal=0),
        sut=dict(lane='xtdb', engineContainerId='synthetic-engine', engineImageDigest='synthetic-review-only',
            engineConfigSha256='2'*64, enginePids=[dict(role='engine', pid=1, starttime=1)]),
        clock=dict(domain='vm-monotonic-ms', bridge='bridge.jsonl', maxUncertaintyMs=0), streams=streams)
    (bundle / 'bundle.json').write_bytes(raw(envelope))
    seal = dict(runId=run, heads=heads)
    seal['hmac'] = hmac.new(key, raw(seal), hashlib.sha256).hexdigest()
    (bundle / 'seal.json').write_bytes(raw(seal))
    oid = OBLIGATIONS[protocol]
    threshold_ids = next(o['thresholds'] for o in contract['obligations'] if o['id'] == oid)[:]
    if protocol == 'ACK-ORDER':
        threshold_ids += ['T-WATERMARK-WAIT-MS']
    context = dict(format='obs-context/1', runId=run, receiptId=run+'-receipt', keyId=run+'-key',
        protocol='OBS-'+protocol, engine='xtdb', obligation=oid, case='independent-contract-example',
        witnessKind='reuse' if protocol == 'WORK' else protocol, thresholdIds=threshold_ids,
        contractSha256=sha(raw(contract)), bundleSha256=sha(raw(envelope)), bridgeSha256=sha(bridge),
        clockMaxUncertaintyMs=0, bindings={k: copy.deepcopy(e[k]) for k in BINDINGS[protocol].split()},
        streams=policies, witnessHeads=witnesses)
    if protocol in ('WORK', 'MAINTENANCE'):
        context['selectedThreshold'] = 'T-REUSE-AVOIDED' if protocol == 'WORK' else 'NS-P3-LAG-P99-MS'
    if protocol == 'ERASURE-SCAN':
        context['scanInventory'] = copy.deepcopy(inventory)
    if protocol == 'FAULT-TRANSITIONS':
        context.update(variant=e['variant'], transitionExpectations=copy.deepcopy(expectations))
    return e, context


def invoke(protocol, path, bundle=True):
    cmd = [sys.executable, '-I', '-B', str(ORACLE), 'check', 'OBS-'+protocol,
           str(path/'evidence.json'), '--contract', str(path/'contract.json')]
    if bundle:
        cmd += ['--context', str(path/'context.json'), '--bundle', str(path/'bundle'), '--key-file', str(path/'run.key')]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=45)
    (path/'stdout.txt').write_text(proc.stdout)
    (path/'stderr.txt').write_text(proc.stderr)
    result = json.loads(proc.stdout) if proc.stdout else {'verdict': 'CRASH'}
    return dict(code=proc.returncode, result=result, command=cmd)


def build_cases(c):
    base, inventory, expectations = positives(c)
    cases = []

    def add(protocol, label, edit=None, ctx=None, attack=None, expected='REJECT', custom=None, exp=None):
        e = copy.deepcopy(base[protocol] if custom is None else custom)
        if edit:
            edit(e)
        cases.append(dict(id=protocol+'/'+label, protocol=protocol, evidence=e, ctx=ctx, attack=attack,
                          expected=expected, expectations=expectations if exp is None else exp))

    for protocol in base:
        add(protocol, 'positive', expected='PASS')
        add(protocol, 'raw-tamper', attack=lambda p,e,c: (p/'bundle/streams/stream-0/0.bin').write_bytes(b'forged'))
        add(protocol, 'witness-head-differs', ctx=lambda c,e: c['witnessHeads'][-1].update(headSha256='0'*64))
    add('WORK', 'missing-context', attack=lambda p,e,c: (p/'context.json').write_bytes(b'{}'))
    add('WORK', 'wrong-key', attack=lambda p,e,c: (p/'run.key').write_bytes(b'X'*32))
    add('WORK', 'normalizer-pin', ctx=lambda c,e: c['streams'][0]['normalizer'].update(sha256='0'*64))
    add('WORK', 'no-final-witness', ctx=lambda c,e: c.update(witnessHeads=[w for w in c['witnessHeads'] if w['seq'] == 0]))
    add('WORK', 'path-escape', ctx=lambda c,e: c['streams'][0]['chunks'][0].update(raw='../run.key'))
    add('WORK', 'different-case-operation', ctx=lambda c,e: c['bindings'].update(operation='other-operation'))
    add('WORK', 'different-contract', ctx=lambda c,e: c.update(contractSha256='0'*64))
    add('WORK', 'evidence-threshold-launder', lambda e: e.update(threshold='T-INCR-WORK'))
    add('WORK', 'context-witness-launder', ctx=lambda c,e: c.update(witnessKind='incremental'))
    add('WORK', 'another-obligation-threshold-only', ctx=lambda c,e: c.update(thresholdIds=['T-INCR-WORK']))

    def launder(c, e):
        c.update(obligation='G8.support.incremental-witness', witnessKind='reuse',
                 selectedThreshold='T-REUSE-AVOIDED', thresholdIds=['T-INCR-WORK','T-REUSE-AVOIDED'])
    add('WORK', 'context-incremental-obligation-reuse-threshold',
        lambda e: (e.update(operation='one-entity-maintenance'), e['comparison'].update(operation='full-recomputation'),
                   e['engineWorkUnits'].update(rowsScanned=2, triplesTouched=0)), ctx=launder)
    add('WORK', 'unrelated-obligation', ctx=lambda c,e: c.update(obligation='G1.found.unchanged44'))

    for threshold, denom in [('T-REUSE-AVOIDED',2), ('T-INCR-WORK',100)]:
        for units in ['rowsScanned', 'rowsWritten', 'triplesTouched', 'bytesWritten']:
            for offset in [0,1]:
                def edit(e, units=units, offset=offset, threshold=threshold, denom=denom):
                    e['threshold'] = threshold
                    e['engineWorkUnits'] = dict.fromkeys(e['engineWorkUnits'],0)
                    e['comparison']['engineWorkUnits'] = dict.fromkeys(e['engineWorkUnits'],0)
                    e['engineWorkUnits'][units] = 2**53 + offset
                    e['comparison']['engineWorkUnits'][units] = denom * 2**53
                def ctx(c,e,threshold=threshold):
                    if threshold == 'T-INCR-WORK':
                        c.update(obligation='G8.support.incremental-witness', witnessKind='incremental',
                                 selectedThreshold=threshold, thresholdIds=[threshold])
                add('WORK', threshold+'-'+units+'-'+str(offset), edit, ctx,
                    expected='PASS' if offset == 0 else 'REJECT')

    for transition in ['QT2-LOGGED','QT4s-SOURCE-PUBLISHED','QT5-VERIFIED','XT2-ENGINE-COMMITTED']:
        f, exp = fault(transition)
        add('FAULT-TRANSITIONS', transition+'-positive', custom=f, exp=exp, expected='PASS')
        def change(e, mode, transition=transition):
            obj=e['transitions'][0]['durableEvidenceObject']
            if mode == 'label':
                obj['record'] = dict(transition=transition,t=30)
            elif mode == 'missing':
                e['transitions'][0]['durableEvidenceObject'] = None
                e['durableEvidenceObject'] = None
                return
            elif mode == 'precrash':
                obj['tReadBack'] = 900
            elif mode == 'wrong-id':
                obj['readbackOperationId'] = 'other-command'
            elif mode == 'wrong-facts':
                facts=obj['record']['facts']
                if 'accessPaths' in facts:
                    facts['accessPaths']['ave']['effects'] = []
                    facts['accessPaths']['ave']['absences'] = []
                elif 'commitRecord' in facts:
                    facts['commitRecord']['effects'][0]['value'] = 'wrong'
                else:
                    facts['transaction']['effects'] = []
            obj['sha256'] = sha(raw(obj['record']))
            e['durableEvidenceObject'] = copy.deepcopy(obj)
        for mode in ['label','missing','precrash','wrong-id','wrong-facts']:
            add('FAULT-TRANSITIONS', transition+'-'+mode, lambda e,mode=mode,change=change: change(e,mode), custom=f, exp=exp)

    for mode in ['missing','zero','wrong-canary','after-publication','different-scanner','different-location']:
        def edit(e,mode=mode):
            r=e['scans'][-1]
            if mode == 'missing': r.pop('positiveControl')
            elif mode == 'zero': r['positiveControl']['hits']=0
            elif mode == 'wrong-canary': r['positiveControl']['canary']='wrong'
            elif mode == 'after-publication': r['positiveControl']['tFound']=20
            elif mode == 'different-scanner': r['positiveControl']['scanMethod']='blind-grep'
            elif mode == 'different-location': r['positiveControl']['location']='elsewhere'
        add('ERASURE-SCAN', 'canary-'+mode,edit)
    add('ERASURE-SCAN','positive-hit',lambda e:e['scans'][-1].update(derivedChannelHits=1))
    add('WATERMARK','duration-label',lambda e:e.update(waitMs=1))
    add('WATERMARK','unaccounted-delay',lambda e:e.update(tRouteStart=60110,tRouteEnd=60120,tReadEnd=60120))
    add('WATERMARK','wait-wrong-read',lambda e:e['waitEvents']['end'].update(readId='other-read'))
    add('WATERMARK','missing-wait-start',lambda e:e['waitEvents'].pop('start'))

    def uncertain(p,e,c):
        path=p/'bundle/bundle.json'; b=json.loads(path.read_bytes())
        b['clock']['maxUncertaintyMs']=1
        path.write_bytes(raw(b)); c['bundleSha256']=sha(raw(b)); c['clockMaxUncertaintyMs']=1
        (p/'context.json').write_bytes(raw(c))
    for protocol in ['CANCEL','CONNECTIONS','AVAILABILITY','WATERMARK']:
        add(protocol,'boundary-clock-uncertainty',attack=uncertain)
    return cases, inventory


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--case':
        manifest=json.loads((HERE/'evidence'/sys.argv[2]/'invocation.json').read_bytes())
        return subprocess.run(manifest['command']).returncode
    out=HERE/'evidence'
    if out.exists():
        raise SystemExit('Retain previous execution; choose a new evidence directory before rerunning')
    out.mkdir()
    start=time.time()
    free=shutil.disk_usage(HERE).free
    if free < 5*1024**3: raise SystemExit('Insufficient disk')
    before={str(p.relative_to(HERE)):sha(p.read_bytes()) for p in SUBJECT.rglob('*') if p.is_file()}
    c=json.loads(CONTRACT.read_bytes())
    results=[]
    legacy=json.loads((HERE.parent/'cases.json').read_bytes())
    for i,row in enumerate(legacy):
        path=out/('legacy-'+str(i).zfill(3));path.mkdir()
        (path/'evidence.json').write_bytes(raw(row['evidence']))
        (path/'contract.json').write_bytes(raw(row.get('contract',c)))
        result=invoke(row['protocol'].removeprefix('OBS-'),path,False)
        result.update(id=row['id'],group='legacy',expected='REJECT',path=str(path.relative_to(HERE)))
        result['ok']=result['code'] in [1,2] and result['result']['verdict'] in ['FAIL','REFUSED']
        (path/'invocation.json').write_bytes(raw(result))
        results.append(result)
    cases,inventory=build_cases(c)
    for i,row in enumerate(cases):
        path=out/('new-'+str(i).zfill(3))
        e,context=encode(path,row['protocol'],row['evidence'],c,inventory,row['expectations'])
        if row['ctx']:row['ctx'](context,e)
        for fname,obj in [('evidence.json',e),('context.json',context),('contract.json',c)]:
            (path/fname).write_bytes(raw(obj))
        if row['attack']:row['attack'](path,e,context)
        result=invoke(row['protocol'],path)
        result.update(id=row['id'],group='bundle',expected=row['expected'],path=str(path.relative_to(HERE)))
        result['ok']=(result['code']==0 and result['result']['verdict']=='PASS') if row['expected']=='PASS' else (result['code'] in [1,2] and result['result']['verdict'] in ['FAIL','REFUSED'])
        (path/'invocation.json').write_bytes(raw(result))
        results.append(result)
    after={str(p.relative_to(HERE)):sha(p.read_bytes()) for p in SUBJECT.rglob('*') if p.is_file()}
    (out/'results.json').write_bytes(raw(results))
    summary=dict(start=start,end=time.time(),python=sys.version,freeBytes=free,sourceStable=before==after,
        sourceHashes=before,legacy=len(legacy),bundles=len(cases),matched=sum(r['ok'] for r in results),
        discrepancies=[{k:r[k] for k in ['id','path','expected','code','result']} for r in results if not r['ok']])
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k!='sourceHashes'},indent=2))
    return 0


if __name__=='__main__':
    sys.exit(main())

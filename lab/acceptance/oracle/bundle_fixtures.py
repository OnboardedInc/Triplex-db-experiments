"""Independent hand-built obs-bundle/1 encoder, never imports the oracle."""
import copy
import hashlib
import hmac
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

def raw(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode()

def sha(value):
    return hashlib.sha256(value).hexdigest()

def fixture(case, directory, contract):
    e = copy.deepcopy(case['evidence']); protocol = case['protocol'].removeprefix('OBS-')
    directory = Path(directory); root = directory / 'bundle'; root.mkdir()
    key = b'F' * 32
    assert len(key) == 32
    keyfile = directory / 'key'; keyfile.write_bytes(key)
    selections = {
        'CANCEL': ('EI-log/xtdb/X6', 'TO/xtdb/T1'),
        'PREABORT': ('EI-log/xtdb/X6', 'TO/xtdb/T1'),
        'CONNECTIONS': ('HO/any/H4',), 'SCRATCH': ('EI-query/xtdb/X4',),
        'NO-MUTATION': ('EI-metric/xtdb/X1.node.tx.latestCompletedTxId', 'TO/xtdb/T1'),
        'RESOURCE': ('HO/any/H1',), 'AVAILABILITY': ('EI-metric/xtdb/X1',),
        'SCALE-COUNT': ('EI-query/xtdb/X4',), 'WORK': ('EI-trace/xtdb/X7',),
        'MAINTENANCE': ('EI-log/xtdb/X6',), 'ERASURE-SCAN': ('DR/any/H6',),
        'WATERMARK': ('TO/xtdb/T1',), 'ACK-ORDER': ('HO/any/H7', 'DR/any/H6'),
        'FAULT-TRANSITIONS': ('DR/xtdb/X4',),
    }
    streams, policies, heads, witnesses = [], [], {}, []
    normalizer = HERE / 'fixture_normalizer.py'
    def bind(obj, kinds, keyname='source'):
        # [EXP-O05-R2] Why: preserve stale or forged fixture source contents. Rejected: silently repairing a negative case.
        original = obj[keyname]
        records = copy.deepcopy(original.get('records', {}))
        created = []
        for kind in kinds:
            sid = 'stream-' + str(len(streams)); chunk = b''.join(raw({'field': k, 'value': v}) + b'\n' for k, v in records.items())
            rel = 'streams/' + sid; (root / rel).mkdir(parents=True)
            header = dict(streamId=sid, seq=0, tStartMono=0, tEndMono=100000, tStartReal=0,
                          byteLength=len(chunk), sha256=sha(chunk), prevHeaderSha256=None)
            header['hmac'] = hmac.new(key, raw(header), hashlib.sha256).hexdigest()
            hb = raw(header); (root / rel / '0.bin').write_bytes(chunk); (root / rel / '0.hdr.json').write_bytes(hb)
            norm = {'id': 'fixture-events', 'version': 1, 'sha256': sha(normalizer.read_bytes())}
            meta = dict(streamId=sid, kind=kind, sourceId=kind.split('/')[-1], normalizer=norm,
                        endpoint='fixture', method='capture', cadenceMs=0)
            streams.append(meta)
            policies.append(dict(meta, normalizerPath=str(normalizer), chunks=[dict(raw=rel+'/0.bin', header=rel+'/0.hdr.json', headerSha256=sha(hb))]))
            heads[sid] = sha(hb); witnesses.append(dict(runId='fixture-run', streamId=sid, seq=0, headSha256=sha(hb), tMono=100000))
            created.append(dict(kind=kind, records=copy.deepcopy(records), streamRefs=[sid]))
        obj[keyname] = created[0]
        if len(created) > 1:
            obj['corroboration'] = created[1:]
        return created
    if protocol == 'ACK-ORDER':
        pull = e['ryowPullRoute']
        bind(pull, selections['WATERMARK'])
        # The parent raw capture includes the independently bound nested pull object.
        e['source']['records']['ryowPullRoute'] = copy.deepcopy(pull)
    keyname = 'counterSource' if protocol == 'NO-MUTATION' else 'source'
    oldkind = e[keyname].get('kind', '')
    created = bind(e, selections[protocol], keyname)
    if oldkind in ('client-counter',):
        e[keyname]['kind'] = 'CR/xtdb/adapter'
    bridge = b'{"send":0,"receive":0,"observerMono":0}\n'; (root/'bridge.jsonl').write_bytes(bridge)
    bundle = dict(format='obs-bundle/1', runId='fixture-run', receiptId='fixture-receipt', keyId='fixture-key',
                  collector=dict(imageDigest='fixture-only',sourceSha256='0'*64,configSha256='0'*64,containerId='fixture-observer',cgroupPath='/fixture',cpuset='0',startedAtMono=0,startedAtReal=0), sut=dict(lane='xtdb',engineContainerId='fixture-engine',engineImageDigest='fixture-only',engineConfigSha256='0'*64,enginePids=[dict(role='engine',pid=1,starttime=1)]),
                  clock=dict(domain='vm-monotonic-ms', bridge='bridge.jsonl', maxUncertaintyMs=0), streams=streams)
    (root/'bundle.json').write_bytes(raw(bundle))
    seal = dict(runId='fixture-run', heads=heads); seal['hmac'] = hmac.new(key, raw(seal), hashlib.sha256).hexdigest()
    (root/'seal.json').write_bytes(raw(seal))
    obligation = 'G3.admission.preconstruction' if protocol == 'RESOURCE' and 'planner' in case['id'] else 'S.capacity.admitted'
    context = dict(format='obs-context/1', runId='fixture-run', receiptId='fixture-receipt', keyId='fixture-key',
                   protocol=case['protocol'], obligation=obligation, case='hand-built-contract-case', witnessKind=protocol,
                   thresholdIds=list(contract['thresholds']), contractSha256=sha(raw(contract)), bundleSha256=sha(raw(bundle)),
                   engine='xtdb', streams=policies, witnessHeads=witnesses, bindings={}, clockMaxUncertaintyMs=0,
                   bridgeSha256=sha(bridge), selectedThreshold='T-REUSE-AVOIDED' if protocol == 'WORK' else 'NS-P3-LAG-P99-MS')
    if protocol == 'FAULT-TRANSITIONS':
        context['variant'] = 'log-source'
        context['transitionExpectations'] = {'QT4s-SOURCE-PUBLISHED': dict(operationId='op1', position=2,
                           facts={'decisionDurable': True, 'sourceReadable': True, 'commitRecord': {'operationId':'op1','position':2,'type':'COMMIT','effects':[{'entity':'e1','attribute':'a','value':1}]}, 'sourceReadback':{'operationId':'op1','position':2,'effects':[{'entity':'e1','attribute':'a','value':1}], 'absences':[]}})}
    if protocol == 'ERASURE-SCAN':
        context['scanInventory'] = copy.deepcopy(case.get('scanInventory', []))
    case_fields = {
        'CANCEL': ['requestId', 'connectionId', 'expectedError'], 'PREABORT': ['requestId', 'coverage'],
        'CONNECTIONS': ['poolDeclarations', 'baseline', 'tClose'], 'SCRATCH': ['relation', 'unknownOutcomes'],
        'NO-MUTATION': [], 'RESOURCE': ['obligation', 'forecast', 'envelope'], 'AVAILABILITY': ['tFailure'],
        'SCALE-COUNT': ['population'], 'WORK': ['operation'], 'MAINTENANCE': ['kind'],
        'ERASURE-SCAN': ['tErasurePublished'], 'WATERMARK': ['readId', 'basisPosition', 'tReadStart'],
        'ACK-ORDER': ['commitPosition', 'sourceOfTruth'], 'FAULT-TRANSITIONS': ['tCrash', 'variant'],
    }
    context['bindings'] = {k: copy.deepcopy(e[k]) for k in case_fields[protocol] if k in e}
    if protocol == 'CANCEL' and e.get('expectedError') == 'E-TIMEOUT':
        context['bindings']['tDeadline'] = e['tDeadline']
    if protocol == 'WORK':
        context['witnessKind'] = 'reuse'
        context['obligation'] = 'G8.reuse.positive-witness'
        context['thresholdIds'] = ['T-REUSE-AVOIDED']
    return e, context, root, keyfile

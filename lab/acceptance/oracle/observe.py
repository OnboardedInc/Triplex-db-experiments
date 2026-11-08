"""EXP-O05: independent, stdlib-only observation evidence evaluator."""
import argparse
import hashlib
import hmac
from fractions import Fraction
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[3]
FIELDS = {
    'CANCEL': 'requestId connectionId tCancelRequested tCallerSettled callerError transportAck engineActiveSamples tDrained reuseQueryId tReuseOk expectedError reuseConnectionId reuseResult source',
    'PREABORT': 'requestId engineStatementLog coverage source',
    'CONNECTIONS': 'poolDeclarations engineConnectionSamples baseline tClose source',
    'SCRATCH': 'relation countBefore countAfter resolutionReceipts unknownOutcomes source',
    'NO-MUTATION': 'engineMutationCounterBefore engineMutationCounterAfter counterSource',
    'RESOURCE': 'forecast peaks envelope obligation source',
    'AVAILABILITY': 'tFailure probes events source',
    'SCALE-COUNT': 'population countQueryCaseResult analyticCount source',
    'WORK': 'operation engineWorkUnits source comparison threshold',
    'MAINTENANCE': 'kind tStart tEnd lagSamples events source threshold',
    'ERASURE-SCAN': 'inventoryEntry location scanMethod plaintextHits derivedChannelHits keyDestroyedEvidence tScan scans tErasurePublished source',
    'WATERMARK': 'readId basisPosition servingIndex watermarkAtRead waitMs route fallbackIndex eligibility surfaceLanguage tReadStart tReadEnd tRouteStart tRouteEnd waitEvents source',
    'ACK-ORDER': 'commitPosition tSourcePublished tAck ackSender ryowPullRoute sourceOfTruth source',
    'FAULT-TRANSITIONS': 'transition t durableEvidenceObject transitions tCrash variant source',
}
# [EXP-O05-R2] Why: R27 source cells constrain provenance before semantics. Rejected: arbitrary kind labels (F1).
SOURCE_CELLS = {
    'CANCEL': ('X6 X7 T1', 'Q3 Q4 T2', 'H5 T3'),
    'PREABORT': ('X6 T1', 'Q3 T2', 'D2 D3 H5 T3'),
    'CONNECTIONS': ('H4 X1 T1', 'H4 T2', 'H4 T3'),
    'SCRATCH': ('X3 X4', 'Q5', 'D3'),
    'NO-MUTATION': ('X1 X7 T1', 'Q1 Q6 H6 T2', 'D1 D2 D3 T3'),
    'RESOURCE': ('H1 H2 H3 X1', 'H1 H2 H3 Q1 Q7', 'H1 H2 H3 D1'),
    'AVAILABILITY': ('HR X1 X2 H8', 'HR Q1 H8', 'HR D1 D3 H8'),
    'SCALE-COUNT': ('X4 T1', 'Q5 T2', 'D3 T3'),
    'WORK': ('X3 X7 X8 H1 H3', 'Q1 Q8 T2 H1 H3', 'D1 D3 D4 H1 H3'),
    'MAINTENANCE': ('X1 X3 X6 H1', 'Q1 Q9 H1', 'D1 D2 D3 H1'),
    'ERASURE-SCAN': ('H6', 'H6', 'H6'),
    'WATERMARK': ('T1 H8', 'T2 Q1', 'T3 D3'),
    'ACK-ORDER': ('X3 X7 H6 H7 HR', 'H6 H7 HR', 'D3 HR'),
    'FAULT-TRANSITIONS': ('X3 X4 H6 T1', 'Q5 H6 T2', 'D3 H6 T3'),
}
CASE_FIELDS = {
    'CANCEL': {'requestId', 'connectionId', 'expectedError'},
    'PREABORT': {'requestId', 'coverage'}, 'CONNECTIONS': {'poolDeclarations', 'baseline', 'tClose'},
    'SCRATCH': {'relation', 'unknownOutcomes'}, 'NO-MUTATION': set(),
    'RESOURCE': {'obligation', 'forecast', 'envelope'}, 'AVAILABILITY': {'tFailure'},
    'SCALE-COUNT': {'population'}, 'WORK': {'operation'}, 'MAINTENANCE': {'kind'},
    'ERASURE-SCAN': {'tErasurePublished'}, 'WATERMARK': {'readId', 'basisPosition', 'tReadStart'},
    'ACK-ORDER': {'commitPosition', 'sourceOfTruth'}, 'FAULT-TRANSITIONS': {'tCrash', 'variant'},
}

SAFETY = {'CANCEL', 'PREABORT', 'NO-MUTATION', 'ACK-ORDER'}
CALLER_FIELDS = {'tCancelRequested', 'tCallerSettled', 'callerError', 'expectedError',
                 'tDeadline', 'tAck', 'ackSender', 'probes'}



class Invalid(ValueError):
    pass


class Failed(ValueError):
    pass


class Refused(ValueError):
    pass


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def load(path):
    def pairs(items):
        out = {}
        for key, value in items:
            if key in out:
                raise Invalid('duplicate JSON key: ' + key)
            out[key] = value
        return out
    value = json.loads(Path(path).read_text(), object_pairs_hook=pairs,
                       parse_constant=lambda x: (_ for _ in ()).throw(Invalid('nonfinite JSON: ' + x)))
    def finite(node):
        if isinstance(node, float) and not math.isfinite(node):
            raise Invalid('nonfinite JSON number')
        if isinstance(node, dict):
            for item in node.values():
                finite(item)
        elif isinstance(node, list):
            for item in node:
                finite(item)
    finite(value)
    return value


def need(obj, *fields):
    if not isinstance(obj, dict):
        raise Invalid('expected object')
    for field in fields:
        if field not in obj:
            raise Failed('missing required field: ' + field)
    return obj


def num(value):
    if type(value) not in (int, float) or not math.isfinite(value) or value < 0:
        raise Invalid('expected finite nonnegative number')
    return value


def integer(value):
    if type(value) is not int or value < 0:
        raise Invalid('expected nonnegative integer')
    return value


def name(value):
    if not isinstance(value, str) or not value:
        raise Invalid('expected nonempty string')
    return value


def array(value, nonempty=True):
    if not isinstance(value, list):
        raise Invalid('expected array')
    if nonempty and not value:
        raise Failed('empty evidence array')
    return value


def require(condition, reason):
    if not condition:
        raise Failed(reason)


def times(samples):
    ts = [num(need(s, 't')['t']) for s in array(samples)]
    require(ts == sorted(set(ts)), 'sample times must be strictly increasing')
    return ts


class ClockBounds:
    # [EXP-O05-R3] Why: all observation timing gates use worst-case endpoint intervals. Rejected: handler-local margins (R2-F3).
    def __init__(self, uncertainty):
        self.u = Fraction(str(num(uncertainty)))

    def value(self, t):
        return Fraction(str(num(t)))

    def le(self, a, b):
        return self.value(a) + self.u <= self.value(b) - self.u

    def lt(self, a, b):
        return self.value(a) + self.u < self.value(b) - self.u

    def within(self, start, end, limit):
        return self.le(start, end) and self.value(end) - self.value(start) + 2 * self.u <= self.value(limit)

    def upper_duration(self, duration):
        return self.value(duration) + 2 * self.u

    def times(self, samples):
        ts = times(samples)
        require(all(self.lt(a, b) for a, b in zip(ts, ts[1:])), 'uncertain sample time order')
        return ts

    def coverage(self, samples, start, end, gap):
        ts = self.times(samples)
        require(self.le(ts[0], start) and self.le(end, ts[-1]), 'samples do not cover uncertain required window')
        require(all(self.within(a, b, gap) for a, b in zip(ts, ts[1:])
                    if not self.lt(b, start) and not self.lt(end, a)), 'uncertain sample coverage gap')


def work_selection(obligation, context):
    # [EXP-O05-R3] Why: the contract obligation selects the bar, even in trusted context. Rejected: threshold unions (R2-F2).
    kinds = {'T-REUSE-AVOIDED': 'reuse', 'T-INCR-WORK': 'incremental'}
    bars = set(obligation['thresholds']) & set(kinds)
    if 'O-OBS' not in obligation['oracles'] or len(bars) != 1:
        raise Refused('CONTEXT-CONTRADICTION: obligation does not select one OBS-WORK witness')
    selected = next(iter(bars))
    if (context['selectedThreshold'] != selected or context['witnessKind'] != kinds[selected]
            or set(context['thresholdIds']) & set(kinds) != {selected}):
        raise Refused('CONTEXT-CONTRADICTION: work threshold differs from bound obligation')
    return selected


def source(e, protocol, authenticated, engine):
    key = 'counterSource' if protocol == 'NO-MUTATION' else 'source'
    primary = need(e[key], 'streamRefs', 'records', 'kind')
    sources = [primary] + array(e.get('corroboration', []), False)
    seen, kinds, fields, origins = set(), set(), {}, set()
    engine_fields = set(FIELDS[protocol].split()) - {'source', 'counterSource'} - CALLER_FIELDS
    for item in sources:
        need(item, 'streamRefs', 'records', 'kind')
        refs = array(item['streamRefs'])
        require(len(refs) == 1 and refs[0] not in seen, 'source stream must be unique')
        sid = refs[0]; seen.add(sid)
        if sid not in authenticated:
            raise Refused('source not retained by evaluator')
        meta, records = authenticated[sid]
        if name(item['kind']).split('/')[0] == 'CR':
            raise Refused('CR is never observation evidence')
        require(item['kind'] == meta['kind'] and canonical(item['records']) == canonical(records),
                'normalized records differ from authenticated raw bytes')
        parts = name(item['kind']).split('/')
        require(len(parts) == 3, 'source.kind must have three parts')
        code, lane, source_id = parts
        base = code.split('-')[0]
        if base == 'CR':
            raise Refused('CR is never observation evidence')
        require(code in ('EI', 'EI-metric', 'EI-table', 'EI-log', 'EI-trace', 'EI-query', 'EI-replay', 'TO', 'HO', 'DR', 'HR') and lane in (engine, 'any'), 'invalid source kind/engine')
        cell = SOURCE_CELLS[protocol][('xtdb', 'qlever', 'datomic').index(engine)].split()
        root_id = source_id.split('.')[0]
        require(root_id not in origins, 'same source cannot corroborate itself under another kind')
        origins.add(root_id)
        require(root_id in cell, 'source not allowed for protocol/engine')
        if protocol == 'NO-MUTATION' and engine == 'xtdb' and root_id == 'X1':
            require(source_id == 'X1.node.tx.latestCompletedTxId', 'XTDB requires completed transaction gauge')
        require((root_id.startswith(('X', 'Q', 'D')) and base in ('EI', 'DR')) or
                (root_id.startswith('T') and base == 'TO') or
                (root_id.startswith('H') and root_id != 'HR' and base in ('HO', 'DR')) or
                (root_id == 'HR' and base == 'HR'), 'source id disagrees with kind')
        if base == 'DR':
            require(protocol in ('FAULT-TRANSITIONS', 'ERASURE-SCAN', 'SCRATCH', 'ACK-ORDER'), 'DR not allowed here')
        if base == 'HR':
            require(set(records) <= CALLER_FIELDS, 'HR cannot establish engine fields')
        for field, value in records.items():
            require(field in e and canonical(e[field]) == canonical(value), 'source disagreement: ' + field)
            fields.setdefault(field, set()).add(base)
        kinds.add(base)
    required = set(FIELDS[protocol].split()) - {'source', 'counterSource'}
    require(required <= set(fields), 'required fields not recomputed from raw bytes')
    if protocol in SAFETY:
        # [EXP-O05-R2] Why: two different kinds must corroborate engine facts, not merely coexist. Rejected: unrelated HR ACK.
        require(all(len(fields[f] - {'HR'}) >= 2 for f in engine_fields), 'two independent agreeing kinds required')
    if engine == 'datomic' and protocol in ('CANCEL', 'PREABORT'):
        require({'HO', 'TO'} <= kinds, 'Datomic read evidence requires HO plus TO')
    return 'indirect' if not kinds.intersection({'EI', 'DR'}) else 'direct'


def safe_path(root, relative):
    path = (root / name(relative)).resolve()
    require(path.is_relative_to(root.resolve()) and path.is_file(), 'missing or external bundle object')
    return path


def sha_bytes(raw):
    return hashlib.sha256(raw).hexdigest()


def authenticate(bundle_dir, context, key_file):
    """Only evaluator-owned context chooses retained objects, parsers and run identity."""
    if context is None or bundle_dir is None or key_file is None:
        raise Refused('evaluator context, obs-bundle/1 directory and external key required')
    need(context, 'format', 'runId', 'receiptId', 'protocol', 'obligation', 'case', 'witnessKind',
         'thresholdIds', 'contractSha256', 'bundleSha256', 'engine', 'keyId', 'streams',
         'witnessHeads', 'bindings', 'clockMaxUncertaintyMs')
    require(context['format'] == 'obs-context/1', 'unknown evaluator context format')
    root = Path(bundle_dir).resolve()
    bundle_path = safe_path(root, 'bundle.json')
    require(sha_bytes(bundle_path.read_bytes()) == context['bundleSha256'], 'bundle differs from retained envelope')
    bundle = load(bundle_path)
    require(bundle.get('format') == 'obs-bundle/1', 'only obs-bundle/1 is accepted')
    for field in ('runId', 'receiptId', 'keyId'):
        require(name(bundle[field]) == name(context[field]), 'bundle/context mismatch: ' + field)
    require('key' not in bundle and 'hmacKey' not in bundle, 'key must never be in bundle')
    need(bundle, 'collector', 'sut', 'clock', 'streams')
    collector = need(bundle['collector'], 'imageDigest', 'sourceSha256', 'configSha256', 'containerId',
                     'cgroupPath', 'cpuset', 'startedAtMono', 'startedAtReal')
    num(collector['startedAtMono']); num(collector['startedAtReal'])
    sut = need(bundle['sut'], 'lane', 'engineContainerId', 'engineImageDigest', 'engineConfigSha256', 'enginePids')
    for process in array(sut['enginePids']):
        need(process, 'role', 'pid', 'starttime'); name(process['role']); integer(process['pid']); integer(process['starttime'])
    require(sut['lane'] == context['engine'], 'engine/context mismatch')
    clock = need(bundle['clock'], 'domain', 'bridge', 'maxUncertaintyMs')
    require(clock['domain'] == 'vm-monotonic-ms', 'unsupported clock domain')
    uncertainty = num(clock['maxUncertaintyMs'])
    require(uncertainty <= num(context['clockMaxUncertaintyMs']), 'clock uncertainty too large')
    bridge_path = safe_path(root, clock['bridge'])
    require(sha_bytes(bridge_path.read_bytes()) == context['bridgeSha256'], 'clock bridge not retained')
    bridge = [json.loads(line) for line in bridge_path.read_text().splitlines()]
    require(bool(bridge), 'clock bridge absent')
    for sample in bridge:
        need(sample, 'send', 'receive', 'observerMono')
        require(0 <= num(sample['receive']) - num(sample['send']) <= 2 * uncertainty,
                'clock bridge exceeds declared uncertainty')
        num(sample['observerMono'])
    secret = Path(key_file).read_bytes()
    require(len(secret) == 32, 'per-run HMAC key must be 32 bytes')
    require(len(bundle['streams']) == len(context['streams']), 'stream inventory differs from retained context')
    retained = {x['streamId']: x for x in context['streams']}
    require(len(retained) == len(context['streams']), 'duplicate context stream')
    authenticated, heads, header_index = {}, {}, {}
    for stream in array(bundle['streams']):
        need(stream, 'streamId', 'kind', 'sourceId', 'endpoint', 'method', 'cadenceMs', 'normalizer')
        need(stream['normalizer'], 'id', 'version', 'sha256')
        num(stream['cadenceMs'])
        require(stream['method'] in ('scrape', 'tail', 'query', 'scan', 'capture', 'replay'), 'unknown collection method')
        sid = name(stream['streamId'])
        require(sid in retained and sid not in authenticated, 'unknown/duplicate stream')
        policy = retained[sid]
        for field in ('kind', 'sourceId', 'normalizer'):
            require(stream[field] == policy[field], 'stream policy differs from evaluator context')
        require(stream['kind'].split('/')[-1] == stream['sourceId'], 'source id mismatch')
        chunks = array(policy['chunks']); payloads = []; previous = None; end = -1
        for seq, entry in enumerate(chunks):
            header_path = safe_path(root, entry['header'])
            header_bytes = header_path.read_bytes(); header = load(header_path)
            raw = safe_path(root, entry['raw']).read_bytes()
            require(sha_bytes(header_bytes) == entry['headerSha256'], 'header not retained')
            require(header['streamId'] == sid and integer(header['seq']) == seq, 'chunk sequence gap')
            require(header['prevHeaderSha256'] == previous, 'broken chunk chain')
            require(integer(header['byteLength']) == len(raw) and header['sha256'] == sha_bytes(raw), 'raw chunk mismatch')
            require(end <= num(header['tStartMono']) <= num(header['tEndMono']), 'chunk time order')
            end = header['tEndMono']; num(header['tStartReal'])
            unsigned = {k: v for k, v in header.items() if k != 'hmac'}
            expected = hmac.new(secret, canonical(unsigned).encode(), hashlib.sha256).hexdigest()
            require(hmac.compare_digest(expected, name(header['hmac'])), 'chunk HMAC mismatch')
            previous = sha_bytes(header_bytes); payloads.append(raw)
            header_index[(sid, seq)] = previous
        heads[sid] = previous
        normalizer = stream['normalizer']
        # [EXP-O05-R2] Why: execute only a parser selected and hash-pinned by the evaluator. Rejected: bundle-supplied executable.
        script = Path(policy['normalizerPath']).resolve()
        require(not script.is_relative_to(root), 'normalizer must be evaluator-owned outside bundle')
        require(sha_bytes(script.read_bytes()) == normalizer['sha256'], 'normalizer hash mismatch')
        proc = subprocess.run([sys.executable, '-I', '-B', str(script)], input=b''.join(payloads),
                              capture_output=True, timeout=30)
        require(proc.returncode == 0, 'normalizer refused raw stream')
        records = json.loads(proc.stdout); need(records)
        authenticated[sid] = (stream, records)
    witnessed = set()
    for witness in array(context['witnessHeads']):
        require(witness['runId'] == context['runId'], 'witness run mismatch')
        sid = witness['streamId']; seq = integer(witness['seq']); num(witness['tMono'])
        require(header_index.get((sid, seq)) == witness['headSha256'], 'independent witness head mismatch')
        if seq == len(retained[sid]['chunks']) - 1:
            witnessed.add(sid)
    require(witnessed == set(heads), 'final independent witness missing')
    seal = load(safe_path(root, 'seal.json'))
    unsigned = {k: v for k, v in seal.items() if k != 'hmac'}
    require(unsigned == {'runId': context['runId'], 'heads': heads}, 'seal heads mismatch')
    require(hmac.compare_digest(hmac.new(secret, canonical(unsigned).encode(), hashlib.sha256).hexdigest(),
                                name(seal['hmac'])), 'seal HMAC mismatch')
    return authenticated, uncertainty


class Judge:
    def __init__(self, contract, context):
        self.contract = need(contract, 'thresholds', 'obligations', 'obsProtocols')
        self.used = {}
        self.context = context
        self.authenticated = {}
        self.clock = ClockBounds(0)
        self.workThreshold = None

    def threshold(self, key, allowed=None):
        if allowed is not None:
            require(key in allowed, 'threshold not allowed for this protocol')
        rows = self.contract['thresholds']
        if key not in rows:
            raise Refused('CONTRACT-AMBIGUITY: missing threshold ' + key)
        require(key in self.context['thresholdIds'], 'threshold not selected by evaluator case')
        row = need(rows[key], 'value', 'bound')
        num(row['value'])
        require(row['bound'] in ('max', 'min', 'eq'), 'unsupported threshold bound')
        self.used[key] = row
        return row['value']

    def bound(self, value, key, allowed):
        limit = self.threshold(key, allowed)
        op = self.used[key]['bound']
        require({'max': value <= limit, 'min': value >= limit, 'eq': value == limit}[op],
                'threshold exceeded: ' + key)

    def cancel(self, e):
        name(e['requestId']); name(e['connectionId']); name(e['reuseQueryId'])
        reuse = need(e['reuseResult'], 'queryId', 'connectionId', 'outcome', 't')
        require(all(reuse[k] == v for k, v in {'queryId': e['reuseQueryId'], 'connectionId': e['connectionId'],
                          'outcome': 'success', 't': e['tReuseOk']}.items()), 'successful reuse record missing')
        start, drained = num(e['tCancelRequested']), num(e['tDrained'])
        require(e['expectedError'] in ('E-CANCELLED', 'E-TIMEOUT') and e['callerError'] == e['expectedError'],
                'caller error differs from case-pinned error')
        require(self.clock.le(start, e['tCallerSettled']) and self.clock.le(e['tCallerSettled'], e['tReuseOk']), 'caller/reuse time order')
        require(self.clock.within(start, drained, self.threshold('T-DRAIN-MS')), 'drain deadline missed')
        ack = need(e['transportAck'], 'kind', 't')
        require(ack['kind'] in ('cancel-ack', 'close-ack') and self.clock.le(start, ack['t']) and self.clock.le(ack['t'], drained),
                'transport acknowledgement absent or late')
        self.clock.coverage(e['engineActiveSamples'], start, drained + 5000, 1000)
        for s in e['engineActiveSamples']:
            ids = array(need(s, 'activeQueryIds')['activeQueryIds'], False)
            for q in ids:
                name(q)
            if not self.clock.lt(s['t'], drained):
                require(e['requestId'] not in ids, 'query still active after drain')
        require(e['reuseConnectionId'] == e['connectionId'] and e['reuseQueryId'] != e['requestId']
                and self.clock.le(drained, e['tReuseOk']), 'same-connection successful reuse missing')
        if e['expectedError'] == 'E-TIMEOUT':
            need(e, 'tDeadline')
            require(self.clock.le(start, e['tDeadline']) and self.clock.within(e['tDeadline'], e['tCallerSettled'],
                    self.threshold('T-DEADLINE-GRACE-MS')), 'timeout grace missed')
            require(e['source']['records'].get('tDeadline') == e['tDeadline'], 'deadline not source-bound')

    def preabort(self, e):
        name(e['requestId'])
        c = need(e['coverage'], 'from', 'to', 'maxGapMs', 'segments')
        lo, hi = num(c['from']), num(c['to'])
        require(self.clock.lt(lo, hi), 'empty coverage window')
        require(num(c['maxGapMs']) == 0, 'statement log coverage must be complete')
        end = lo
        for s in array(c['segments']):
            need(s, 'from', 'to')
            require(self.clock.le(s['from'], end) and self.clock.lt(end, s['to']), 'statement log coverage hole')
            end = s['to']
        require(self.clock.le(hi, end), 'statement log coverage incomplete')
        for s in array(e['engineStatementLog'], False):
            need(s, 't', 'tag'); name(s['tag'])
            require(self.clock.le(lo, s['t']) and self.clock.le(s['t'], hi), 'statement outside coverage')
            require(s['tag'] != e['requestId'], 'preaborted request reached engine')

    def connections(self, e):
        limits = {}
        for d in array(e['poolDeclarations']):
            need(d, 'label', 'max'); label = name(d['label'])
            require(label not in limits, 'duplicate pool label')
            limits[label] = integer(d['max'])
        require(set(need(e['baseline'])) == set(limits), 'baseline must cover exactly declared pools')
        deadline = num(e['tClose']) + self.threshold('T-CONN-RELEASE-MS')
        samples = {label: [] for label in limits}
        for s in array(e['engineConnectionSamples']):
            need(s, 't', 'label', 'count'); num(s['t']); integer(s['count'])
            require(s['label'] in limits, 'undeclared engine pool')
            require(s['count'] <= limits[s['label']], 'pool maximum exceeded')
            samples[s['label']].append(s)
        for label, rows in samples.items():
            base = integer(e['baseline'][label]); require(base <= limits[label], 'baseline exceeds pool max')
            self.clock.times(rows)
            require(any(self.clock.within(e['tClose'], s['t'], self.threshold('T-CONN-RELEASE-MS')) and s['count'] == base for s in rows),
                    'pool did not return to baseline by deadline: ' + label)
            require(all(s['count'] == base for s in rows if not self.clock.le(s['t'], deadline)), 'pool leaked after release')

    def scratch(self, e):
        name(e['relation']); integer(e['countBefore']); integer(e['countAfter'])
        require(e['countBefore'] == e['countAfter'], 'scratch relation count changed')
        unknown = array(e['unknownOutcomes'], False)
        require(len(set(unknown)) == len(unknown), 'duplicate unknown outcome')
        resolved = {}
        for r in array(e['resolutionReceipts'], False):
            need(r, 'workingId', 'outcome', 'receiptId'); name(r['receiptId']); name(r['workingId'])
            require(r['outcome'] in ('committed', 'aborted'), 'unresolved working outcome')
            require(r['workingId'] not in resolved, 'duplicate resolution')
            resolved[r['workingId']] = r
        require(set(unknown) == set(resolved), 'unknown outcomes not exactly resolved')

    def no_mutation(self, e):
        require(integer(e['engineMutationCounterBefore']) == integer(e['engineMutationCounterAfter']),
                'engine mutation counter changed')

    def resource(self, e):
        for r in (e['forecast'], e['envelope']):
            need(r, 'memory', 'disk'); num(r['memory']); num(r['disk'])
        f, cap = e['forecast'], e['envelope']
        require(all(f[k] <= cap[k] for k in ('memory', 'disk')), 'forecast exceeds envelope')
        owners = array(need(cap, 'owners')['owners'])
        require(len(set(owners)) == len(owners), 'duplicate resource owner')
        grouped = {}
        for p in array(e['peaks']):
            need(p, 'owner', 'rss', 'disk', 't'); name(p['owner'])
            t = num(p['t']); rss, disk = num(p['rss']), num(p['disk'])
            require(p['owner'] in owners, 'undeclared resource owner')
            group = grouped.setdefault(t, {})
            require(p['owner'] not in group, 'duplicate owner sample')
            group[p['owner']] = (rss, disk)
        for group in grouped.values():
            require(set(group) == set(owners), 'resource sample misses an owner')
            require(sum(v[0] for v in group.values()) <= f['memory']
                    and sum(v[1] for v in group.values()) <= f['disk'], 'observed total exceeds forecast')
        # [EXP-O05] Why: the selected obligation names the planner bar. Rejected: evidence-supplied limit (can be loosened).
        require(e['obligation'] == self.context['obligation'], 'obligation differs from evaluator case')
        if 'obligation' in e:
            rows = [o for o in self.contract['obligations'] if o['id'] == e['obligation']]
            require(len(rows) == 1, 'unknown obligation')
            if 'T-PLANNER-MEM-BYTES' in rows[0]['thresholds']:
                require(f['memory'] <= self.threshold('T-PLANNER-MEM-BYTES'), 'planner memory limit exceeded')

    def availability(self, e):
        start = num(e['tFailure']); end = start + self.threshold('T-AVAIL-WINDOW-MS')
        for event in array(e['events'], False):
            need(event, 'kind', 't'); num(event['t']); name(event['kind'])
            require(not (event['kind'] == 'manual-restart' and not self.clock.lt(event['t'], start)), 'manual restart observed')
        successes = set()
        for p in array(e['probes']):
            need(p, 't', 'kind', 'outcome'); num(p['t'])
            require(p['kind'] in ('write', 'read') and p['outcome'] in ('success', 'failure'), 'invalid probe')
            if self.clock.within(start, p['t'], self.threshold('T-AVAIL-WINDOW-MS')) and p['outcome'] == 'success':
                successes.add(p['kind'])
        require(successes == {'write', 'read'}, 'read and write availability not restored')

    def scale_count(self, e):
        p = need(e['population'], 'generator', 'n', 'width')
        if p['generator'] != 'configured-entities-v1':
            raise Refused('X-NOT-MODELED: O-REPLAY analytic generator')
        n, width = integer(p['n']), integer(p['width'])
        require(1 <= n <= 10000000 and width in (1, 10), 'unsupported analytic population')
        case = {'format': 'triplex-db-2/o-replay-case/1', 'caseId': 'o-obs-count',
                'defaultScope': 'count', 'adapter': {'schemaVersion': 1}, 'commands': [], 'receipts': [],
                'queries': [{'id': 'count', 'kind': 'analyticCounts', 'n': n, 'width': width}]}
        # [EXP-O05] Why: independent oracle runs isolated as a process. Rejected: import scale.py (shared runtime/logic).
        with tempfile.TemporaryDirectory(prefix='o-obs-') as tmp:
            path = Path(tmp) / 'case.json'; path.write_text(canonical(case))
            proc = subprocess.run([sys.executable, '-I', '-B', str(ROOT / 'lab/oracles/replay/cli.py'), str(path)],
                                  capture_output=True, text=True, timeout=30)
        if proc.returncode != 0:
            raise Refused('O-REPLAY process refused population')
        result = json.loads(proc.stdout)
        expected = result['queries'][0]['result']
        require(canonical(e['analyticCount']) == canonical(expected), 'supplied analytic count differs from O-REPLAY')
        require(canonical(e['countQueryCaseResult']) == canonical(expected), 'engine counts differ from O-REPLAY')

    def work(self, e):
        name(e['operation']); c = need(e['comparison'], 'operation', 'engineWorkUnits'); name(c['operation'])
        require(c['operation'] != e['operation'], 'comparison must name a different operation')
        units = ('rowsScanned', 'rowsWritten', 'triplesTouched', 'bytesWritten')
        a, b = need(e['engineWorkUnits'], *units), need(c['engineWorkUnits'], *units)
        ratios = []
        for k in units:
            x, y = integer(a[k]), integer(b[k])
            require(y != 0 or x == 0, 'work increased from zero baseline: ' + k)
            if y:
                ratios.append((x, y))
        require(bool(ratios), 'zero-work baseline is not a witness')
        key = self.workThreshold
        require(e['threshold'] == key, 'evidence selected a different threshold')
        limit = Fraction(str(self.threshold(key, {'T-REUSE-AVOIDED', 'T-INCR-WORK'})))
        require(self.used[key]['bound'] == 'max', 'work requires maximum ratio threshold')
        require(all(x * limit.denominator <= y * limit.numerator for x, y in ratios), 'exact work ratio exceeded: ' + key)

    def maintenance(self, e):
        require(e['kind'] in ('compaction', 'index-rebuild', 'delta-merge', 'index-catch-up'), 'unknown maintenance kind')
        lo, hi = num(e['tStart']), num(e['tEnd']); require(self.clock.lt(lo, hi), 'empty maintenance interval')
        events = array(e['events'])
        for event in events:
            need(event, 'kind', 't'); num(event['t'])
        require(any(s['kind'] == 'start' and s['t'] == lo for s in events)
                and any(s['kind'] == 'end' and s['t'] == hi for s in events), 'maintenance events absent')
        self.clock.coverage(e['lagSamples'], lo, hi, 1000)
        lags = sorted(self.clock.upper_duration(need(s, 'lagMs')['lagMs']) for s in e['lagSamples']
                      if not self.clock.lt(s['t'], lo) and not self.clock.lt(hi, s['t']))
        require(bool(lags), 'no in-window lag samples')
        require(e['threshold'] == self.context['selectedThreshold'], 'threshold differs from evaluator case')
        self.bound(lags[(99 * len(lags) + 99) // 100 - 1], self.context['selectedThreshold'], {'NS-P3-LAG-P99-MS'})

    def erasure_scan(self, e):
        inventory = array(self.context.get('scanInventory'))
        require(set(self.contract.get('protectedCopyInventory', [])) <= {x['category'] for x in inventory}, 'inventory lacks contract categories')
        require({'observer outputs', 'old index generations', 'freed blocks'} <= {x['category'] for x in inventory}, 'inventory lacks Q82d copy classes')
        locations = {x['id']: x for x in inventory}
        require(len(locations) == len(inventory), 'duplicate inventory location')
        rows = array(e['scans']); seen = set(); published = num(e['tErasurePublished'])
        fields = 'inventoryEntry location scanMethod plaintextHits derivedChannelHits keyDestroyedEvidence tScan'.split()
        for r in rows:
            need(r, *fields); label = name(r['inventoryEntry']); name(r['location']); name(r['scanMethod'])
            require(label in locations and label not in seen, 'unknown or duplicate protected location')
            location = locations[label]
            require(r['location'] == location['location'] and r['scanMethod'] == location['scanMethod'], 'scan location/method differs from evaluator inventory')
            control = need(r.get('positiveControl'), 'canary', 'tWritten', 'tFound', 'hits', 'scanMethod', 'location')
            if not (control['canary'] == location['canary'] and integer(control['hits']) > 0 and
                    self.clock.le(control['tWritten'], control['tFound']) and self.clock.lt(control['tFound'], published) and
                    control['scanMethod'] == r['scanMethod'] and control['location'] == r['location']):
                raise Refused('scanner blind: positive canary control missing')
            seen.add(label)
            require(self.clock.lt(published, r['tScan']), 'scan did not follow erasure publication')
            plain, derived = integer(r['plaintextHits']), integer(r['derivedChannelHits'])
            if plain or derived:
                raise Failed('protected plaintext or derived channel survives')
            key = r['keyDestroyedEvidence']
            if key is not None:
                need(key, 'subjectKey', 'destroyedKey', 'tDestroyed', 'survivingCopies')
                require(name(key['subjectKey']) == name(key['destroyedKey']) and self.clock.le(key['tDestroyed'], r['tScan']),
                        'wrong destroyed subject key or destruction after scan')
                for copy in array(key['survivingCopies']):
                    need(copy, 'id', 'encryptionKeys'); name(copy['id'])
                    require(copy['encryptionKeys'] == [key['destroyedKey']], 'surviving copy not exclusive to destroyed key')
        require(seen == set(locations), 'protected copy inventory not fully scanned')
        require(any(all(canonical(r[k]) == canonical(e[k]) for k in fields) for r in rows), 'primary scan not in inventory scans')

    def watermark(self, e):
        name(e['readId']); name(e['servingIndex']); name(e['surfaceLanguage'])
        require(e['route'] in ('index', 'fallback'), 'unknown read route')
        events = need(e['waitEvents'], 'start', 'end')
        start, end = events['start'], events['end']
        require(start['kind'] == 'read-start' and end['kind'] == 'engine-request' and
                start['readId'] == end['readId'] == e['readId'], 'wait event identity mismatch')
        require(num(start['t']) == e['tReadStart'] and num(end['t']) == e['tRouteStart'], 'wait event time mismatch')
        actual = num(end['t']) - num(start['t'])
        require(actual >= 0 and e['waitMs'] == actual, 'duration label differs from source events')
        require(self.clock.within(start['t'], end['t'], self.threshold('T-WATERMARK-WAIT-MS')), 'watermark wait exceeded')
        require(self.clock.le(e['tReadStart'], e['tRouteStart']) and self.clock.le(e['tRouteStart'], e['tRouteEnd'])
                and self.clock.le(e['tRouteEnd'], e['tReadEnd']),
                'route latency excluded from read latency')
        if e['route'] == 'fallback':
            require(name(e['fallbackIndex']) == e['servingIndex'], 'fallback identity differs from serving index')
        else:
            require(e['fallbackIndex'] is None, 'unexpected fallback index')
        self.eligible(e['basisPosition'], e['watermarkAtRead'], e['servingIndex'], e['eligibility'])

    def eligible(self, basis, watermark, index, x):
        need(x, 'index', 'publishedPositions', 'resolutions', 'scopeOwner', 'queryScope', 'mappingGeneration',
             'queryMappingGeneration', 'validInstant', 'validFrom', 'validTo', 'exactCut', 'queryCut',
             'reconstructFrom', 'reconstructTo', 'erasurePublished', 'erasureApplied', 'snapshot',
             'recordedTimeBound', 'markerState', 'partialOrConflictedReferenced', 'attributes', 'queriedAttributes')
        require(x['index'] == index, 'eligibility belongs to another index')
        require(x['recordedTimeBound'] is None and x['markerState'] == 'complete'
                and x['partialOrConflictedReferenced'] is False, 'C1 projection eligibility unavailable')
        attrs = array(x['attributes']); queried = array(x['queriedAttributes'])
        require(len(set(queried)) == len(queried), 'duplicate queried attribute')
        seen = set()
        for attr in attrs:
            need(attr, 'name', 'from', 'to'); name(attr['name'])
            require(attr['name'] not in seen, 'duplicate attribute interval')
            seen.add(attr['name'])
            require(reached(basis, attr['from']) and reached(attr['to'], basis), 'attribute cannot reconstruct basis')
        require(seen == set(queried), 'reconstructability does not cover every queried attribute')
        require(reached(watermark, basis), 'watermark below basis or wrong stream/epoch')
        positions = array(x['publishedPositions'])
        resolutions = array(x['resolutions']); resolved = {}
        for r in resolutions:
            need(r, 'position', 'outcome'); k = canonical(r['position'])
            require(r['outcome'] in ('applied', 'aborted') and k not in resolved, 'bad prefix resolution')
            resolved[k] = r['outcome']
        require(len({canonical(p) for p in positions}) == len(positions), 'duplicate published position')
        require(any(canonical(p) == canonical(basis) for p in positions), 'basis absent from publication log')
        for p in positions:
            position(p)
            if reached(watermark, p):
                require(canonical(p) in resolved, 'watermark crosses unresolved position')
        require(resolved.get(canonical(basis)) == 'applied', 'basis is not applied')
        require(name(x['scopeOwner']) == name(x['queryScope'])
                and integer(x['mappingGeneration']) == integer(x['queryMappingGeneration']), 'C1 scope/mapping mismatch')
        require(num(x['validFrom']) <= num(x['validInstant']) < num(x['validTo']), 'C1 valid time outside interval')
        require(canonical(x['exactCut']) == canonical(x['queryCut']) == canonical(basis), 'C1 exact cut mismatch')
        require(reached(basis, x['reconstructFrom']) and reached(x['reconstructTo'], basis), 'basis not reconstructible')
        require(reached(x['erasureApplied'], x['erasurePublished']), 'erasure frontier behind')
        snap = need(x['snapshot'], 'mode', 'before', 'answer', 'after')
        for row in (snap['before'], snap['answer'], snap['after']):
            need(row, 'incarnation', 'marker'); name(row['incarnation']); position(row['marker'])
        require(snap['mode'] in ('single-request', 'incarnation-fenced')
                and all((snap[k]['incarnation'], canonical(snap[k]['marker'])) ==
                        (snap['answer']['incarnation'], canonical(snap['answer']['marker'])) for k in ('before', 'after'))
                and snap['answer']['marker'] == watermark, 'answer snapshot/incarnation not fenced')

    def ack_order(self, e):
        position(e['commitPosition'])
        require(self.clock.le(e['tSourcePublished'], e['tAck']), 'ACK preceded source publication')
        require(name(e['ackSender']) == name(e['sourceOfTruth']), 'ACK sender is not source of truth')
        pull = need(e['ryowPullRoute'])
        need(pull, *FIELDS['WATERMARK'].split())
        source(pull, 'WATERMARK', self.authenticated, self.context['engine'])
        require(pull['basisPosition'] == e['commitPosition'] and self.clock.le(e['tAck'], pull['tReadStart']), 'pull not at returned commit')
        self.watermark(pull)

    def fault_transitions(self, e):
        crash = num(e['tCrash']); previous = None; last = None
        variants = need(self.contract.get('commitOutcomes'), 'log-source', 'engine-source')
        require(e['variant'] == self.context['variant'] and e['variant'] in ('log-source', 'engine-source'), 'variant differs from evaluator context')
        allowed = {row['id'] for row in variants[e['variant']]['transitions']}
        for row in array(e['transitions']):
            need(row, 'transition', 't', 'durableEvidenceObject'); name(row['transition'])
            require(row['transition'] in allowed, 'transition outside contract variant')
            t = num(row['t']); require((previous is None or self.clock.lt(previous, t)) and self.clock.le(t, crash), 'transition time order'); previous = t
            obj = row['durableEvidenceObject']
            require(obj is not None, 'declared transition has no witness')
            if obj is not None:
                need(obj, 'sha256', 'record', 'tReadBack')
                require(self.clock.lt(crash, obj['tReadBack']), 'durability not read back after crash')
                record = need(obj['record'], 'transition', 't')
                require(digest(record) == obj['sha256'] and record['transition'] == row['transition']
                        and record['t'] == t, 'durable record does not witness transition')
                self.transition_witness(row['transition'], record, obj)
                last = row
        require(last is not None, 'no durable transition witnessed')
        require(all(canonical(e[k]) == canonical(last[k]) for k in ('transition', 't', 'durableEvidenceObject')),
                'claimed transition is not last durable transition')

    def transition_witness(self, transition, record, obj):
        # [EXP-O05-R2] Why: concrete readback facts prove each state. Rejected: a transition label/hash as its own witness (F3).
        facts = need(record.get('facts'))
        expected = self.context['transitionExpectations'][transition]
        need(expected, 'operationId', 'position', 'facts')
        need(expected['facts'])
        require(record['operationId'] == expected['operationId'] and record['position'] == expected['position'],
                'fault witness operation/position differs from case')
        schemas = {
            'QT0-RECEIVED': {'requestPresent': True},
            'QT1-VALIDATED': {'accepted': True},
            'QT2-LOGGED': {'recordType': 'COMMIT', 'decision': 'commit', 'durable': True},
            'QT3-APPLY-SENT': {'updateSent': True},
            'QT4s-SOURCE-PUBLISHED': {'decisionDurable': True, 'sourceReadable': True},
            'QT4r-REPLICA-APPLIED': {'markerVisible': True},
            'QT5-VERIFIED': {},
            'QT6-ACKED': {'callerOutcome': 'success'},
            'XT0-RECEIVED': {'requestPresent': True},
            'XT1-BEGIN-SENT': {'beginSent': True},
            'XT2-ENGINE-COMMITTED': {'committed': True, 'operationMarkerPresent': True},
            'XT3-ACKED': {'callerOutcome': 'success'},
        }
        for field, value in schemas[transition].items():
            require(field in facts and type(facts[field]) is type(value) and facts[field] == value,
                    'transition witness lacks fact: ' + field)
        structures = {
            'QT0-RECEIVED': ('request',), 'QT1-VALIDATED': ('request', 'validation'),
            'QT2-LOGGED': ('commitRecord',), 'QT3-APPLY-SENT': ('updateRequest',),
            'QT4s-SOURCE-PUBLISHED': ('commitRecord', 'sourceReadback'),
            'QT4r-REPLICA-APPLIED': ('marker',), 'QT5-VERIFIED': ('accessPaths',),
            'QT6-ACKED': ('receipt',), 'XT0-RECEIVED': ('request',),
            'XT1-BEGIN-SENT': ('beginRequest',), 'XT2-ENGINE-COMMITTED': ('transaction', 'marker'),
            'XT3-ACKED': ('receipt',),
        }
        for field in structures[transition]:
            value = need(facts.get(field))
            if field != 'accessPaths':
                require(value.get('operationId') == expected['operationId'], 'witness payload operation mismatch')
            if field in ('commitRecord', 'marker', 'transaction', 'receipt', 'sourceReadback'):
                require(value.get('position') == expected['position'], 'witness payload position mismatch')
            if field == 'commitRecord':
                require(value.get('type') == 'COMMIT' and isinstance(value.get('effects'), list) and bool(value['effects']),
                        'COMMIT readback missing concrete effects')
            if field == 'sourceReadback':
                need(value, 'effects', 'absences')
        # [EXP-O05-R3] Why: every transition must prove expected contents. Rejected: comparing only QT4s (R2-F1).
        require(canonical(facts) == canonical(expected['facts']), 'readback facts differ from case expectations')
        if transition == 'QT5-VERIFIED':
            paths = need(facts, 'accessPaths')['accessPaths']
            require(set(paths) == {'eav', 'ave', 'vea'}, 'verification requires three access paths')
            for result in paths.values():
                need(result, 'effects', 'absences')
                array(result['effects'], False); array(result['absences'], False)
                require(canonical(result) == canonical(paths['eav']), 'verification access paths disagree')
        require(obj['readbackOperationId'] == expected['operationId'] and obj['readbackPosition'] == expected['position'],
                'post-crash readback identity mismatch')


def position(p):
    if type(p) is int:
        return ('dense', integer(p))
    need(p, 'stream', 'epoch', 'offset', 'ordinal')
    return (name(p['stream']), integer(p['epoch']), integer(p['offset']), integer(p['ordinal']))


def reached(a, b):
    ka, kb = position(a), position(b)
    if len(ka) != len(kb) or ka[0] != kb[0]:
        return False
    if len(ka) == 4 and ka[1] != kb[1]:
        return False
    return ka >= kb


def check(protocol, evidence, contract, context=None, bundle_dir=None, key_file=None):
    judge = None
    try:
        key = protocol.removeprefix('OBS-')
        if protocol != 'OBS-' + key or key not in FIELDS:
            raise Invalid('unknown observation protocol')
        need(evidence)
        try:
            authenticated, uncertainty = authenticate(bundle_dir, context, key_file)
        except Failed as error:
            raise Refused('UNTRUSTED-BUNDLE: ' + str(error)) from error
        require(CASE_FIELDS[key] <= set(context['bindings']), 'evaluator case bindings incomplete')
        require(context['protocol'] == protocol and digest(contract) == context['contractSha256'], 'contract/protocol context mismatch')
        if key == 'CANCEL' and evidence.get('expectedError') == 'E-TIMEOUT':
            require('tDeadline' in context['bindings'], 'timeout deadline missing from evaluator case')
        for field in ('obligation', 'case', 'witnessKind', 'runId'):
            name(context[field])
        obligations = [o for o in contract['obligations'] if o['id'] == context['obligation']]
        require(len(obligations) == 1, 'unknown evaluator obligation')
        selected_work = work_selection(obligations[0], context) if key == 'WORK' else None
        if not set(obligations[0]['thresholds']) <= set(context['thresholdIds']):
            raise Refused('CONTEXT-CONTRADICTION: context omitted obligation thresholds')
        for field, expected in need(context['bindings']).items():
            require(field in evidence and canonical(evidence[field]) == canonical(expected), 'case input mismatch: ' + field)
        if key != 'WORK':
            require(context['witnessKind'] == key, 'witness kind differs from protocol')
        judge = Judge(contract, context)
        judge.authenticated, judge.clock = authenticated, ClockBounds(uncertainty)
        judge.workThreshold = selected_work
        if protocol not in contract['obsProtocols']:
            raise Refused('protocol missing from selected contract')
        need(evidence, *FIELDS[key].split())
        strength = source(evidence, key, authenticated, context['engine'])
        getattr(judge, key.lower().replace('-', '_'))(evidence)
        verdict, reasons, status = 'PASS', [], 0
    except Refused as error:
        verdict, reasons, status = 'REFUSED', [str(error)], 2
    except Failed as error:
        verdict, reasons, status = 'FAIL', [str(error)], 1
    except (Invalid, ValueError, TypeError, KeyError, OverflowError, RecursionError, OSError, subprocess.SubprocessError) as error:
        verdict, reasons, status = 'REFUSED', ['MALFORMED: ' + str(error)], 2
    return {'protocol': protocol, 'verdict': verdict, 'reasons': reasons,
            'thresholds': judge.used if judge else {},
            'sourceStrength': locals().get('strength'), 'qualification': 'screening-only'}, status


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['check'])
    parser.add_argument('protocol')
    parser.add_argument('evidence')
    parser.add_argument('--contract', required=True)
    parser.add_argument('--context')
    parser.add_argument('--bundle')
    parser.add_argument('--key-file')
    args = parser.parse_args()
    try:
        report, status = check(args.protocol, load(args.evidence), load(args.contract),
                               load(args.context) if args.context else None, args.bundle, args.key_file)
    except (ValueError, TypeError, RecursionError, OSError) as error:
        report, status = {'protocol': args.protocol, 'verdict': 'REFUSED',
                          'reasons': ['MALFORMED: ' + str(error)], 'thresholds': {}}, 2
    print(canonical(report))
    return status


if __name__ == '__main__':
    sys.exit(main())

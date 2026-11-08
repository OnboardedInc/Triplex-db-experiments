"""EXP-O05: independent, stdlib-only observation evidence evaluator."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path('/Users/sam/projects/triplex-db-2/.claude/worktrees/verify-o05')
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
    'WATERMARK': 'readId basisPosition servingIndex watermarkAtRead waitMs route fallbackIndex eligibility surfaceLanguage tReadStart tReadEnd tRouteStart tRouteEnd source',
    'ACK-ORDER': 'commitPosition tSourcePublished tAck ackSender ryowPullRoute sourceOfTruth source',
    'FAULT-TRANSITIONS': 'transition t durableEvidenceObject transitions tCrash variant source',
}
KINDS = {
    'CANCEL': {'engine-active-query-log'}, 'PREABORT': {'engine-statement-log'},
    'CONNECTIONS': {'engine-connection-samples'}, 'SCRATCH': {'engine-relation-scan'},
    'NO-MUTATION': {'engine-committed-transaction-counter', 'engine-update-counter'},
    'RESOURCE': {'resource-owner-samples'}, 'AVAILABILITY': {'engine-probe-log'},
    'SCALE-COUNT': {'engine-count-query'}, 'WORK': {'engine-work-counters'},
    'MAINTENANCE': {'engine-maintenance-log'}, 'ERASURE-SCAN': {'protected-copy-scan'},
    'WATERMARK': {'engine-read-snapshot'}, 'ACK-ORDER': {'source-publication-log'},
    'FAULT-TRANSITIONS': {'post-crash-durable-readback'},
}


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


def coverage(samples, start, end, gap):
    ts = times(samples)
    require(ts[0] <= start and ts[-1] >= end, 'samples do not cover required window')
    require(all(b - a <= gap for a, b in zip(ts, ts[1:]) if b > start and a < end),
            'sample coverage gap')


def source(e, protocol):
    key = 'counterSource' if protocol == 'NO-MUTATION' else 'source'
    s = need(e[key], 'kind', 'records', 'sha256')
    require(s['kind'] in KINDS[protocol], 'unaccepted engine evidence source')
    # [EXP-O05] Why: retain and bind record contents, not source labels. Rejected: kind-only proof (forgeable empty PASS).
    records = need(s['records'])
    require(digest(records) == s['sha256'], 'source record digest mismatch')
    for field in FIELDS[protocol].split():
        if field not in ('source', 'counterSource'):
            require(field in records and canonical(records[field]) == canonical(e[field]),
                    'source records do not bind ' + field)


class Judge:
    def __init__(self, contract):
        self.contract = need(contract, 'thresholds', 'obligations', 'obsProtocols')
        self.used = {}

    def threshold(self, key, allowed=None):
        if allowed is not None:
            require(key in allowed, 'threshold not allowed for this protocol')
        rows = self.contract['thresholds']
        if key not in rows:
            raise Refused('CONTRACT-AMBIGUITY: missing threshold ' + key)
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
        require(start <= num(e['tCallerSettled']) <= num(e['tReuseOk']), 'caller/reuse time order')
        require(0 <= drained - start <= self.threshold('T-DRAIN-MS'), 'drain deadline missed')
        ack = need(e['transportAck'], 'kind', 't')
        require(ack['kind'] in ('cancel-ack', 'close-ack') and start <= num(ack['t']) <= drained,
                'transport acknowledgement absent or late')
        coverage(e['engineActiveSamples'], start, drained + 5000, 1000)
        for s in e['engineActiveSamples']:
            ids = array(need(s, 'activeQueryIds')['activeQueryIds'], False)
            for q in ids:
                name(q)
            if s['t'] >= drained:
                require(e['requestId'] not in ids, 'query still active after drain')
        require(e['reuseConnectionId'] == e['connectionId'] and e['reuseQueryId'] != e['requestId']
                and num(e['tReuseOk']) >= drained, 'same-connection successful reuse missing')
        if e['expectedError'] == 'E-TIMEOUT':
            need(e, 'tDeadline')
            require(start <= num(e['tDeadline']) <= e['tCallerSettled']
                    <= e['tDeadline'] + self.threshold('T-DEADLINE-GRACE-MS'), 'timeout grace missed')
            require(e['source']['records'].get('tDeadline') == e['tDeadline'], 'deadline not source-bound')

    def preabort(self, e):
        name(e['requestId'])
        c = need(e['coverage'], 'from', 'to', 'maxGapMs', 'segments')
        lo, hi = num(c['from']), num(c['to'])
        require(lo < hi, 'empty coverage window')
        require(num(c['maxGapMs']) == 0, 'statement log coverage must be complete')
        end = lo
        for s in array(c['segments']):
            need(s, 'from', 'to')
            require(num(s['from']) <= end < num(s['to']), 'statement log coverage hole')
            end = s['to']
        require(end >= hi, 'statement log coverage incomplete')
        for s in array(e['engineStatementLog'], False):
            need(s, 't', 'tag'); name(s['tag'])
            require(lo <= num(s['t']) <= hi, 'statement outside coverage')
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
            times(rows)
            require(any(e['tClose'] <= s['t'] <= deadline and s['count'] == base for s in rows),
                    'pool did not return to baseline by deadline: ' + label)
            require(all(s['count'] == base for s in rows if s['t'] > deadline), 'pool leaked after release')

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
        if 'obligation' in e:
            rows = [o for o in self.contract['obligations'] if o['id'] == e['obligation']]
            require(len(rows) == 1, 'unknown obligation')
            if 'T-PLANNER-MEM-BYTES' in rows[0]['thresholds']:
                require(f['memory'] <= self.threshold('T-PLANNER-MEM-BYTES'), 'planner memory limit exceeded')

    def availability(self, e):
        start = num(e['tFailure']); end = start + self.threshold('T-AVAIL-WINDOW-MS')
        for event in array(e['events'], False):
            need(event, 'kind', 't'); num(event['t']); name(event['kind'])
            require(not (event['kind'] == 'manual-restart' and event['t'] >= start), 'manual restart observed')
        successes = set()
        for p in array(e['probes']):
            need(p, 't', 'kind', 'outcome'); num(p['t'])
            require(p['kind'] in ('write', 'read') and p['outcome'] in ('success', 'failure'), 'invalid probe')
            if start <= p['t'] <= end and p['outcome'] == 'success':
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
                ratios.append(x / y)
        require(bool(ratios), 'zero-work baseline is not a witness')
        self.bound(max(ratios), e['threshold'], {'T-REUSE-AVOIDED', 'T-INCR-WORK'})

    def maintenance(self, e):
        require(e['kind'] in ('compaction', 'index-rebuild', 'delta-merge', 'index-catch-up'), 'unknown maintenance kind')
        lo, hi = num(e['tStart']), num(e['tEnd']); require(lo < hi, 'empty maintenance interval')
        events = array(e['events'])
        for event in events:
            need(event, 'kind', 't'); num(event['t'])
        require(any(s['kind'] == 'start' and s['t'] == lo for s in events)
                and any(s['kind'] == 'end' and s['t'] == hi for s in events), 'maintenance events absent')
        coverage(e['lagSamples'], lo, hi, 1000)
        lags = sorted(num(need(s, 'lagMs')['lagMs']) for s in e['lagSamples'] if lo <= s['t'] <= hi)
        require(bool(lags), 'no in-window lag samples')
        self.bound(lags[math.ceil(.99 * len(lags)) - 1], e['threshold'], {'NS-P3-LAG-P99-MS'})

    def erasure_scan(self, e):
        inventory = array(self.contract.get('protectedCopyInventory'))
        rows = array(e['scans']); seen = set(); published = num(e['tErasurePublished'])
        fields = 'inventoryEntry location scanMethod plaintextHits derivedChannelHits keyDestroyedEvidence tScan'.split()
        for r in rows:
            need(r, *fields); label = name(r['inventoryEntry']); name(r['location']); name(r['scanMethod'])
            require(label in inventory and label not in seen, 'unknown or duplicate protected location')
            seen.add(label)
            require(num(r['tScan']) > published, 'scan did not follow erasure publication')
            plain, derived = integer(r['plaintextHits']), integer(r['derivedChannelHits'])
            if plain or derived:
                raise Failed('protected plaintext or derived channel survives')
            key = r['keyDestroyedEvidence']
            if key is not None:
                need(key, 'subjectKey', 'destroyedKey', 'tDestroyed', 'survivingCopies')
                require(name(key['subjectKey']) == name(key['destroyedKey']) and num(key['tDestroyed']) <= r['tScan'],
                        'wrong destroyed subject key or destruction after scan')
                for copy in array(key['survivingCopies']):
                    need(copy, 'id', 'encryptionKeys'); name(copy['id'])
                    require(copy['encryptionKeys'] == [key['destroyedKey']], 'surviving copy not exclusive to destroyed key')
        require(seen == set(inventory), 'protected copy inventory not fully scanned')
        require(any(all(canonical(r[k]) == canonical(e[k]) for k in fields) for r in rows), 'primary scan not in inventory scans')

    def watermark(self, e):
        name(e['readId']); name(e['servingIndex']); name(e['surfaceLanguage'])
        require(e['route'] in ('index', 'fallback'), 'unknown read route')
        require(num(e['waitMs']) <= self.threshold('T-WATERMARK-WAIT-MS'), 'watermark wait exceeded')
        require(num(e['tReadStart']) <= num(e['tRouteStart']) <= num(e['tRouteEnd']) <= num(e['tReadEnd']),
                'route latency excluded from read latency')
        require(e['tRouteStart'] - e['tReadStart'] >= e['waitMs'], 'wait excluded from read latency')
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
                        (snap['answer']['incarnation'], canonical(snap['answer']['marker'])) for k in ('before',))
                and snap['answer']['marker'] == watermark, 'answer snapshot/incarnation not fenced')

    def ack_order(self, e):
        position(e['commitPosition'])
        require(num(e['tAck']) >= num(e['tSourcePublished']), 'ACK preceded source publication')
        require(name(e['ackSender']) == name(e['sourceOfTruth']), 'ACK sender is not source of truth')
        pull = need(e['ryowPullRoute'])
        need(pull, *FIELDS['WATERMARK'].split())
        source(pull, 'WATERMARK')
        require(pull['basisPosition'] == e['commitPosition'] and pull['tReadStart'] >= e['tAck'], 'pull not at returned commit')
        self.watermark(pull)

    def fault_transitions(self, e):
        crash = num(e['tCrash']); previous = -1; last = None
        variants = need(self.contract.get('commitOutcomes'), 'log-source', 'engine-source')
        require(e['variant'] in ('log-source', 'engine-source'), 'unknown protocol variant')
        allowed = {row['id'] for row in variants[e['variant']]['transitions']}
        for row in array(e['transitions']):
            need(row, 'transition', 't', 'durableEvidenceObject'); name(row['transition'])
            require(row['transition'] in allowed, 'transition outside contract variant')
            t = num(row['t']); require(previous < t <= crash, 'transition time order'); previous = t
            obj = row['durableEvidenceObject']
            if obj is not None:
                need(obj, 'sha256', 'record', 'tReadBack')
                require(num(obj['tReadBack']) > crash, 'durability not read back after crash')
                record = need(obj['record'], 'transition', 't')
                require(digest(record) == obj['sha256'] and record['transition'] == row['transition']
                        and record['t'] == t, 'durable record does not witness transition')
                last = row
        require(last is not None, 'no durable transition witnessed')
        require(all(canonical(e[k]) == canonical(last[k]) for k in ('transition', 't', 'durableEvidenceObject')),
                'claimed transition is not last durable transition')


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


def check(protocol, evidence, contract):
    judge = None
    try:
        key = protocol.removeprefix('OBS-')
        if protocol != 'OBS-' + key or key not in FIELDS:
            raise Invalid('unknown observation protocol')
        judge = Judge(contract)
        if protocol not in contract['obsProtocols']:
            raise Refused('protocol missing from selected contract')
        need(evidence, *FIELDS[key].split())
        source(evidence, key)
        getattr(judge, key.lower().replace('-', '_'))(evidence)
        verdict, reasons, status = 'PASS', [], 0
    except Refused as error:
        verdict, reasons, status = 'REFUSED', [str(error)], 2
    except Failed as error:
        verdict, reasons, status = 'FAIL', [str(error)], 1
    except (Invalid, ValueError, TypeError, KeyError, OverflowError, RecursionError, OSError, subprocess.SubprocessError) as error:
        verdict, reasons, status = 'REFUSED', ['MALFORMED: ' + str(error)], 2
    return {'protocol': protocol, 'verdict': verdict, 'reasons': reasons,
            'thresholds': judge.used if judge else {}}, status


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['check'])
    parser.add_argument('protocol')
    parser.add_argument('evidence')
    parser.add_argument('--contract', required=True)
    args = parser.parse_args()
    try:
        report, status = check(args.protocol, load(args.evidence), load(args.contract))
    except (ValueError, TypeError, RecursionError, OSError) as error:
        report, status = {'protocol': args.protocol, 'verdict': 'REFUSED',
                          'reasons': ['MALFORMED: ' + str(error)], 'thresholds': {}}, 2
    print(canonical(report))
    return status


if __name__ == '__main__':
    sys.exit(main())

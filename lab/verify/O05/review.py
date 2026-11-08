"""CX-VO05 independent contract cases, CLI attacks, and local semantic mutants.

No builder fixture/test imports. Expected verdicts below are hand judgments from
ACCEPTANCE 6.3, its threshold registry, and COMMIT_OUTCOMES. Positive controls
exercise normalized evidence syntax; they are synthetic, never engine proof.
"""
import copy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ORACLE = ROOT / 'lab/acceptance/oracle/observe.py'
CONTRACT = ROOT / 'lab/acceptance/obligations.json'


def canonical(x):
    return json.dumps(x, sort_keys=True, separators=(',', ':'), ensure_ascii=True)


def sha(x):
    return hashlib.sha256(canonical(x).encode()).hexdigest()


KINDS = dict(zip(
    'CANCEL PREABORT CONNECTIONS SCRATCH NO-MUTATION RESOURCE AVAILABILITY SCALE-COUNT WORK MAINTENANCE ERASURE-SCAN WATERMARK ACK-ORDER FAULT-TRANSITIONS'.split(),
    'engine-active-query-log engine-statement-log engine-connection-samples engine-relation-scan engine-update-counter resource-owner-samples engine-probe-log engine-count-query engine-work-counters engine-maintenance-log protected-copy-scan engine-read-snapshot source-publication-log post-crash-durable-readback'.split()))


def seal(key, x, kind=None):
    e = copy.deepcopy(x)
    field = 'counterSource' if key == 'NO-MUTATION' else 'source'
    e.pop(field, None)
    records = copy.deepcopy(e)
    e[field] = {'kind': kind or KINDS[key], 'records': records, 'sha256': sha(records)}
    return e


def durable(transition, t, **witness):
    record = dict(transition=transition, t=t, **witness)
    return {'record': record, 'sha256': sha(record), 'tReadBack': 901}


def bases(c):
    # [CX-VO05] Why: fresh small hand examples expose the stated boundaries. Rejected: builder fixtures (correlated expectations).
    b = {}
    b['CANCEL'] = dict(requestId='query-a', connectionId='conn-a', tCancelRequested=100,
        tCallerSettled=110, callerError='E-CANCELLED', expectedError='E-CANCELLED',
        transportAck={'kind': 'cancel-ack', 't': 120}, tDrained=2100,
        engineActiveSamples=[{'t': t, 'activeQueryIds': ['query-a'] if t < 2100 else []}
                             for t in range(100, 7101, 1000)],
        reuseQueryId='query-b', reuseConnectionId='conn-a', tReuseOk=2200,
        reuseResult={'queryId': 'query-b', 'connectionId': 'conn-a', 'outcome': 'success', 't': 2200})
    b['PREABORT'] = dict(requestId='pre-a', engineStatementLog=[{'t': 15, 'tag': 'other'}],
        coverage={'from': 10, 'to': 30, 'maxGapMs': 0, 'segments': [{'from': 10, 'to': 20}, {'from': 20, 'to': 30}]})
    b['CONNECTIONS'] = dict(poolDeclarations=[{'label': 'reads', 'max': 3}, {'label': 'writes', 'max': 2}],
        baseline={'reads': 1, 'writes': 0}, tClose=10,
        engineConnectionSamples=[{'t': 9, 'label': 'reads', 'count': 3}, {'t': 9, 'label': 'writes', 'count': 2},
            {'t': 5010, 'label': 'reads', 'count': 1}, {'t': 5010, 'label': 'writes', 'count': 0}])
    b['SCRATCH'] = dict(relation='scratch-a', countBefore=4, countAfter=4, unknownOutcomes=['cmd-a'],
        resolutionReceipts=[{'workingId': 'cmd-a', 'outcome': 'committed', 'receiptId': 'receipt-a'}])
    b['NO-MUTATION'] = dict(engineMutationCounterBefore=17, engineMutationCounterAfter=17)
    b['RESOURCE'] = dict(forecast={'memory': 3758096384, 'disk': 90},
        envelope={'memory': 3758096384, 'disk': 100, 'owners': ['engine', 'client']},
        peaks=[{'owner': 'engine', 'rss': 3758096300, 'disk': 80, 't': 100},
               {'owner': 'client', 'rss': 84, 'disk': 10, 't': 100}], obligation='G3.admission.preconstruction')
    b['AVAILABILITY'] = dict(tFailure=10, events=[],
        probes=[{'t': 60010, 'kind': k, 'outcome': 'success'} for k in ['read', 'write']])
    # n=3,width=1: 9 live facts; entity 0 corrected (2 retirements) and
    # toggled twice (2 retirements); 13 total assertion versions; 4 commands.
    count = dict(configuredEntitiesLatest=3, distinctDomainSubjects=3, activeDomainFacts=3,
        activePresenceFacts=3, activeTypeVersionFacts=3, activeFixtureFacts=9,
        domainAssertionVersions=4, presenceAssertionVersions=5, typeVersionAssertionVersions=4,
        allFixtureAssertionVersions=13, fixtureRetirements=4, correctionEntities=1,
        presenceCycleEntities=1, configuredEntitiesDuringPresenceOff=2, schemaReleaseCalls=2,
        configFacts=None, receiptJournalClaimMetadata=None, domainCommands=4)
    b['SCALE-COUNT'] = dict(population={'generator': 'configured-entities-v1', 'n': 3, 'width': 1},
        analyticCount=count, countQueryCaseResult=copy.deepcopy(count))
    b['WORK'] = dict(operation='second-read-key-a', engineWorkUnits=dict(rowsScanned=50, rowsWritten=0, triplesTouched=20, bytesWritten=0),
        comparison={'operation': 'first-read-key-a', 'engineWorkUnits': dict(rowsScanned=100, rowsWritten=0, triplesTouched=40, bytesWritten=0)},
        threshold='T-REUSE-AVOIDED')
    b['MAINTENANCE'] = dict(kind='compaction', tStart=100, tEnd=1100,
        lagSamples=[{'t': 100, 'lagMs': 250}, {'t': 1100, 'lagMs': 250}],
        events=[{'kind': 'start', 't': 100}, {'kind': 'end', 't': 1100}], threshold='NS-P3-LAG-P99-MS')
    scans = [dict(inventoryEntry=k, location='test-volume/' + str(i), scanMethod='full-byte-and-decoded-channel-scan',
        plaintextHits=0, derivedChannelHits=0, keyDestroyedEvidence=None, tScan=21)
        for i, k in enumerate(c['protectedCopyInventory'])]
    b['ERASURE-SCAN'] = dict(**scans[0], scans=scans, tErasurePublished=20)
    snapshot = {'incarnation': 'instance-a', 'marker': 7}
    eligibility = dict(index='idx-a', publishedPositions=[2, 5, 7],
        resolutions=[{'position': p, 'outcome': o} for p, o in [(2, 'applied'), (5, 'aborted'), (7, 'applied')]],
        scopeOwner='tenant-a', queryScope='tenant-a', mappingGeneration=2, queryMappingGeneration=2,
        validInstant=15, validFrom=10, validTo=20, exactCut=7, queryCut=7,
        reconstructFrom=7, reconstructTo=7, erasurePublished=11, erasureApplied=11,
        recordedTimeBound=None, markerState='complete', partialOrConflictedReferenced=False,
        queriedAttributes=['status'], attributes=[{'name': 'status', 'from': 7, 'to': 7}],
        snapshot={'mode': 'incarnation-fenced', **{k: copy.deepcopy(snapshot) for k in ['before', 'answer', 'after']}})
    b['WATERMARK'] = dict(readId='read-a', basisPosition=7, servingIndex='idx-a', watermarkAtRead=7,
        waitMs=10, route='index', fallbackIndex=None, eligibility=eligibility, surfaceLanguage='XTQL',
        tReadStart=100, tRouteStart=110, tRouteEnd=120, tReadEnd=120)
    b['ACK-ORDER'] = dict(commitPosition=7, tSourcePublished=90, tAck=100,
        ackSender='source-a', sourceOfTruth='source-a', ryowPullRoute=seal('WATERMARK', b['WATERMARK']))
    d = durable('QT2-LOGGED', 30, commitRecord={'txId': 'tx-a', 'position': 7, 'decision': 'COMMIT', 'readBackBytes': 'COMMIT tx-a 7'},
        logIdentity='source-a', restartIdentity='restart-a')
    b['FAULT-TRANSITIONS'] = dict(transition='QT2-LOGGED', t=30, durableEvidenceObject=d,
        transitions=[{'transition': 'QT0-RECEIVED', 't': 10, 'durableEvidenceObject': None},
                     {'transition': 'QT2-LOGGED', 't': 30, 'durableEvidenceObject': copy.deepcopy(d)}],
        tCrash=900, variant='log-source')
    return b


def setpath(e, path, value):
    parts = path.split('.')
    node = e
    for part in parts[:-1]:
        node = node[int(part)] if isinstance(node, list) else node[part]
    if isinstance(node, list):
        node[int(parts[-1])] = value
    else:
        node[parts[-1]] = value


def cases(c):
    base = bases(c)
    out = []

    def add(key, label, x, expected='FAIL', explanation='', contract=None):
        row = dict(id=key + '/' + label, protocol='OBS-' + key, evidence=seal(key, x),
                   expected=expected, explanation=explanation)
        if contract is not None:
            row['contract'] = contract
        out.append(row)

    boundaries = {
        'CANCEL': ('tDrained', 2101), 'PREABORT': ('engineStatementLog.0.tag', 'pre-a'),
        'CONNECTIONS': ('engineConnectionSamples.0.count', 4), 'SCRATCH': ('countAfter', 5),
        'NO-MUTATION': ('engineMutationCounterAfter', 18), 'RESOURCE': ('peaks.1.rss', 85),
        'AVAILABILITY': ('probes.0.t', 60011), 'SCALE-COUNT': ('countQueryCaseResult.activeDomainFacts', 2),
        'WORK': ('engineWorkUnits.rowsScanned', 51), 'MAINTENANCE': ('lagSamples.0.lagMs', 251),
        'ERASURE-SCAN': ('scans.1.derivedChannelHits', 1), 'WATERMARK': ('waitMs', 11),
        'ACK-ORDER': ('tAck', 89), 'FAULT-TRANSITIONS': ('durableEvidenceObject.tReadBack', 900),
    }
    missing = dict(zip(KINDS, 'engineActiveSamples coverage baseline resolutionReceipts engineMutationCounterAfter peaks probes countQueryCaseResult engineWorkUnits lagSamples scans eligibility ryowPullRoute transitions'.split()))
    for key, b in base.items():
        add(key, 'positive', b, 'PASS', 'Synthetic normalized control from ACCEPTANCE 6.3; not an engine receipt.')
        e = copy.deepcopy(b); setpath(e, *boundaries[key])
        if key == 'FAULT-TRANSITIONS':
            e['transitions'][1]['durableEvidenceObject']['tReadBack'] = 900
        add(key, 'boundary', e)
        e = copy.deepcopy(b); del e[missing[key]]; add(key, 'missing-evidence', e)
        row = dict(id=key + '/client-source', protocol='OBS-' + key,
                   evidence=seal(key, b, 'client-counters'), expected='FAIL', explanation='Client counter offered as engine evidence.')
        out.append(row)
        e = seal(key, b); field = 'counterSource' if key == 'NO-MUTATION' else 'source'
        e[field] = {'kind': KINDS[key], 'sha256': '0' * 64}
        out.append(dict(id=key + '/label-only', protocol='OBS-' + key, evidence=e, expected='FAIL'))
        # [CX-VO05] Why: rehashing fabricated bytes is not trusted collection. Rejected: stale-hash-only attacks (miss origin spoofing).
        e = copy.deepcopy(b); e['collectorAttestation'] = {'collector': 'made-up-collector', 'runId': 'nonexistent-run', 'rawEngineObjects': []}
        add(key, 'invented-log', e, 'REFUSED', 'All records invented in this script; no engine, collector, run or raw source exists. Must not qualify as engine evidence.')

    attacks = {
        'CANCEL': [('different-reuse-connection', 'reuseResult.connectionId', 'conn-b'),
                   ('active-after-drain', 'engineActiveSamples.3.activeQueryIds', ['query-a']),
                   ('sample-gap', 'engineActiveSamples.1.t', 1201)],
        'PREABORT': [('coverage-hole', 'coverage.segments.1.from', 21),
                     ('short-coverage', 'coverage.segments.1.to', 29)],
        'CONNECTIONS': [('missing-pool-baseline', 'engineConnectionSamples.3.count', 1),
                        ('duplicate-pool', 'poolDeclarations.1.label', 'reads')],
        'SCRATCH': [('unresolved', 'resolutionReceipts.0.outcome', 'unknown'),
                    ('wrong-command-receipt', 'resolutionReceipts.0.workingId', 'cmd-b')],
        'NO-MUTATION': [('boolean-counter', 'engineMutationCounterAfter', True),
                        ('negative-counter', 'engineMutationCounterAfter', -1)],
        'RESOURCE': [('missing-owner', 'peaks', [base['RESOURCE']['peaks'][0]]),
                     ('oversized-forecast', 'forecast.disk', 101)],
        'AVAILABILITY': [('manual-restart', 'events', [{'kind': 'manual-restart', 't': 11}]),
                         ('all-read-probes', 'probes.1.kind', 'read')],
        'SCALE-COUNT': [('invented-both-counts', 'analyticCount.activeDomainFacts', 2),
                        ('population-swap', 'population.n', 4)],
        'WORK': [('zero-baseline-increase', 'engineWorkUnits.rowsWritten', 1),
                 ('one-channel-over', 'engineWorkUnits.triplesTouched', 21)],
        'MAINTENANCE': [('missing-end-event', 'events', [base['MAINTENANCE']['events'][0]]),
                        ('insufficient-coverage', 'lagSamples.1.t', 1099)],
        'ERASURE-SCAN': [('scan-at-publication', 'scans.1.tScan', 20),
                         ('missing-category', 'scans', base['ERASURE-SCAN']['scans'][:-1])],
        'WATERMARK': [('unresolved-prefix', 'eligibility.resolutions', [{'position': 2, 'outcome': 'applied'}, {'position': 7, 'outcome': 'applied'}]),
                      ('erasure-behind', 'eligibility.erasureApplied', 10),
                      ('attribute-after-basis', 'eligibility.attributes.0.from', 8),
                      ('reset-incarnation', 'eligibility.snapshot.after.incarnation', 'instance-b')],
        'ACK-ORDER': [('replica-ack', 'ackSender', 'replica-a'),
                      ('pull-wrong-commit', 'commitPosition', 6)],
        'FAULT-TRANSITIONS': [('wrong-variant', 'variant', 'engine-source'),
                              ('no-witness', 'transitions.1.durableEvidenceObject', None)],
    }
    for key, changes in attacks.items():
        for label, path, value in changes:
            e = copy.deepcopy(base[key]); setpath(e, path, value)
            add(key, label, e, 'REFUSED' if label in ('boolean-counter', 'negative-counter') else 'FAIL')

    e = copy.deepcopy(base['CANCEL']); e.update(expectedError='E-TIMEOUT', callerError='E-TIMEOUT', tDeadline=100, tCallerSettled=200)
    add('CANCEL', 'timeout-positive', e, 'PASS')
    timeout = copy.deepcopy(e); timeout['tCallerSettled'] = 201; add('CANCEL', 'timeout-boundary', timeout)
    e = copy.deepcopy(base['WORK']); e['threshold'] = 'T-INCR-WORK'; e['engineWorkUnits'].update(rowsScanned=1, triplesTouched=0)
    e['operation'] = 'one-entity-maintenance'; e['comparison']['operation'] = 'full-recomputation'
    add('WORK', 'incremental-positive', e, 'PASS')
    inc = copy.deepcopy(e); inc['engineWorkUnits']['rowsScanned'] = 2; add('WORK', 'incremental-boundary', inc)
    e = copy.deepcopy(inc); e['threshold'] = 'T-REUSE-AVOIDED'
    add('WORK', 'threshold-laundering', e, 'FAIL', 'Same incremental work of 2/100 must not evade T-INCR-WORK=0.01 by choosing reuse=0.5.')
    e = copy.deepcopy(base['WORK'])
    e['engineWorkUnits'].update(rowsScanned=9007199254740993, triplesTouched=0)
    e['comparison']['engineWorkUnits'].update(rowsScanned=18014398509481984, triplesTouched=0)
    add('WORK', 'exact-ratio-above-half', e, 'FAIL', 'Exact integer ratio is 0.5 + 1/2**54, strictly greater than the max 0.5.')
    e = copy.deepcopy(inc)
    e['engineWorkUnits']['rowsScanned'] = 1000000000000000001
    e['comparison']['engineWorkUnits']['rowsScanned'] = 100000000000000000000
    add('WORK', 'exact-ratio-above-incremental', e, 'FAIL', 'Exact ratio exceeds 0.01 by 1/10**20; binary64 division rounds away the excess.')
    e = copy.deepcopy(base['RESOURCE']); e['forecast']['memory'] += 1; e['envelope']['memory'] += 1; e['peaks'][1]['rss'] += 1
    add('RESOURCE', 'planner-cap', e)
    e['obligation'] = 'G6.cancel.drain'
    # Use an existing unrelated ID, discovered from the contract only; no builder fixture.
    if not any(o['id'] == e['obligation'] for o in c['obligations']):
        e['obligation'] = next(o['id'] for o in c['obligations'] if 'T-PLANNER-MEM-BYTES' not in o['thresholds'])
    add('RESOURCE', 'obligation-laundering', e, 'FAIL', 'Same refused-planner memory above named cap; only evidence-selected obligation changed.')
    e = copy.deepcopy(base['WATERMARK']); e.update(tRouteStart=60110, tRouteEnd=60120, tReadEnd=60120)
    add('WATERMARK', 'unaccounted-pre-route-delay', e, 'REFUSED', '60,010 ms before routing but waitMs claims 10; no independently bound explanation for other time.')
    e = copy.deepcopy(base['FAULT-TRANSITIONS']); d = durable('QT2-LOGGED', 30)
    e['durableEvidenceObject'] = d; e['transitions'][1]['durableEvidenceObject'] = copy.deepcopy(d)
    add('FAULT-TRANSITIONS', 'transition-label-as-witness', e, 'FAIL', 'Only {transition,t}; no post-restart COMMIT bytes, tx identity, or position.')
    e = copy.deepcopy(base['FAULT-TRANSITIONS']); d = durable('QT5-VERIFIED', 30)
    e.update(transition='QT5-VERIFIED', durableEvidenceObject=d)
    e['transitions'][1].update(transition='QT5-VERIFIED', durableEvidenceObject=copy.deepcopy(d))
    add('FAULT-TRANSITIONS', 'verification-label-as-witness', e, 'FAIL', 'QT5 without any expected effects/absences or independent three-path queries.')
    e = copy.deepcopy(base['FAULT-TRANSITIONS']); e['transitions'].append({'transition': 'QT4s-SOURCE-PUBLISHED', 't': 40, 'durableEvidenceObject': None})
    add('FAULT-TRANSITIONS', 'declared-unwitnessed-transition', e, 'FAIL', 'COMMIT_OUTCOMES witnessRule says a declared unwitnessed transition fails the case.')
    e = copy.deepcopy(base['ERASURE-SCAN']);
    for row in e['scans']:
        row['location'] = 'one-empty-directory'
    e['location'] = 'one-empty-directory'
    add('ERASURE-SCAN', 'category-labels-as-inventory', e, 'REFUSED', 'Same empty location labeled as twelve different categories; no physical copy inventory.')
    e = copy.deepcopy(base['CONNECTIONS']); e['engineConnectionSamples'].extend([
        {'t': 5011, 'label': 'reads', 'count': 2}, {'t': 5011, 'label': 'writes', 'count': 0}])
    add('CONNECTIONS', 'post-deadline-leak', e)
    e = copy.deepcopy(base['WATERMARK']); e['route'] = 'fallback'; e['fallbackIndex'] = 'idx-a'
    add('WATERMARK', 'fallback-positive', e, 'PASS')
    e['eligibility']['queryScope'] = 'tenant-b'; add('WATERMARK', 'stale-fallback', e)
    e = copy.deepcopy(base['WATERMARK']); e['eligibility']['validInstant'] = 20
    add('WATERMARK', 'valid-to-exclusive', e)
    e = copy.deepcopy(base['WATERMARK']); e['eligibility']['queriedAttributes'].append('pay')
    add('WATERMARK', 'missing-second-attribute', e)
    e = copy.deepcopy(base['ERASURE-SCAN'])
    for i, row in enumerate(e['scans']):
        row['keyDestroyedEvidence'] = dict(subjectKey='subject-key-a', destroyedKey='subject-key-a', tDestroyed=20,
            survivingCopies=[{'id': 'cipher-' + str(i), 'encryptionKeys': ['subject-key-a']}])
    e['keyDestroyedEvidence'] = copy.deepcopy(e['scans'][0]['keyDestroyedEvidence'])
    add('ERASURE-SCAN', 'crypto-positive', e, 'PASS')
    e['scans'][1]['keyDestroyedEvidence']['survivingCopies'][0]['encryptionKeys'].append('surviving-master-key')
    add('ERASURE-SCAN', 'nonexclusive-encryption-key', e)

    # Every named threshold has a contract replacement, missing-threshold probe,
    # and evidence-file attempted override. Compare emitted consulted definitions.
    threshold_cases = [
        ('CANCEL', 'positive', 'T-DRAIN-MS', 1999),
        ('CANCEL', 'timeout-positive', 'T-DEADLINE-GRACE-MS', 99),
        ('CONNECTIONS', 'positive', 'T-CONN-RELEASE-MS', 4999),
        ('RESOURCE', 'positive', 'T-PLANNER-MEM-BYTES', 3758096383),
        ('AVAILABILITY', 'positive', 'T-AVAIL-WINDOW-MS', 59999),
        ('WORK', 'positive', 'T-REUSE-AVOIDED', 0.499),
        ('WORK', 'incremental-positive', 'T-INCR-WORK', 0.009),
        ('MAINTENANCE', 'positive', 'NS-P3-LAG-P99-MS', 249),
        ('WATERMARK', 'positive', 'T-WATERMARK-WAIT-MS', 9),
    ]
    for key, label, threshold, value in threshold_cases:
        original = next(r for r in out if r['id'] == key + '/' + label)
        for mode in ('tightened', 'missing', 'evidence-override'):
            row = copy.deepcopy(original); row['id'] = 'THRESHOLD/' + threshold + '/' + mode
            ct = copy.deepcopy(c)
            if mode == 'missing':
                del ct['thresholds'][threshold]; row['expected'] = 'REFUSED'
            else:
                ct['thresholds'][threshold]['value'] = value; row['expected'] = 'FAIL'
            if mode == 'evidence-override':
                row['evidence']['thresholds'] = {threshold: 10**20}
                row['evidence'] = seal(key, row['evidence'])
            row['contract'] = ct; row['thresholdProbe'] = threshold
            out.append(row)
    return out


def invoke(oracle, row, cp, input_path):
    input_path.write_text(canonical(row['evidence']) + '\n')
    proc = subprocess.run([sys.executable, '-I', '-B', str(oracle), 'check', row['protocol'], str(input_path), '--contract', str(cp)],
                          capture_output=True, text=True, timeout=40)
    try:
        verdict = json.loads(proc.stdout)
    except ValueError:
        verdict = {'verdict': 'CRASH', 'rawStdout': proc.stdout}
    return dict(id=row['id'], expected=row['expected'], actual=verdict, code=proc.returncode, stderr=proc.stderr,
                ok=verdict.get('verdict') == row['expected'] and proc.returncode == {'PASS': 0, 'FAIL': 1, 'REFUSED': 2}[row['expected']],
                canonical=proc.stdout == canonical(verdict) + '\n')


def mutations(original):
    # [CX-VO05] Why: delete individual guards, not entire protocol handlers. Rejected: broad omission mutants alone (weak guard sensitivity).
    return [
        ('allow-client-source', "require(s['kind'] in KINDS[protocol], 'unaccepted engine evidence source')", 'pass'),
        ('ignore-source-digest', "require(digest(records) == s['sha256'], 'source record digest mismatch')", 'pass'),
        ('drain-strict-boundary', "drained - start <= self.threshold('T-DRAIN-MS')", "drained - start < self.threshold('T-DRAIN-MS')"),
        ('allow-active-after-drain', "require(e['requestId'] not in ids, 'query still active after drain')", 'pass'),
        ('allow-other-reuse-connection', "'connectionId': e['connectionId'],", "'connectionId': reuse['connectionId'],"),
        ('preabort-forbidden-tag', "require(s['tag'] != e['requestId'], 'preaborted request reached engine')", 'pass'),
        ('pool-over-max', "require(s['count'] <= limits[s['label']], 'pool maximum exceeded')", 'pass'),
        ('scratch-count-drift', "require(e['countBefore'] == e['countAfter'], 'scratch relation count changed')", 'pass'),
        ('counter-drift', "integer(e['engineMutationCounterBefore']) == integer(e['engineMutationCounterAfter'])", 'True'),
        ('resource-ignore-client', 'sum(v[0] for v in group.values())', 'max(v[0] for v in group.values())'),
        ('manual-restart-allowed', "require(not (event['kind'] == 'manual-restart' and event['t'] >= start), 'manual restart observed')", 'pass'),
        ('count-engine-not-compared', "require(canonical(e['countQueryCaseResult']) == canonical(expected), 'engine counts differ from O-REPLAY')", 'pass'),
        ('work-only-first-channel', 'max(ratios)', 'ratios[0]'),
        ('maintenance-min-lag', 'lags[math.ceil(.99 * len(lags)) - 1]', 'lags[0]'),
        ('ignore-derived-channel', 'if plain or derived:', 'if plain:'),
        ('ignore-erasure-frontier', "require(reached(x['erasureApplied'], x['erasurePublished']), 'erasure frontier behind')", 'pass'),
        ('allow-early-ack', "require(num(e['tAck']) >= num(e['tSourcePublished']), 'ACK preceded source publication')", 'pass'),
        ('allow-precrash-readback', "require(num(obj['tReadBack']) > crash, 'durability not read back after crash')", 'pass'),
        ('allow-old-incarnation', "for k in ('before', 'after'))", "for k in ('before',))"),
    ]


def main():
    output = HERE / 'evidence/final'; output.mkdir(parents=True, exist_ok=True)
    scratch = HERE / 'scratch/final'; scratch.mkdir(parents=True, exist_ok=True)
    disk = shutil.disk_usage(ROOT)
    if disk.free < 5 * 1024**3:
        raise SystemExit('less than 5 GiB free')
    start = time.time()
    bound_paths = [ORACLE, CONTRACT, Path(__file__), ROOT / 'lab/acceptance/ACCEPTANCE.md', ROOT / 'lab/acceptance/oracle/README.md']
    hashes = lambda: {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in bound_paths}
    before = hashes()
    c = json.loads(CONTRACT.read_text()); rows = cases(c)
    # Extra independent binding attacks, after initial builders above are frozen.
    for key in KINDS:
        row = copy.deepcopy(next(r for r in rows if r['id'] == key + '/positive'))
        row['id'] = key + '/bad-digest'; row['expected'] = 'FAIL'
        row['evidence']['counterSource' if key == 'NO-MUTATION' else 'source']['sha256'] = '0' * 64
        rows.append(row)
    (HERE / 'cases.json').write_text(json.dumps(rows, sort_keys=True, indent=2) + '\n')
    results = []
    for i, row in enumerate(rows):
        ep = output / ('case-%03d.json' % i); ep.write_text(canonical(row['evidence']) + '\n')
        cp = CONTRACT
        if 'contract' in row:
            cp = output / ('contract-%03d.json' % i); cp.write_text(canonical(row['contract']) + '\n')
        result = invoke(ORACLE, row, cp, ep)
        result['evidencePath'] = str(ep.relative_to(ROOT))
        result['contractPath'] = str(cp.relative_to(ROOT))
        if 'thresholdProbe' in row and row['expected'] != 'REFUSED':
            key = row['thresholdProbe']
            result['thresholdDefinitionMatchesContract'] = result['actual'].get('thresholds', {}).get(key) == row['contract']['thresholds'][key]
        results.append(result)
    (output / 'results.json').write_text(json.dumps(results, sort_keys=True, indent=2) + '\n')
    # Use only baseline-matching assertions, so existing defects cannot kill mutants.
    valid = {r['id'] for r in results if r['ok']}
    original = ORACLE.read_text()
    mutants = []
    for ident, old, new in mutations(original):
        if original.count(old) != 1:
            raise AssertionError((ident, original.count(old)))
        path = scratch / (ident + '.py')
        patched = original.replace(old, new).replace('ROOT = Path(__file__).resolve().parents[3]', 'ROOT = Path(' + repr(str(ROOT)) + ')')
        path.write_text(patched)
        changes = []
        for row in rows:
            if row['id'] not in valid or 'contract' in row or row['id'].endswith('/invented-log'):
                continue
            label = row['id'].split('/')[-1]
            if row['expected'] != 'PASS' and label not in {
                'boundary', 'client-source', 'bad-digest', 'active-after-drain', 'different-reuse-connection',
                'manual-restart', 'one-channel-over', 'erasure-behind', 'reset-incarnation'}:
                continue
            got = invoke(path, row, CONTRACT, scratch / 'input.json')
            if not got['ok']:
                changes.append(got)
        semantic = [r for r in changes if r['code'] in (0, 1, 2) and r['actual'].get('verdict') in ('PASS', 'FAIL', 'REFUSED') and not r['stderr']]
        mutants.append(dict(id=ident, path=str(path.relative_to(ROOT)), patch={'old': old, 'new': new},
            killed=bool(semantic), semanticCounterexamples=semantic, crashes=[r for r in changes if r not in semantic]))
    (output / 'mutants.json').write_text(json.dumps(mutants, sort_keys=True, indent=2) + '\n')
    builder = []
    for script in ['test_observe.py', 'test_cli.py', 'selfcheck.py']:
        command = [sys.executable, '-I', '-B', str(ORACLE.parent / script)]
        p = subprocess.run(command, capture_output=True, text=True, timeout=180)
        (output / (script + '.stdout.txt')).write_text(p.stdout)
        (output / (script + '.stderr.txt')).write_text(p.stderr)
        builder.append(dict(command=command, code=p.returncode))
    after = hashes()
    summary = dict(reviewId='CX-VO05', reviewedHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
        startedEpochSeconds=start, endedEpochSeconds=time.time(), hostDiskFreeBefore=disk.free,
        hashesBefore=before, hashesAfter=after, sourceStable=before == after,
        total=len(results), matched=sum(r['ok'] for r in results), discrepancies=[r['id'] for r in results if not r['ok']],
        mutants=len(mutants), killed=sum(m['killed'] for m in mutants), builderReruns=builder,
        invocation=[sys.executable, '-I', '-B', str(Path(__file__).relative_to(ROOT))])
    (output / 'summary.json').write_text(json.dumps(summary, sort_keys=True, indent=2) + '\n')
    print(json.dumps(summary, sort_keys=True))
    return 0


if __name__ == '__main__':
    sys.exit(main())

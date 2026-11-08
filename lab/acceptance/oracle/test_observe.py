"""Hand-derived section 6.3 fixtures; no engine or implementation expected answers."""
import argparse

import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
CONTRACT = HERE.parent / 'obligations.json'
sys.path.insert(0, str(HERE))
from bundle_fixtures import fixture


def seal(e, key, kind):
    # [EXP-O05] Why: independent fixture encoding. Rejected: oracle digest helper (shared defect could hide failures).
    records = copy.deepcopy({k: v for k, v in e.items() if k != key})
    raw = json.dumps(records, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()
    e[key] = {'kind': kind, 'records': records, 'sha256': hashlib.sha256(raw).hexdigest()}
    return e


def fixtures():
    p = {}
    p['CANCEL'] = dict(requestId='q1', connectionId='c1', tCancelRequested=0, tCallerSettled=10,
                       callerError='E-CANCELLED', expectedError='E-CANCELLED', transportAck={'kind': 'cancel-ack', 't': 1},
                       engineActiveSamples=[{'t': t, 'activeQueryIds': []} for t in range(0, 7001, 1000)],
                       tDrained=2000, reuseQueryId='q2', tReuseOk=2001, reuseConnectionId='c1',
                       reuseResult={'queryId': 'q2', 'connectionId': 'c1', 'outcome': 'success', 't': 2001})
    p['PREABORT'] = dict(requestId='q1', engineStatementLog=[],
                         coverage={'from': 0, 'to': 100, 'maxGapMs': 0, 'segments': [{'from': 0, 'to': 100}]})
    p['CONNECTIONS'] = dict(poolDeclarations=[{'label': 'pool', 'max': 2}],
                           engineConnectionSamples=[{'t': 0, 'label': 'pool', 'count': 2},
                                                    {'t': 5000, 'label': 'pool', 'count': 0}], baseline={'pool': 0}, tClose=0)
    p['SCRATCH'] = dict(relation='scratch', countBefore=0, countAfter=0, unknownOutcomes=['w1'],
                       resolutionReceipts=[{'workingId': 'w1', 'outcome': 'aborted', 'receiptId': 'r1'}])
    p['NO-MUTATION'] = dict(engineMutationCounterBefore=12, engineMutationCounterAfter=12)
    p['RESOURCE'] = dict(obligation='S.capacity.admitted', forecast={'memory': 100, 'disk': 100}, envelope={'memory': 100, 'disk': 100, 'owners': ['engine', 'client']},
                        peaks=[{'owner': 'engine', 'rss': 60, 'disk': 60, 't': 0}, {'owner': 'client', 'rss': 40, 'disk': 40, 't': 0}])
    p['AVAILABILITY'] = dict(tFailure=0, events=[], probes=[{'t': 60000, 'kind': k, 'outcome': 'success'} for k in ('write', 'read')])
    # n=1, width=1: one correction and one presence cycle; hand-derived from CONTRACT.md, not scale.py.
    counts = dict(configuredEntitiesLatest=1, distinctDomainSubjects=1, activeDomainFacts=1, activePresenceFacts=1,
                  activeTypeVersionFacts=1, activeFixtureFacts=3, domainAssertionVersions=2, presenceAssertionVersions=3,
                  typeVersionAssertionVersions=2, allFixtureAssertionVersions=7, fixtureRetirements=4, correctionEntities=1,
                  presenceCycleEntities=1, configuredEntitiesDuringPresenceOff=0, schemaReleaseCalls=2,
                  configFacts=None, receiptJournalClaimMetadata=None, domainCommands=4)
    p['SCALE-COUNT'] = dict(population={'generator': 'configured-entities-v1', 'n': 1, 'width': 1},
                           countQueryCaseResult=counts, analyticCount=counts.copy())
    units = dict(rowsScanned=50, rowsWritten=0, triplesTouched=50, bytesWritten=0)
    p['WORK'] = dict(operation='reuse', engineWorkUnits=units, comparison={'operation': 'first',
                     'engineWorkUnits': dict(rowsScanned=100, rowsWritten=0, triplesTouched=100, bytesWritten=0)}, threshold='T-REUSE-AVOIDED')
    p['MAINTENANCE'] = dict(kind='compaction', tStart=0, tEnd=1000, events=[{'kind': 'start', 't': 0}, {'kind': 'end', 't': 1000}],
                           lagSamples=[{'t': 0, 'lagMs': 250}, {'t': 1000, 'lagMs': 250}], threshold='NS-P3-LAG-P99-MS')
    inventory = ['source log and journal', 'current index', 'history index', 'analytical copy', 'order-key channels',
                 'lexical channels', 'QLever broker log of record', 'broker recent_rows overlay',
                 'current-value copies (broker current store, XTDB tx_current, QLever cur graph)', 'caches', 'checkpoints', 'backups']
    scans = [dict(inventoryEntry=k, location='store/' + str(i), scanMethod='full-byte-and-derived-channel-scan',
                  plaintextHits=0, derivedChannelHits=0, keyDestroyedEvidence=None, tScan=1) for i, k in enumerate(inventory)]
    p['ERASURE-SCAN'] = dict(scans[0], scans=scans, tErasurePublished=0)
    inventory += ['observer outputs', 'old index generations', 'freed blocks']
    scans[:] = [dict(inventoryEntry=k, location='store/' + str(i), scanMethod='full-byte-and-derived-channel-scan', plaintextHits=0, derivedChannelHits=0, keyDestroyedEvidence=None, tScan=2, positiveControl=dict(canary='canary-'+str(i), tWritten=0, tFound=0, hits=1, location='store/'+str(i), scanMethod='full-byte-and-derived-channel-scan')) for i, k in enumerate(inventory)]
    p['ERASURE-SCAN'] = dict(scans[0], scans=scans, tErasurePublished=1)
    snapshot = {'incarnation': 'boot-1', 'marker': 2}
    eligible = dict(index='idx', recordedTimeBound=None, markerState='complete', partialOrConflictedReferenced=False,
                    queriedAttributes=['a'], attributes=[{'name': 'a', 'from': 1, 'to': 2}], publishedPositions=[1, 2], resolutions=[{'position': i, 'outcome': 'applied'} for i in (1, 2)],
                    scopeOwner='tenant', queryScope='tenant', mappingGeneration=1, queryMappingGeneration=1,
                    validInstant=5, validFrom=0, validTo=10, exactCut=2, queryCut=2, reconstructFrom=1, reconstructTo=2,
                    erasurePublished=2, erasureApplied=2,
                    snapshot={'mode': 'incarnation-fenced', 'before': snapshot.copy(), 'answer': snapshot.copy(), 'after': snapshot.copy()})
    p['WATERMARK'] = dict(readId='read-1', basisPosition=2, servingIndex='idx', watermarkAtRead=2, waitMs=10, route='index',
                         waitEvents={'start': {'kind':'read-start', 'readId':'read-1', 't':5}, 'end':{'kind':'engine-request', 'readId':'read-1', 't':15}}, fallbackIndex=None, eligibility=eligible, surfaceLanguage='sparql', tReadStart=5, tReadEnd=25, tRouteStart=15, tRouteEnd=25)
    seal(p['WATERMARK'], 'source', 'engine-read-snapshot')
    p['ACK-ORDER'] = dict(commitPosition=2, tSourcePublished=0, tAck=5, ackSender='log', sourceOfTruth='log',
                         ryowPullRoute=copy.deepcopy(p['WATERMARK']))
    record = {'transition': 'QT4s-SOURCE-PUBLISHED', 't': 1, 'position': 2, 'operationId': 'op1', 'facts': {'decisionDurable': True, 'sourceReadable': True, 'commitRecord': {'operationId':'op1','position':2,'type':'COMMIT','effects':[{'entity':'e1','attribute':'a','value':1}]}, 'sourceReadback':{'operationId':'op1','position':2,'effects':[{'entity':'e1','attribute':'a','value':1}], 'absences':[]}}}
    durable = {'record': record, 'sha256': hashlib.sha256(json.dumps(record, sort_keys=True, separators=(',', ':')).encode()).hexdigest(), 'tReadBack': 3, 'readbackOperationId': 'op1', 'readbackPosition': 2}
    p['FAULT-TRANSITIONS'] = dict(transition='QT4s-SOURCE-PUBLISHED', variant='log-source', t=1, durableEvidenceObject=durable, tCrash=2,
                                transitions=[{'transition': 'QT4s-SOURCE-PUBLISHED', 't': 1, 'durableEvidenceObject': durable}])
    kinds = ['engine-active-query-log', 'engine-statement-log', 'engine-connection-samples', 'engine-relation-scan',
             'engine-committed-transaction-counter', 'resource-owner-samples', 'engine-probe-log', 'engine-count-query',
             'engine-work-counters', 'engine-maintenance-log', 'protected-copy-scan', 'engine-read-snapshot',
             'source-publication-log', 'post-crash-durable-readback']
    cases = []
    for (protocol, evidence), kind in zip(p.items(), kinds):
        sourcekey = 'counterSource' if protocol == 'NO-MUTATION' else 'source'
        seal(evidence, sourcekey, kind)
        cases.append({'id': protocol + '/pass', 'protocol': 'OBS-' + protocol, 'expected': 'PASS', 'evidence': copy.deepcopy(evidence)})
        missing = copy.deepcopy(evidence); del missing[next(k for k in evidence if k != sourcekey)]
        cases.append({'id': protocol + '/missing', 'protocol': 'OBS-' + protocol, 'expected': 'FAIL', 'evidence': missing})
        forged = copy.deepcopy(evidence); forged[sourcekey]['kind'] = 'client-counter'
        cases.append({'id': protocol + '/forged-source', 'protocol': 'OBS-' + protocol, 'expected': 'FAIL', 'evidence': forged})
        bad = copy.deepcopy(evidence)
        if protocol == 'CANCEL': bad['tDrained'] = 2001
        elif protocol == 'PREABORT': bad['engineStatementLog'] = [{'t': 1, 'tag': 'q1'}]
        elif protocol == 'CONNECTIONS': bad['engineConnectionSamples'][-1]['t'] = 5001
        elif protocol == 'SCRATCH': bad['countAfter'] = 1
        elif protocol == 'NO-MUTATION': bad['engineMutationCounterAfter'] = 13
        elif protocol == 'RESOURCE': bad['peaks'][1]['rss'] = 41
        elif protocol == 'AVAILABILITY': bad['probes'][0]['t'] = 60001
        elif protocol == 'SCALE-COUNT': bad['countQueryCaseResult']['activeDomainFacts'] = 2
        elif protocol == 'WORK': bad['engineWorkUnits']['rowsScanned'] = 51
        elif protocol == 'MAINTENANCE': bad['lagSamples'][-1]['lagMs'] = 251
        elif protocol == 'ERASURE-SCAN': bad['scans'][-1]['derivedChannelHits'] = 1
        elif protocol == 'WATERMARK': bad['waitMs'] = 11
        elif protocol == 'ACK-ORDER': bad['tSourcePublished'] = 6
        elif protocol == 'FAULT-TRANSITIONS': bad['transition'] = 'QT6-ACKED'
        seal(bad, sourcekey, kind)
        cases.append({'id': protocol + '/boundary', 'protocol': 'OBS-' + protocol, 'expected': 'FAIL', 'evidence': bad})
    base = {case['protocol'].removeprefix('OBS-'): case['evidence'] for case in cases if case['id'].endswith('/pass')}

    def extra(protocol, label, modify, expected='FAIL', reseal=True):
        e = copy.deepcopy(base[protocol]); modify(e)
        key = 'counterSource' if protocol == 'NO-MUTATION' else 'source'
        if reseal:
            seal(e, key, e[key]['kind'])
        cases.append({'id': protocol + '/' + label, 'protocol': 'OBS-' + protocol, 'expected': expected, 'evidence': e})

    extra('CANCEL', 'gap', lambda e: e['engineActiveSamples'].pop(3))
    extra('CANCEL', 'query-survives', lambda e: e['engineActiveSamples'][-1]['activeQueryIds'].append('q1'))
    extra('CANCEL', 'different-reuse-connection', lambda e: e.update(reuseConnectionId='c2'))
    extra('CANCEL', 'failed-reuse', lambda e: e['reuseResult'].update(outcome='failure'))
    extra('PREABORT', 'coverage-hole', lambda e: e['coverage']['segments'][0].update(to=99))
    extra('CONNECTIONS', 'over-max', lambda e: e['engineConnectionSamples'][0].update(count=3))
    extra('CONNECTIONS', 'baseline-no-samples', lambda e: e.update(engineConnectionSamples=[]))
    extra('SCRATCH', 'unresolved', lambda e: e.update(resolutionReceipts=[]))
    extra('NO-MUTATION', 'unbound-counter', lambda e: e.update(engineMutationCounterAfter=13), reseal=False)
    extra('NO-MUTATION', 'label-only', lambda e: e.update(counterSource={'kind': 'engine-update-counter'}), reseal=False)
    extra('RESOURCE', 'missing-owner', lambda e: e['peaks'].pop())
    extra('RESOURCE', 'forecast-over-envelope', lambda e: e['forecast'].update(memory=101))
    extra('RESOURCE', 'planner-cap', lambda e: e.update(obligation='G3.admission.preconstruction',
          forecast={'memory': 3758096385, 'disk': 100}, envelope={'memory': 3758096385, 'disk': 100, 'owners': ['engine', 'client']}))
    extra('AVAILABILITY', 'manual-restart', lambda e: e['events'].append({'kind': 'manual-restart', 't': 1}))
    extra('AVAILABILITY', 'before-failure', lambda e: e.update(tFailure=60001))
    extra('SCALE-COUNT', 'forged-analytic', lambda e: (e['analyticCount'].update(activeDomainFacts=2), e['countQueryCaseResult'].update(activeDomainFacts=2)))
    extra('WORK', 'zero-baseline', lambda e: e['comparison'].update(engineWorkUnits=dict.fromkeys(e['engineWorkUnits'], 0)))
    extra('WORK', 'wrong-threshold', lambda e: e.update(threshold='NS-P5-SWEEP-S'))
    extra('MAINTENANCE', 'no-events', lambda e: e.update(events=[]))
    extra('ERASURE-SCAN', 'missing-location', lambda e: e['scans'].pop())
    extra('ERASURE-SCAN', 'pre-publication-scan', lambda e: e['scans'][-1].update(tScan=0))
    extra('WATERMARK', 'unresolved-gap', lambda e: e['eligibility']['resolutions'].pop(0))
    extra('WATERMARK', 'scope-mismatch', lambda e: e['eligibility'].update(queryScope='other'))
    extra('WATERMARK', 'reconstruct-outside', lambda e: e['eligibility'].update(reconstructFrom=3))
    extra('WATERMARK', 'attribute-outside', lambda e: e['eligibility']['attributes'][0].update(to=1))
    extra('WATERMARK', 'erasure-behind', lambda e: e['eligibility'].update(erasureApplied=1))
    extra('WATERMARK', 'incarnation-reset', lambda e: e['eligibility']['snapshot']['answer'].update(incarnation='boot-2'))
    extra('WATERMARK', 'fallback-latency-excluded', lambda e: e.update(tRouteEnd=26))
    extra('WATERMARK', 'mapping-mismatch', lambda e: e['eligibility'].update(queryMappingGeneration=2))
    extra('ACK-ORDER', 'wrong-ack-owner', lambda e: e.update(ackSender='replica'))
    extra('FAULT-TRANSITIONS', 'durable-hash-mismatch', lambda e: e['transitions'][0]['durableEvidenceObject'].update(sha256='0' * 64))
    extra('FAULT-TRANSITIONS', 'wrong-variant', lambda e: e.update(variant='engine-source'))
    extra('FAULT-TRANSITIONS', 'readback-before-crash', lambda e: e['transitions'][0]['durableEvidenceObject'].update(tReadBack=1))
    # Positive extensions prevent blanket rejection of timeout, fallback and crypto evidence.
    def timeout(e):
        e.update(expectedError='E-TIMEOUT', callerError='E-TIMEOUT', tDeadline=0)
    extra('CANCEL', 'timeout-pass', timeout, 'PASS')
    extra('WATERMARK', 'fallback-pass', lambda e: e.update(route='fallback', fallbackIndex='idx'), 'PASS')
    def crypto(e, exclusive=True):
        key = {'subjectKey': 'subject-key-1', 'destroyedKey': 'subject-key-1', 'tDestroyed': 1,
               'survivingCopies': [{'id': 'cipher-1', 'encryptionKeys': ['subject-key-1'] if exclusive else ['other-key']}]}
        e['keyDestroyedEvidence'] = copy.deepcopy(key)
        e['scans'][0]['keyDestroyedEvidence'] = key
    extra('ERASURE-SCAN', 'exclusive-key-pass', crypto, 'PASS')
    extra('ERASURE-SCAN', 'nonexclusive-key', lambda e: crypto(e, False))
    def coordinate(e, epoch=1):
        def pos(value, ep=1):
            return {'stream': 's', 'epoch': ep, 'offset': value, 'ordinal': 0}
        e['basisPosition'] = pos(2); e['watermarkAtRead'] = pos(2, epoch)
        x = e['eligibility']; x['publishedPositions'] = [pos(1), pos(2)]
        x['resolutions'] = [{'position': pos(i), 'outcome': 'applied'} for i in (1, 2)]
        for k in ('exactCut', 'queryCut', 'reconstructTo', 'erasurePublished', 'erasureApplied'):
            x[k] = pos(2)
        x['reconstructFrom'] = pos(1); x['attributes'][0].update({'from': pos(1), 'to': pos(2)})
        for row in x['snapshot'].values():
            if isinstance(row, dict): row['marker'] = pos(2, epoch)
    extra('WATERMARK', 'coordinate-pass', coordinate, 'PASS')
    extra('WATERMARK', 'epoch-mismatch', lambda e: coordinate(e, 2))
    extra('NO-MUTATION', 'update-counter-pass', lambda e: e['counterSource'].update(kind='engine-update-counter'), 'PASS')
    scan_inventory = [dict(id=r['inventoryEntry'], category=r['inventoryEntry'], location=r['location'], scanMethod=r['scanMethod'], canary=r['positiveControl']['canary']) for r in scans]
    for case in cases:
        if case['protocol'] == 'OBS-ERASURE-SCAN':
            case['scanInventory'] = scan_inventory
    return cases


def run(oracle, cases):
    spec = importlib.util.spec_from_file_location('observed_oracle', oracle)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    contract = json.loads(CONTRACT.read_text())
    results = []
    for case in cases:
        try:
            with tempfile.TemporaryDirectory(prefix='obs-fixture-') as tmp:
                e, context, bundle, key = fixture(case, tmp, contract)
                report, code = module.check(case['protocol'], e, contract, context, bundle, key)
            ok = (report['verdict'] == 'PASS' and code == 0) if case['expected'] == 'PASS' else (report['verdict'] in ('FAIL', 'REFUSED') and code in (1, 2))
            results.append({'id': case['id'], 'ok': ok, 'verdict': report['verdict'], 'code': code, 'reasons': report['reasons']})
        except Exception as error:
            results.append({'id': case['id'], 'ok': False, 'error': str(error)})
    return {'passed': sum(r['ok'] for r in results), 'total': len(results), 'results': results}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--oracle', type=Path, default=HERE / 'observe.py')
    parser.add_argument('--write-fixtures', action='store_true')
    args = parser.parse_args()
    if args.write_fixtures:
        (HERE / 'fixtures.json').write_text(json.dumps(fixtures(), sort_keys=True, indent=2) + '\n')
    cases = json.loads((HERE / 'fixtures.json').read_text())
    result = run(args.oracle, cases)
    print(json.dumps(result, sort_keys=True))
    return 0 if result['passed'] == result['total'] else 1


if __name__ == '__main__':
    sys.exit(main())

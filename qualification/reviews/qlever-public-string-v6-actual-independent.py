"""Independent retained-row/event replay. No SDK, driver, endpoint or author helper import."""
import base64, hashlib, json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / '.devloop/jobs/qlever-public-string-extension-v6/attempts/0001/artifacts'
load = lambda p: json.loads(Path(p).read_bytes())
sha = lambda b: hashlib.sha256(b).hexdigest()
manifest = load(ROOT / 'qualification/native-jobs/qlever-public-string-extension-v6/manifest.json')
contract = load(ROOT / 'qualification/native-jobs/qlever-public-string-extension-v6/contract.json')
oracle = load(ROOT / 'qualification/extensions/string-order-v1/oracle.json')
report = load(ART / 'report.json')
responses = {v['id']: v for p in ART.glob('*-response.json') if isinstance(v := load(p), dict)}
assert len(responses) == 31 and len(report['sdkCallsAttempted']) == 31
assert set(responses) == set(contract['profile']['sdkCalls']) == set(report['sdkCallsAttempted'])
assert all(v['afterDeadline'] is False and 0 <= v['elapsedMsClientWall'] < 5000 for v in responses.values())
assert not list(ART.glob('*-error.json'))
value = lambda ident: responses[ident]['value']
ascii_rows = oracle['asciiInput']
unicode_rows = [{k: row[k] for k in ['entity', 'label']} for row in oracle['unicodeInput']]
asc = sorted(ascii_rows, key=lambda row: (row['label'], row['entity']))
desc = list(reversed(asc))  # all labels are distinct in this fixture
latest = sorted([{**row, 'label': '0'} if row['label'] == 'c' else row for row in ascii_rows], key=lambda row: (row['label'], row['entity']))
membership_expected = {'membershipExact': True, 'rowsByExpectedIdentity': unicode_rows, 'returnedCount': 7, 'uniqueIdentityCount': 7}
expected = {
    'string.ascii.order.asc.p1': asc, 'string.ascii.order.desc.p1': desc,
    'string.ascii.wrapper_gt_E.p1': [row for row in asc if row['label'] > 'E'],
    'string.ascii.wrapper_lt_c.p1': [row for row in asc if row['label'] < 'c'],
    'string.ascii.page.first.p1': asc[:2], 'string.ascii.page.continue_p1_after_p2': asc[2:],
    'string.ascii.page.reopen_p1_after_p2': asc[2:], 'string.ascii.latest.order.asc.p2': latest,
    'string.unicode.exact_membership': membership_expected,
}
native_expected = {**expected, 'string.sparql.unicode.order.asc': sorted(unicode_rows, key=lambda row: (row['label'], row['entity'])),
    'string.sparql.unicode.gt_private_use': sorted([row for row in unicode_rows if row['label'] > '\ue000'], key=lambda row: (row['label'], row['entity']))}
for kind, want in [('datalog', expected), ('native', native_expected)]:
    check = next(row for row in manifest['evidence']['checks'] if row['key'] == 'string-' + kind)
    assert load(ROOT / check['expectedInput']) == want

def rows(ident, native=False):
    result = value(ident)['rows' if native else 'results']
    prefix = '' if native else '?'
    assert all(set(row) == {prefix + 'entity', prefix + 'label'} for row in result)
    converted = [{'entity': row[prefix + 'entity'], 'label': row[prefix + 'label']} for row in result]
    assert all(isinstance(v, str) for row in converted for v in row.values())
    if native:
        raw = value(ident)['rawRows']
        assert len(raw) == len(converted)
        for a, b in zip(raw, converted):
            assert set(a) == {'entity', 'label'}
            assert all(a[key]['type'] in ['literal', 'typed-literal'] and a[key]['value'] == b[key] for key in ['entity', 'label'])
        trace = value(ident)['trace']
        assert trace['language'] == 'sparql-1.1' and trace['basis'] == value(ident)['basis']
        assert [step['phase'] for step in trace['steps']] == ['source-cut', 'answer']
        assert trace['steps'][-1]['query'] == trace['query']
    return converted

task_suffix = {'string.ascii.order.asc.p1': 'ascii-asc', 'string.ascii.order.desc.p1': 'ascii-desc',
    'string.ascii.wrapper_gt_E.p1': 'ascii-gt-E', 'string.ascii.wrapper_lt_c.p1': 'ascii-lt-c',
    'string.ascii.page.first.p1': 'page-first', 'string.ascii.page.continue_p1_after_p2': 'page-continue',
    'string.ascii.page.reopen_p1_after_p2': 'page-reopen', 'string.ascii.latest.order.asc.p2': 'latest'}
results = {}
for surface, native in [('qlever-datalog', False), ('qlever-native', True)]:
    prefix = 'native-' if native else 'datalog-'
    actual = {task: rows(prefix + suffix, native) for task, suffix in task_suffix.items()}
    membership_rows = rows('native-unicode-membership' if native else 'datalog-unicode-observe', native)
    member = len(membership_rows) == 7 and len({row['entity'] for row in membership_rows}) == 7 and {row['entity']: row['label'] for row in membership_rows} == {row['entity']: row['label'] for row in unicode_rows}
    actual['string.unicode.exact_membership'] = {'membershipExact': member,
        'rowsByExpectedIdentity': [{'entity': row['entity'], 'label': next((a['label'] for a in membership_rows if a['entity'] == row['entity']), None)} for row in unicode_rows],
        'returnedCount': len(membership_rows), 'uniqueIdentityCount': len({row['entity'] for row in membership_rows})}
    if native:
        actual['string.sparql.unicode.order.asc'] = rows('native-unicode-asc', True)
        actual['string.sparql.unicode.gt_private_use'] = rows('native-unicode-gt-private-use', True)
    assert actual == load(ART / ('native-answers.json' if native else 'datalog-answers.json'))
    want = native_expected if native else expected
    results[surface] = {'passed': sum(actual[key] == want[key] for key in want), 'failed': sum(actual[key] != want[key] for key in want),
        'tasks': {key: {'passed': actual[key] == want[key], 'actual': actual[key], 'expected': want[key]} for key in want}}

p1, up1, p2 = [value(key)['position'] for key in ['seed-ascii', 'seed-unicode', 'correct-ascii']]
assert (p1, up1, p2) == (1, 1, 2)
scopes = {'ascii': json.dumps(['triplex-scope-v1', 'test', 'test', contract['asciiScopeLabel'], 0], separators=(',', ':')),
          'unicode': json.dumps(['triplex-scope-v1', 'test', 'test', contract['unicodeScopeLabel'], 0], separators=(',', ':'))}
pages = {'datalog-ascii-gt-E', 'datalog-ascii-lt-c', 'datalog-page-first', 'datalog-page-continue', 'datalog-page-reopen'}
reads = [key for key in responses if key.startswith(('fresh-', 'native-')) or key.startswith('datalog-')]
assert len(reads) == 24
for key in reads:
    basis = value(key)['basis']; population = 'unicode' if 'unicode' in key else 'ascii'
    position = 0 if key.startswith('fresh-') else p2 if key.endswith('latest') else up1 if population == 'unicode' else p1
    assert basis['scope'] == scopes[population] and basis['recordedPosition'] == position and basis['validAt'] == 10.5
    if key in pages: assert basis['recordedAt'] == 1000.25
    if key.startswith('native-'): assert value(key)['trace']['basis'] == basis
original_cursor = value('datalog-page-first')['nextCursor']
assert original_cursor == report['fixture']['originalCursor']
envelope = json.loads(base64.urlsafe_b64decode(original_cursor + '=' * (-len(original_cursor) % 4)))
assert envelope['basis'] == {'recordedAt': 1000.25, 'recordedPosition': 1, 'validAt': 10.5}
assert envelope['values'] == ['c', 'string-order:ascii:02']
for key in ['datalog-page-continue', 'datalog-page-reopen']: assert value(key).get('nextCursor') is None
for key in ['native-page-continue', 'native-page-reopen']: assert 'LIMIT 2 OFFSET 2' in value(key)['trace']['query']

unwrap = lambda x: x.get('value') if x.get('_tag') == 'Some' else None
seed = value('seed-ascii'); corrected = value('correct-ascii'); ack = value('ack-correction')
for key, name in [('ascii', 'ascii'), ('unicode', 'unicode')]:
    receipt = value('seed-' + key); journal = value('ack-seed-' + key)
    assert journal['position'] == receipt['position'] and journal['txId'] == receipt['txId']
    assert journal['commandId'] == contract['runId'] + ':seed:' + name
    source = ascii_rows if key == 'ascii' else unicode_rows
    assert [(row['entityId'], row['value']) for row in receipt['triples']] == [(row['entity'], {'type': 'string', 'value': row['label']}) for row in source]
old_id, new_id = seed['triples'][2]['id'], corrected['triples'][0]['id']
history = [row for row in value('ascii-history') if row['attribute'] == ':string-order/label']
assert len(history) == 2 and corrected['retracted'] == 1 and len(corrected['triples']) == 1 and old_id != new_id
old = next(row for row in history if row['id'] == old_id); new = next(row for row in history if row['id'] == new_id)
assert old['value'] == {'type': 'string', 'value': 'c'} and new['value'] == {'type': 'string', 'value': '0'}
assert old['recordedAt'] == seed['instant'] and unwrap(old['txId']) == seed['txId']
assert unwrap(old['retractedAt']) == corrected['instant'] and unwrap(old['retractTxId']) == corrected['txId']
assert new['recordedAt'] == corrected['instant'] and unwrap(new['txId']) == corrected['txId'] and unwrap(new['retractedAt']) is None
assert ack['txId'] == corrected['txId'] and ack['position'] == p2 and len(ack['changes']) == 2
assert {(row['op'], row['tripleId']) for row in ack['changes']} == {('retract', old_id), ('assert', new_id)}
for row in history: assert row['validFrom'] == 10.25 and unwrap(row['validTo']) == 10.75
assert all(load(ART / 'public-invariants.json').values()) and len(load(ART / 'public-invariants.json')) == 9
assert report['cleanup']['pendingSdkCalls'] == 0 and report['cleanup']['otherQAtEnd'] == []
assert [row['settings']['query-planning-budget'] for row in report['settings'] if row['settings']] == ['100', '1', '100', '100']
assert len(report['settings']) == 7
identity_check = next(row for row in manifest['evidence']['checks'] if row['key'] == 'string-identity')
actual_identity, expected_identity = load(ART / 'input-identity.json'), load(ROOT / identity_check['expectedInput'])
assert actual_identity == expected_identity and (ART / 'input-identity.json').read_bytes() != (ROOT / identity_check['expectedInput']).read_bytes()
contradictions = {}
for key in ['datalog-ascii-gt-E', 'datalog-ascii-lt-c']:
    query = next(row['query'] for row in value(key)['debug']['queryPlan']['steps'] if row['label'] == 'main')
    assert '?v1_type IN ("number", "integer") && ?v1_type = "string"' in query
    contradictions[key] = {'querySha256': sha(query.encode()), 'kind': 'COMPILED_NUMERIC_AND_STRING_FAMILY_CONJUNCTION', 'actualRows': rows(key)}
pins = manifest['inputs']; drift = [row['path'] for row in pins if sha((ROOT / row['path']).read_bytes()) != row['sha256']]
assert not drift
out = {'format': 'triplex-qlever-string-actual-independent-row-replay/1', 'status': 'FAILED_EXTENSION_CONFIRMED_WITH_RETENTION_AND_SMALL_INVARIANTS_PASSED',
       'run': 'qlever-public-string-extension-v6/0001', 'sdkResponsesIndependentlyRead': 31, 'readBasesIndependentlyChecked': 24,
       'logicalTasks': results, 'publicInvariantsAllNine': True, 'originalCursorP1R': envelope['basis'],
       'seedAndCorrectionLineageRecomputed': True, 'settingsObservedSequence': ['100', '1', '100', '100'],
       'identityFileParsedEqualButBytesFail': True, 'wrapperPredicateContradictions': contradictions,
       'nativeAndTranslatedFailuresHaveNoAssumedSingleCause': True, 'currentDeclaredPins': len(pins), 'drift': drift,
       'reviewerBackendCalls': 0, 'sortingOfActualRows': False,
       'scope': 'Retained raw public responses/native RDF and query traces independently mapped to frozen task oracles; no new engine call or performance/full-capacity/default claim'}
dest = ROOT / 'qualification/reviews/qlever-public-string-v6-actual-row-independent.json'
dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'review': str(dest.relative_to(ROOT)), 'sha256': sha(dest.read_bytes()), 'tasks': {k: {x: v[x] for x in ['passed', 'failed']} for k, v in results.items()}, 'pins': len(pins)}))

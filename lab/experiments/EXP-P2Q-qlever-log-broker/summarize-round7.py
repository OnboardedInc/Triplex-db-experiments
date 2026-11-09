# [EXP-P2Q] Why: read back receipts and retained fields independently of the test runner.
# Rejected: treating process exit alone as evidence of exact-basis refusal.
import hashlib, json, pathlib, re
root = pathlib.Path.cwd()
base = root / 'lab/experiments/EXP-P2Q-qlever-log-broker/evidence-round7'
gates = ['q89c', 'controls', 'unit', 'typecheck', 'http-offline', 'basis-live', 'http-live']
summary = {'receipts': [], 'basisMatrices': [], 'httpLiveCases': 0}
for attempt in ['final', 'retry']:
    for gate in gates:
        path = base / attempt / (gate + '.json')
        receipt = json.loads(path.read_text())
        expected = 1 if (attempt, gate) == ('final', 'basis-live') else 0
        assert receipt['exitCode'] == expected, (attempt, gate, receipt['exitCode'])
        assert receipt['sourceStillMatches'] is True, (attempt, gate)
        log = base / attempt / (gate + '.log')
        assert hashlib.sha256(log.read_bytes()).hexdigest() == receipt['logSha256']
        for name, digest in receipt['sourceHashes'].items():
            if attempt == 'retry' or name.startswith('packages/'):
                assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest, name
        text = log.read_text()
        summary['receipts'].append({'attempt': attempt, 'gate': gate, 'head': receipt['head'],
            'exitCode': receipt['exitCode'], 'sourceStillMatches': True,
            'tests': re.findall(r'Tests\s+([^\n]+)', text)})
for label in ['offline', 'standard', 'fresh']:
    path = base / 'retry' / ('q89c' if label == 'offline' else 'basis-live') / ('round7-' + label + '-future.json')
    rows = json.loads(path.read_text())
    assert len(rows) == 80
    tuples = set()
    for row in rows:
        error = row['error']
        native = row['route'].startswith('select')
        pin = 2048 if label == 'offline' else 3072
        required = 6144 if label == 'offline' else 7168
        observed = pin if row['transaction'] and not native else 0 if label == 'offline' and native else 3071 if label == 'offline' else 4095
        replica = 'the transaction snapshot' if row['transaction'] and not native else 'the QLever replica' if native else "the broker's resolved prefix"
        assert row['ok'] is False
        assert (error['_tag'], error['reason'], error['required'], error['observed'], error['replica']) == ('ReadError', 'basis-not-reached', required, observed, replica), row
        assert error['waitedMs'] >= 39 and 39 <= row['elapsed'] < 2000
        tuples.add((row['route'], row['transaction'], row['subject'], 'recordedAt' in row))
    assert len(tuples) == 80
    summary['basisMatrices'].append({'label': label, 'cases': len(rows), 'tuples': len(tuples), 'required': required, 'pin': pin})
for path in sorted((base / 'retry' / 'http-live').glob('round4-live-*.json')):
    row = json.loads(path.read_text()); error = row['error']
    assert row['ok'] is False and row['upstream'] == 'http://127.0.0.1:7070'
    assert (error['reason'], error['required'], error['observed'], error['replica']) == ('replica-unreachable', 2048, 4095, 'the QLever replica')
    summary['httpLiveCases'] += 1
assert summary['httpLiveCases'] == 12
(base / 'SUMMARY.json').write_text(json.dumps(summary, indent=2) + '\n')
manifest = {str(path.relative_to(base)): hashlib.sha256(path.read_bytes()).hexdigest()
    for path in sorted(base.rglob('*')) if path.is_file() and path.name != 'MANIFEST.json'}
(base / 'MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(summary, indent=2))

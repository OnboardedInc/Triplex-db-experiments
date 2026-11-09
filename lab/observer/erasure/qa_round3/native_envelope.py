#!/usr/bin/env python3
"""Confirm the layered-envelope miss in the existing native SQLite remove-policy location."""
import base64
import hashlib
import json
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
from finish import read_manifest, ROOT, HERE, REPO, packed

sys.path.insert(0, str(REPO / 'lab/observer/erasure'))
from compile import compile_normalizer
from fixtures import make_frames


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    output = ROOT / 'native-envelope-01'
    output.mkdir(parents=True, exist_ok=False)
    own_pin = sha(Path(__file__).read_bytes())
    shutil.copyfile(__file__, output / 'native-envelope-executed.py')
    pins = json.loads((ROOT / 'probe-01/source-pins.json').read_bytes())
    for rel, pin in pins['observerSources'].items():
        assert sha((REPO / rel).read_bytes()) == pin
    spec = json.loads((ROOT / 'probe-01/nominal/case.json').read_bytes())
    payloads = {}
    for line in (ROOT / 'probe-01/nominal/raw.jsonl').read_bytes().splitlines():
        sample = json.loads(base64.b64decode(json.loads(line)['rawBase64']))
        payloads[sample['phase']] = {v['fileId']: base64.b64decode(v['bytes']) for v in sample['files']}
    target, live = (v['envelope'] for v in spec['envelopes'])
    twin = base64.b64decode(spec['plain']['twin']).decode()
    escaped = ('"' + ''.join('\\u%04x' % ord(c) for c in target) + '"').encode()
    token = base64.b64encode(escaped).decode()
    # [CX-VER01S-R3] Why: use an existing removing location and native SQLite, with no retention-policy override.
    # Rejected: relying solely on a synthetic log configured with remove retention.
    path = output / 'post-erasure.db'
    db = sqlite3.connect(path)
    try:
        db.execute('CREATE TABLE controls(value TEXT)')
        db.executemany('INSERT INTO controls VALUES (?)', [(twin,), (live,), ('INFO payload=' + token,)])
        db.commit()
        assert db.execute('PRAGMA integrity_check').fetchall() == [('ok',)]
        value = db.execute("SELECT value FROM controls WHERE value LIKE 'INFO%'").fetchone()[0].split('=', 1)[1]
        recovered = json.loads(base64.b64decode(value))
        assert recovered == target
        native = path.read_bytes()
    finally:
        db.close()
    assert spec['locations']['q-recent-rows-h1']['retention'] == 'remove'
    for phase in ('shred', 'rotate'):
        payloads[phase]['q-recent-rows-h1'] = native
    raw = make_frames(spec, payloads, output)
    parser = compile_normalizer(spec)
    (output / 'raw.jsonl').write_bytes(raw)
    (output / 'case.json').write_bytes(packed(spec))
    (output / 'normalizer.py').write_bytes(parser)
    process = subprocess.run([sys.executable, '-I', '-B', str(output / 'normalizer.py')], input=raw,
        capture_output=True, timeout=180)
    (output / 'stdout').write_bytes(process.stdout)
    (output / 'stderr').write_bytes(process.stderr)
    assert process.returncode == 0, process.stderr
    record = json.loads(process.stdout)
    (output / 'records.json').write_bytes(process.stdout)
    scan = next(v for v in record['scans'] if v['scan'] == 'C' and v['location'] == 'q-recent-rows-h1')
    result = {'candidate': pins['candidate'], 'runId': spec['runId'], 'aggregateObserved': record['status'],
        'scanObserved': scan['status'], 'observations': scan['observations'],
        'unparsedBytes': sum(v['unparsedBytes'] for p in scan['coverage'].values() for v in p.values()),
        'independentSqlJsonBase64EnvelopeSha256': sha(recovered.encode()), 'retentionPolicyChanged': False,
        'rawSha256': sha(raw), 'parserSha256': sha(parser), 'verifierSha256': own_pin,
        'unsafe': scan['status'] == 'PASS', 'claim': 'offline native SQLite remove-policy fixture, not live erasure acceptance'}
    for rel, pin in pins['observerSources'].items():
        assert sha((REPO / rel).read_bytes()) == pin
    assert sha(Path(__file__).read_bytes()) == own_pin
    (output / 'summary.json').write_bytes(packed(result))
    (output / 'SHA256SUMS').write_text('\n'.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(output))
        for p in sorted(output.rglob('*')) if p.is_file()) + '\n')
    index = json.loads((HERE / 'INDEX.json').read_bytes())
    index['readbacks'] = [read_manifest(Path(v['path']), v['manifestSha256']) for v in index['readbacks']]
    index['readbacks'].append(read_manifest(output))
    index['newScenarios'] += 1
    if result['unsafe']:
        index['unsafeScenarios'].append('native-envelope-remove-policy')
    (HERE / 'INDEX.json').write_bytes(packed(index) + b'\n')
    lines = [v['manifestSha256'] + '  ' + str(Path(v['path']) / 'SHA256SUMS') for v in index['readbacks']]
    for p in sorted(HERE.iterdir()):
        if p.is_file() and p.name not in ('SHA256SUMS', 'native-envelope-01.stdout', 'native-envelope-01.stderr'):
            lines.append(sha(p.read_bytes()) + '  ' + str(p))
    (HERE / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')
    print(json.dumps(result, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()

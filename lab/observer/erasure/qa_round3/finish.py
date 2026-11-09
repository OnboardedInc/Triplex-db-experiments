#!/usr/bin/env python3
"""Focused layered-envelope/key regressions, independent SQL readback and final evidence index."""
import base64
import copy
import hashlib
import json
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
ROOT = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/round3')
sys.path.insert(0, str(REPO / 'lab/observer/erasure'))
from compile import compile_normalizer
from fixtures import make_frames, fixture_record_file, packed


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    path.write_bytes(packed(value) + b'\n')


def read_manifest(directory, expected=None):
    path = directory / 'SHA256SUMS'
    raw = path.read_bytes()
    if expected:
        assert sha(raw) == expected, str(directory)
    seen, total = set(), 0
    for line in raw.decode().splitlines():
        pin, relative = line.split('  ', 1)
        source = (directory / relative).resolve()
        assert source.is_relative_to(directory.resolve()) and source not in seen
        seen.add(source)
        data = source.read_bytes()
        assert sha(data) == pin, str(source)
        total += len(data)
    actual = {p.resolve() for p in directory.rglob('*') if p.is_file() and p != path}
    assert seen == actual, str(directory)
    return {'path': str(directory), 'manifestSha256': sha(raw), 'files': len(seen), 'bytes': total}


def main():
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    output = ROOT / 'validation-01'
    output.mkdir(parents=True, exist_ok=False)
    probe = ROOT / 'probe-01'
    pins = json.loads((probe / 'source-pins.json').read_bytes())
    for relative, pin in pins['observerSources'].items():
        assert sha((REPO / relative).read_bytes()) == pin
    own_pin = sha(Path(__file__).read_bytes())
    shutil.copyfile(__file__, output / 'finish-executed.py')
    spec = json.loads((probe / 'nominal/case.json').read_bytes())
    payloads = {}
    for line in (probe / 'nominal/raw.jsonl').read_bytes().splitlines():
        sample = json.loads(base64.b64decode(json.loads(line)['rawBase64']))
        payloads[sample['phase']] = {v['fileId']: base64.b64decode(v['bytes']) for v in sample['files']}
    plain, twin = (base64.b64decode(spec['plain'][v]) for v in ('target', 'twin'))
    target, live = (v['envelope'].encode() for v in spec['envelopes'])
    focused = []

    def replay(name, case, changed, expected, oracle):
        directory = output / name
        directory.mkdir()
        raw = make_frames(case, changed, directory)
        parser = compile_normalizer(case)
        (directory / 'raw.jsonl').write_bytes(raw)
        save(directory / 'case.json', case)
        (directory / 'normalizer.py').write_bytes(parser)
        process = subprocess.run([sys.executable, '-I', '-B', str(directory / 'normalizer.py')],
            input=raw, capture_output=True, timeout=180)
        (directory / 'stdout').write_bytes(process.stdout)
        (directory / 'stderr').write_bytes(process.stderr)
        assert process.returncode == 0, process.stderr
        record = json.loads(process.stdout)
        save(directory / 'records.json', record)
        checked = []
        for scan, location in expected:
            row = next(v for v in record['scans'] if v['scan'] == scan and v['location'] == location)
            checked.append({'scan': scan, 'location': location, 'status': row['status'],
                'unparsedBytes': sum(v['unparsedBytes'] for phase in row['coverage'].values() for v in phase.values()),
                'observations': row.get('observations'), 'unsafe': row['status'] == 'PASS'})
        summary = {'name': name, 'aggregateObserved': record['status'], 'checks': checked,
            'unsafe': any(v['unsafe'] for v in checked), 'oracle': oracle,
            'rawSha256': sha(raw), 'parserSha256': sha(parser), 'runId': spec['runId']}
        save(directory / 'comparison.json', summary)
        focused.append(summary)
        print(name + ': ' + record['status'] + (' UNSAFE' if summary['unsafe'] else ''), flush=True)

    # [CX-VER01S-R3] Why: the first envelope probe's earlier cleartext-envelope phase masked the rotate miss.
    # Rejected: claiming aggregate PASS from a case that correctly failed at the shred phase.
    case, changed = copy.deepcopy(spec), copy.deepcopy(payloads)
    escaped = ('"' + ''.join('\\u%04x' % ord(c) for c in target.decode()) + '"').encode()
    encoded = base64.b64encode(escaped)
    assert json.loads(base64.b64decode(encoded)).encode() == target
    case['locations']['host-log']['retention'] = 'remove'
    for phase in ('shred', 'rotate'):
        changed[phase]['host-log'] = fixture_record_file([twin, live, b'INFO payload=' + encoded])
    replay('layered-envelope-both-post-phases', case, changed, [('C', 'host-log')],
        {'decodedEnvelopeSha256': sha(target), 'beforeControl': 'original exact target and live envelope',
         'postPhases': 'both retain only the base64-encoded JSON-escaped target, plus live control'})

    # [CX-VER01S-R3] Why: a complete fresh key record must not be omitted just because its outer scalar is base64.
    # Rejected: depending only on the bare-box interpretation of K's before-version matching.
    proof_script = HERE.parent / 'rewrap.mjs'
    fresh = json.loads((probe / 'independent-key-proof.json').read_bytes())['row']
    independent_input = json.loads((probe / 'independent-key-input.json').read_bytes())
    independent_input['key'] = fresh
    authenticated = json.loads(subprocess.check_output(['node', str(proof_script)], input=packed(independent_input)))
    assert authenticated['independentlyOpenedSha256'] == spec['envelopes'][0]['plainSha256']
    save(output / 'fresh-key-independent-input.json', independent_input)
    save(output / 'fresh-key-independent-proof.json', authenticated)
    record_text = json.dumps(fresh, separators=(',', ':')).encode()
    encoded = base64.b64encode(record_text)
    assert json.loads(base64.b64decode(encoded)) == fresh
    controls = [base64.b64decode(v['control']) for v in spec['keyNeedles'] if v['kind'] == 'wrapped']
    changed = copy.deepcopy(payloads)
    changed['rotate']['d-keys-heap'] = fixture_record_file(controls + [b'INFO payload=' + encoded])
    replay('base64-identified-fresh-key-record', spec, changed,
        [('K', 'd-keys-heap'), ('D', 'all-declared-key-copies')],
        {'decodedRecord': fresh, 'authenticatedPlainSha256': authenticated['independentlyOpenedSha256']})

    sql_checks = []
    # [CX-VER01S-R3] Why: validate actual SQLite snapshots independently of the observer's page parser.
    # Rejected: accepting a self-reported coverage partition as proof the seeded value was readable.
    for label, needle in (('plaintext', plain), ('envelope', target)):
        original = json.loads((probe / (label + '-sql-proof.json')).read_bytes())
        if label == 'plaintext':
            scenario = probe / 'plaintext-superseded-split-frames'
        else:
            scenario = probe / 'usable-key-envelope-superseded-frame'
        phase = json.loads(base64.b64decode(json.loads((scenario / 'raw.jsonl').read_bytes().splitlines()[-1])['rawBase64']))
        physical = {v['fileId']: base64.b64decode(v['bytes']) for v in phase['files']}
        for variant, wal_bytes, count in (
            ('native-before-delete', (probe / (label + '-before-delete.wal')).read_bytes(), 1),
            ('coalesced-final', physical['q-broker-wal'], 0),
        ):
            main_bytes = (probe / (label + '-main.db')).read_bytes()
            path = output / (label + '-' + variant + '.db')
            path.write_bytes(main_bytes)
            Path(str(path) + '-wal').write_bytes(wal_bytes)
            db = sqlite3.connect('file:' + str(path) + '?mode=ro', uri=True)
            try:
                assert db.execute('PRAGMA integrity_check').fetchall() == [('ok',)]
                rows = db.execute('SELECT value FROM sensitive').fetchall()
                assert len(rows) == count
                if rows:
                    assert needle in rows[0][0] and sha(rows[0][0]) == original['valueSha256']
                sql_checks.append({'label': label, 'variant': variant, 'targetRows': count,
                    'integrityCheck': 'ok', 'mainSha256': sha(main_bytes), 'walSha256': sha(wal_bytes),
                    'selectedValueSha256': sha(rows[0][0]) if rows else None})
            finally:
                db.close()
    path = output / 'layered-native.db'
    shutil.copyfile(probe / 'layered-log.db', path)
    db = sqlite3.connect('file:' + str(path) + '?mode=ro', uri=True)
    try:
        value = db.execute("SELECT value FROM logs WHERE value LIKE 'INFO%'").fetchone()[0].split('=', 1)[1]
        recovered = json.loads(base64.b64decode(value)).encode()
        assert recovered == plain
        sql_checks.append({'label': 'native-layered-value', 'decodedSha256': sha(recovered)})
    finally:
        db.close()
    save(output / 'sql-readback.json', sql_checks)
    for relative, pin in pins['observerSources'].items():
        assert sha((REPO / relative).read_bytes()) == pin
    assert sha((HERE / 'probe.py').read_bytes()) == pins['verifierSha256']
    assert sha(proof_script.read_bytes()) == pins['independentDecryptorSha256']
    assert sha(Path(__file__).read_bytes()) == own_pin
    save(output / 'summary.json', {'candidate': pins['candidate'], 'runId': spec['runId'], 'focusedScenarios': focused,
        'sqlChecks': sql_checks, 'verifierSha256': own_pin, 'scope': 'offline QA only; no semantic acceptance'})
    (output / 'SHA256SUMS').write_text('\n'.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(output))
        for p in sorted(output.rglob('*')) if p.is_file()) + '\n')
    builder = json.loads((REPO / 'lab/experiments/EXP-ER01-S/round3/INDEX.json').read_bytes())
    readbacks = [read_manifest(Path(builder['finalRun']), builder['manifestSha256'])]
    readbacks += [read_manifest(ROOT / name) for name in ('baseline-01', 'probe-01', 'validation-01')]
    probe_summary = json.loads((probe / 'summary.json').read_bytes())
    index = {'format': 'cx-ver01s-round3-index/1', 'candidate': pins['candidate'], 'verdict': 'FIX-FIRST',
        'runId': spec['runId'], 'historicalScenarios': 45, 'unitTests': 35, 'secondBlockFsstControl': True,
        'newScenarios': len(probe_summary['scenarios']) + len(focused), 'readbacks': readbacks,
        'unsafeScenarios': probe_summary['unsafeScenarios'] + [v['name'] for v in focused if v['unsafe']],
        'finding': 'inverse base64/hex scalar layers are absent from the additive escape closure',
        'claim': 'offline QA; no engine erasure PASS or promotion'}
    save(HERE / 'INDEX.json', index)
    lines = [v['manifestSha256'] + '  ' + str(Path(v['path']) / 'SHA256SUMS') for v in readbacks]
    for p in sorted(HERE.iterdir()):
        if p.is_file() and p.name not in ('SHA256SUMS', 'validation-01.stdout', 'validation-01.stderr'):
            lines.append(sha(p.read_bytes()) + '  ' + str(p))
    (HERE / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')
    print(json.dumps(index, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()

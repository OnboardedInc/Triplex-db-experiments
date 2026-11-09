#!/usr/bin/env python3
"""Fresh offline layered-encoding and physical-WAL controls for ER01-S round 3."""
import argparse
import base64
import copy
import hashlib
import json
from pathlib import Path
import shutil
import sqlite3
import struct
import subprocess
import sys
import time
from urllib.parse import unquote_to_bytes

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
SOURCE = REPO / 'lab/observer/erasure'
sys.path.insert(0, str(SOURCE))
from compile import compile_normalizer
from fixtures import make_fixture, make_frames, fixture_record_file, vocabulary, packed

CANDIDATE = 'bb90dfcdbeca8e6f13d2ecdef31f4de5a03ac847'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    path.write_bytes(packed(value) + b'\n')


def escaped_scalar(text):
    return ('"' + ''.join('\\u%04x' % ord(c) for c in text) + '"').encode()


def percent_bytes(value):
    return ''.join('%%%02x' % byte for byte in value).encode()


def coalesce_wal(raw):
    # [CX-VER01S-R3] Why: test a valid checksum stream where one transaction retains superseded images.
    # Rejected: invalid checksums (would only exercise the corruption refusal path).
    out = bytearray(raw)
    size = int.from_bytes(raw[8:12], 'big')
    commits = [i for i in range(32, len(raw), size + 24) if int.from_bytes(raw[i + 4:i + 8], 'big')]
    assert len(commits) == 2
    out[commits[0] + 4:commits[0] + 8] = bytes(4)
    a, b = struct.unpack('>II', raw[24:32])
    order = 'little' if raw[3] == 0x82 else 'big'
    for offset in range(32, len(raw), size + 24):
        body = out[offset:offset + 8] + out[offset + 24:offset + 24 + size]
        for i in range(0, len(body), 8):
            a = (a + int.from_bytes(body[i:i + 4], order) + b) & 0xffffffff
            b = (b + int.from_bytes(body[i + 4:i + 8], order) + a) & 0xffffffff
        struct.pack_into('>II', out, offset + 16, a, b)
    return bytes(out), commits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--output', required=True)
    args = ap.parse_args()
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    root = Path(args.output).resolve()
    root.mkdir(parents=True, exist_ok=False)
    source_pins = {}
    for path in sorted(SOURCE.rglob('*')):
        if path.is_file() and '__pycache__' not in str(path):
            relative = str(path.relative_to(REPO))
            expected = subprocess.check_output(['git', 'show', CANDIDATE + ':' + relative], cwd=REPO)
            assert path.read_bytes() == expected, relative
            source_pins[relative] = sha(expected)
    own_pin = sha(Path(__file__).read_bytes())
    proof_script = HERE.parent / 'rewrap.mjs'
    proof_pin = sha(proof_script.read_bytes())
    save(root / 'source-pins.json', {'candidate': CANDIDATE, 'observerSources': source_pins,
        'verifierSha256': own_pin, 'independentDecryptorSha256': proof_pin,
        'sqliteVersion': sqlite3.sqlite_version, 'scope': 'offline synthetic files; no engine acceptance'})
    shutil.copyfile(__file__, root / 'probe-executed.py')
    spec, payloads, _ = make_fixture(root / 'fixture')
    plain, twin = (base64.b64decode(spec['plain'][name]) for name in ('target', 'twin'))
    target, live = (row['envelope'].encode() for row in spec['envelopes'])
    results = []

    def replay(name, changed=None, case=None, required=(), oracle=None, nominal=False):
        changed = copy.deepcopy(payloads if changed is None else changed)
        case = copy.deepcopy(spec if case is None else case)
        directory = root / name
        directory.mkdir()
        raw = make_frames(case, changed, directory)
        parser = compile_normalizer(case)
        (directory / 'raw.jsonl').write_bytes(raw)
        (directory / 'normalizer.py').write_bytes(parser)
        save(directory / 'case.json', case)
        process = subprocess.run([sys.executable, '-I', '-B', str(directory / 'normalizer.py')],
            input=raw, capture_output=True, timeout=180)
        (directory / 'stdout').write_bytes(process.stdout)
        (directory / 'stderr').write_bytes(process.stderr)
        assert process.returncode == 0, (name, process.stderr.decode())
        record = json.loads(process.stdout)
        save(directory / 'records.json', record)
        rows = {(v['scan'], v['location']): v for v in record['scans']}
        checks = []
        for scan, location, expected_open in required:
            row = rows[(scan, location)]
            observed = row.get('observations', {}).get('rotate', [])
            if scan == 'D':
                found = bool(observed and observed[0]['opened'] == expected_open and observed[1]['opened'])
                detail = {'targetOpened': observed[0]['opened'] if observed else None,
                    'liveOpened': observed[1]['opened'] if observed else None}
            elif scan == 'K':
                hits = sum(v['targetHits'] for v in observed)
                found, detail = hits > 0, {'hits': hits}
            else:
                hits = observed.get('protectedHits' if scan == 'P' else 'targetHits', 0)
                found, detail = hits > 0, {'hits': hits}
            checks.append({'scan': scan, 'location': location, 'status': row['status'], **detail,
                'safe': found or row['status'] == 'REFUSED'})
        for row in record['scans']:
            for phase, files in row.get('coverage', {}).items():
                for file_id, report in files.items():
                    assert report['parsedBytes'] + report['unparsedBytes'] == report['size']
                    assert sha(changed[phase][file_id]) == report['sha256']
                    if row['status'] == 'PASS':
                        assert report['unparsedBytes'] == 0
                    if report.get('format') == 'sqlite-wal/4':
                        wal = changed[phase][file_id]
                        size = report['pageSize']
                        assert [v['frameOffset'] for v in report['physicalImages']] == list(range(32, len(wal), size + 24))
                        for image in report['physicalImages']:
                            a, b = image['bodyRange']
                            assert [a, b] == [image['frameOffset'] + 24, image['frameOffset'] + 24 + size]
                            assert sha(wal[a:b]) == image['bodySha256']
                            cov = image['coverage']
                            assert cov['parsedBytes'] + cov['unparsedBytes'] == size
                            assert cov['parsedRanges'] == [[max(x, a) - a, min(y, b) - a] for x, y in report['parsedRanges'] if max(x, a) < min(y, b)]
        if nominal:
            assert record['status'] == 'PASS', record
        comparison = {'name': name, 'aggregateObserved': record['status'], 'checks': checks,
            'unsafe': any(not v['safe'] for v in checks), 'oracle': oracle or {},
            'runId': case['runId'], 'slot': case['slot'], 'engineContainerId': case['engineContainerId'],
            'rawSha256': sha(raw), 'parserSha256': sha(parser),
            'claim': 'mutation of one fresh synthetic fixture; not live collection or semantic acceptance'}
        save(directory / 'comparison.json', comparison)
        results.append(comparison)
        print(name + ': ' + record['status'] + (' UNSAFE' if comparison['unsafe'] else ''), flush=True)
        return record

    replay('nominal', nominal=True)
    encoded = base64.b64encode(escaped_scalar(plain.decode()))
    assert json.loads(base64.b64decode(encoded)) == plain.decode()
    changed = copy.deepcopy(payloads)
    changed['rotate']['host-log'] = fixture_record_file([twin, live, b'INFO payload=' + encoded])
    replay('base64-of-json-escaped-plaintext', changed, required=[('P', 'host-log', None)],
        oracle={'independentlyDecodedSha256': sha(plain), 'layers': ['base64', 'JSON Unicode string']})

    path = root / 'layered-log.db'
    db = sqlite3.connect(path)
    try:
        db.execute('CREATE TABLE logs(value TEXT)')
        db.executemany('INSERT INTO logs VALUES (?)', [(twin.decode(),), (live.decode(),), ('INFO payload=' + encoded.decode(),)])
        db.commit()
        stored = db.execute("SELECT value FROM logs WHERE value LIKE 'INFO%'").fetchone()[0].split('=', 1)[1]
        assert json.loads(base64.b64decode(stored)) == plain.decode()
        native = path.read_bytes()
    finally:
        db.close()
    changed = copy.deepcopy(payloads)
    changed['rotate']['q-recent-rows-h1'] = native
    replay('base64-json-escaped-native-sqlite', changed, required=[('P', 'q-recent-rows-h1', None)],
        oracle={'sqlBase64JsonSha256': sha(plain), 'schema': 'logs(value TEXT)'})

    encoded_cipher = base64.b64encode(escaped_scalar(target.decode()))
    assert json.loads(base64.b64decode(encoded_cipher)).encode() == target
    changed = copy.deepcopy(payloads)
    changed['rotate']['host-log'] = fixture_record_file([twin, live, b'INFO payload=' + encoded_cipher])
    case = copy.deepcopy(spec)
    case['locations']['host-log']['retention'] = 'remove'
    replay('base64-json-escaped-envelope', changed, case, [('C', 'host-log', None)],
        oracle={'decodedEnvelopeSha256': sha(target), 'retention': 'remove'})

    hex_in_url = percent_bytes(plain.hex().encode())
    assert bytes.fromhex(unquote_to_bytes(hex_in_url).decode()) == plain
    changed = copy.deepcopy(payloads)
    changed['rotate']['host-log'] = fixture_record_file([twin, live, b'INFO payload=' + hex_in_url])
    replay('hex-inside-url-encoded-string', changed, required=[('P', 'host-log', None)],
        oracle={'unquoteHexSha256': sha(plain)})
    reverse_hex = percent_bytes(plain).hex().encode()
    assert unquote_to_bytes(bytes.fromhex(reverse_hex.decode())) == plain
    changed['rotate']['host-log'] = fixture_record_file([twin, live, b'INFO payload=' + reverse_hex])
    replay('hex-of-url-encoded-string', changed, required=[('P', 'host-log', None)],
        oracle={'hexUnquoteSha256': sha(plain)})

    key_rows = json.loads(payloads['before']['keys-backup'])['rows']
    key = next(v for v in key_rows if v['epoch'] == 2 and v['keyId'] != key_rows[-1]['keyId'])
    epoch = next(v for v in json.loads(payloads['rotate']['kms-records'])['rows'] if v['epoch'] == 2)
    proof_input = {'root': payloads['rotate']['root'].decode(), 'epoch': epoch, 'key': key, 'envelope': spec['envelopes'][0]}
    proof = json.loads(subprocess.check_output(['node', str(proof_script)], input=packed(proof_input)))
    assert proof['independentlyOpenedSha256'] == spec['envelopes'][0]['plainSha256']
    save(root / 'independent-key-input.json', proof_input)
    save(root / 'independent-key-proof.json', proof)
    wrapped = base64.b64decode(key['wrapped'])
    controls = [base64.b64decode(v['control']) for v in spec['keyNeedles'] if v['kind'] == 'wrapped']
    key_encoded = base64.b64encode(escaped_scalar(wrapped.hex()))
    assert bytes.fromhex(json.loads(base64.b64decode(key_encoded))) == wrapped
    changed = copy.deepcopy(payloads)
    changed['rotate']['d-keys-heap'] = fixture_record_file(controls + [b'INFO payload=' + key_encoded])
    replay('base64-json-escaped-usable-key', changed,
        required=[('K', 'd-keys-heap', None), ('D', 'all-declared-key-copies', True)],
        oracle={'decodedKeySha256': sha(wrapped), 'authenticatedPlainSha256': proof['independentlyOpenedSha256']})
    url_key = percent_bytes(wrapped.hex().encode())
    assert bytes.fromhex(unquote_to_bytes(url_key).decode()) == wrapped
    changed['rotate']['d-keys-heap'] = fixture_record_file(controls + [b'INFO payload=' + url_key])
    replay('url-encoded-hex-usable-key', changed,
        required=[('K', 'd-keys-heap', None), ('D', 'all-declared-key-copies', True)],
        oracle={'decodedKeySha256': sha(wrapped), 'authenticatedPlainSha256': proof['independentlyOpenedSha256']})

    def wal_history(needle, label):
        # [CX-VER01S-R3] Why: real SQLite page/frame boundaries separate the exact marker bytes.
        # Rejected: splitting an arbitrary flat file (does not test native overflow dependencies).
        for prefix in range(620, 720):
            path = root / (label + '-search.db')
            if path.exists():
                path.unlink()
            db = sqlite3.connect(path)
            try:
                db.execute('PRAGMA page_size=512')
                db.execute('PRAGMA journal_mode=WAL')
                db.execute('PRAGMA wal_autocheckpoint=0')
                db.execute('PRAGMA secure_delete=ON')
                db.execute('CREATE TABLE controls(value BLOB)')
                db.executemany('INSERT INTO controls VALUES (?)', [(twin,), (live,)])
                db.execute('CREATE TABLE sensitive(value BLOB)')
                db.commit()
                db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
                main = path.read_bytes()
                value = b'x' * prefix + needle + b'y' * (1700 - prefix - len(needle))
                db.execute('INSERT INTO sensitive VALUES (?)', (value,))
                db.commit()
                assert db.execute('SELECT value FROM sensitive').fetchone()[0] == value
                before_delete = Path(str(path) + '-wal').read_bytes()
                if needle in before_delete:
                    continue
                db.execute('DELETE FROM sensitive')
                db.commit()
                after_delete = Path(str(path) + '-wal').read_bytes()
                assert db.execute('PRAGMA integrity_check').fetchall() == [('ok',)]
                assert db.execute('SELECT COUNT(*) FROM sensitive').fetchone()[0] == 0
                for suffix, data in (('main.db', main), ('before-delete.wal', before_delete), ('after-delete.wal', after_delete)):
                    (root / (label + '-' + suffix)).write_bytes(data)
                evidence = {'needleSha256': sha(needle), 'valueSha256': sha(value), 'prefixBytes': prefix,
                    'pageSize': 512, 'valueBytes': len(value), 'rawNeedlePresent': False, 'latestSqlTargetRows': 0,
                    'mainSha256': sha(main), 'beforeWalSha256': sha(before_delete), 'afterWalSha256': sha(after_delete)}
                save(root / (label + '-sql-proof.json'), evidence)
                return main, before_delete, after_delete, evidence
            finally:
                db.close()
        raise AssertionError('could not construct ' + label + ' frame-boundary seed')

    main, first_wal, deleted_wal, oracle = wal_history(plain, 'plaintext')
    changed = copy.deepcopy(payloads)
    changed['rotate']['q-broker-sqlite'] = main
    changed['rotate']['q-broker-wal'] = first_wal
    replay('plaintext-split-across-wal-frames', changed,
        required=[('P', 'q-broker-wal', None)], oracle=oracle)
    changed['rotate']['q-broker-wal'], commits = coalesce_wal(deleted_wal)
    replay('plaintext-superseded-split-frames', changed,
        required=[('P', 'q-broker-wal', None)], oracle={**oracle, 'commitBoundaryModified': True, 'originalCommitOffsets': commits})

    main, first_wal, deleted_wal, oracle = wal_history(target, 'envelope')
    changed = copy.deepcopy(payloads)
    # [CX-VER01S-R3] Why: make the superseded frame the only declared physical envelope copy after rotation.
    # Rejected: allowing a second current data file to mask a missed historical envelope.
    for location, config in spec['locations'].items():
        if 'C' not in config['scans']:
            continue
        selected = [(file_id, item) for file_id, item in spec['inventory'].items() if item['location'] == location]
        if selected[0][1]['codec'] == 'qlever-fsst-squared-le64/0.6':
            parts = vocabulary([twin, live])
            for file_id, item in selected:
                changed['rotate'][file_id] = parts[item['part']]
        elif location not in ('q-broker-sqlite', 'q-broker-wal', 'q-recent-rows-h1'):
            for file_id, item in selected:
                changed['rotate'][file_id] = fixture_record_file([twin, live])
    changed['rotate']['q-broker-sqlite'] = main
    changed['rotate']['q-broker-wal'] = deleted_wal
    for file_id, data in changed['rotate'].items():
        assert target not in data, file_id
    changed['rotate']['d-keys-heap'] = fixture_record_file(controls + [wrapped.hex().encode()])
    replay('usable-key-envelope-superseded-commit', changed,
        required=[('C', 'q-broker-wal', None), ('K', 'd-keys-heap', None), ('D', 'all-declared-key-copies', True)],
        oracle={**oracle, 'keyInDifferentFile': 'd-keys-heap', 'authenticatedPlainSha256': proof['independentlyOpenedSha256'],
            'physicalEnvelopeCopy': 'q-broker-wal old frames only; EI case envelope is evaluator input'})
    changed['rotate']['q-broker-wal'], commits = coalesce_wal(deleted_wal)
    replay('usable-key-envelope-superseded-frame', changed,
        required=[('C', 'q-broker-wal', None), ('D', 'all-declared-key-copies', True)],
        oracle={**oracle, 'commitBoundaryModified': True, 'originalCommitOffsets': commits,
            'authenticatedPlainSha256': proof['independentlyOpenedSha256']})
    changed['rotate']['d-keys-heap'] = payloads['rotate']['d-keys-heap']
    replay('removed-key-envelope-superseded-frame', changed,
        required=[('C', 'q-broker-wal', None), ('D', 'all-declared-key-copies', False)],
        oracle={**oracle, 'expectedOpen': False, 'liveMustOpen': True, 'commitBoundaryModified': True})

    for relative, pin in source_pins.items():
        assert sha((REPO / relative).read_bytes()) == pin, relative
    assert sha(Path(__file__).read_bytes()) == own_pin
    assert sha(proof_script.read_bytes()) == proof_pin
    summary = {'candidate': CANDIDATE, 'runId': spec['runId'], 'scenarios': results,
        'unsafeScenarios': [v['name'] for v in results if v['unsafe']], 'completedAtUnixMs': time.time_ns() // 1000000,
        'claim': 'offline QA only; positive reproduction status is not an erasure PASS'}
    save(root / 'summary.json', summary)
    lines = [sha(p.read_bytes()) + '  ' + str(p.relative_to(root)) for p in sorted(root.rglob('*')) if p.is_file()]
    (root / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')
    print(json.dumps({'output': str(root), 'scenarios': len(results), 'unsafe': summary['unsafeScenarios'],
        'manifestSha256': sha((root / 'SHA256SUMS').read_bytes())}), flush=True)


if __name__ == '__main__':
    main()

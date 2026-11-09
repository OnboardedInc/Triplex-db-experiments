#!/usr/bin/env python3
"""Independent offline controls for candidate 4750d83; preserves unsafe observations."""
import argparse
import base64
import copy
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import sqlite3
import struct
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
SOURCE = REPO / 'lab/observer/erasure'
sys.path.insert(0, str(SOURCE))
from compile import compile_normalizer
from fixtures import make_fixture, make_frames, fixture_record_file, packed, vocabulary

CANDIDATE = '4750d83b'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    path.write_bytes(packed(value) + b'\n')


def native_toast(value, raw_size, compression):
    # [CX-VER01S-R2] Why: independently lay out PG16 chunks rather than call the SUT fixture encoder.
    # Rejected: a renamed raw byte file (does not exercise TOAST reconstruction).
    pages = []
    for seq, at in enumerate(range(0, len(value), 1996)):
        chunk = value[at:at + 1996]
        tup = bytearray(24)
        struct.pack_into('<HHB', tup, 18, 3, 2, 24)
        tup.extend(struct.pack('<IiI', 700, seq, (len(chunk) + 4) << 2))
        tup.extend(chunk)
        start = (8192 - len(tup)) & ~7
        page = bytearray(8192)
        struct.pack_into('<HHHH', page, 12, 28, start, 8192, 8196)
        struct.pack_into('<I', page, 24, start | (1 << 15) | (len(tup) << 17))
        page[start:start + len(tup)] = tup
        pages.append(bytes(page))
    return b''.join(pages), [{'id': 700, 'rawSize': raw_size, 'externalSize': len(value), 'compression': compression}]


def pglz_repeat(prefix, copies):
    # [CX-VER01S-R2] Why: compressed controls must independently recover to the exact seeded bytes.
    # Rejected: checking only that the observer's own compressor/decompressor agree.
    tokens = [(False, bytes([b])) for b in prefix]
    left = len(prefix) * (copies - 1)
    distance = len(prefix)
    while left:
        count = min(273, left)
        if count < 3:
            tokens.extend((False, bytes([b])) for b in prefix[:count])
        elif count < 18:
            tokens.append((True, bytes([((distance >> 8) << 4) | (count - 3), distance & 255])))
        else:
            tokens.append((True, bytes([((distance >> 8) << 4) | 15, distance & 255, count - 18])))
        left -= count
    result = bytearray()
    for i in range(0, len(tokens), 8):
        group = tokens[i:i + 8]
        result.append(sum((1 << j) for j, (match, _) in enumerate(group) if match))
        result.extend(b''.join(value for _, value in group))
    return bytes(result)


def independent_pglz(stream):
    result, at = bytearray(), 0
    while at < len(stream):
        mask = stream[at]
        at += 1
        for bit in range(8):
            if at == len(stream):
                break
            if mask & (1 << bit):
                first, second = stream[at:at + 2]
                at += 2
                count, distance = (first & 15) + 3, ((first & 240) << 4) + second
                if count == 18:
                    count += stream[at]
                    at += 1
                for _ in range(count):
                    result.append(result[-distance])
            else:
                result.append(stream[at])
                at += 1
    return bytes(result)


def recalculate_wal(raw, remove_first_commit=False):
    # [CX-VER01S-R2] Why: multiple page images in one transaction are legal with cache spill.
    # Rejected: corrupting the checksum (would test refusal, not superseded-frame coverage).
    out = bytearray(raw)
    size = int.from_bytes(raw[8:12], 'big')
    order = 'little' if raw[3] == 0x82 else 'big'
    a, b = struct.unpack('>II', raw[24:32])
    commits = []
    for offset in range(32, len(raw), size + 24):
        if int.from_bytes(raw[offset + 4:offset + 8], 'big'):
            commits.append(offset)
    if remove_first_commit:
        assert len(commits) >= 2
        out[commits[0] + 4:commits[0] + 8] = bytes(4)
    for offset in range(32, len(raw), size + 24):
        data = out[offset:offset + 8] + out[offset + 24:offset + 24 + size]
        for i in range(0, len(data), 8):
            a = (a + int.from_bytes(data[i:i + 4], order) + b) & 0xffffffff
            b = (b + int.from_bytes(data[i + 4:i + 8], order) + a) & 0xffffffff
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
    pins = {}
    for path in sorted(SOURCE.rglob('*')):
        if path.is_file() and '__pycache__' not in str(path):
            rel = str(path.relative_to(REPO))
            expected = subprocess.check_output(['git', 'show', CANDIDATE + ':' + rel], cwd=REPO)
            assert path.read_bytes() == expected, rel
            pins[rel] = sha(expected)
    own_sha = sha(Path(__file__).read_bytes())
    save(root / 'source-pins.json', {'candidate': subprocess.check_output(['git', 'rev-parse', CANDIDATE], cwd=REPO).decode().strip(),
        'sourceSha256': pins, 'verifierSha256': own_sha, 'sqliteVersion': sqlite3.sqlite_version,
        'claim': 'offline synthetic acquisition only; no native engine slot or semantic acceptance'})
    shutil.copyfile(__file__, root / 'probe-executed.py')
    spec, payloads, _ = make_fixture(root / 'fixture')
    plain = base64.b64decode(spec['plain']['target'])
    twin = base64.b64decode(spec['plain']['twin'])
    target = spec['envelopes'][0]['envelope'].encode()
    live = spec['envelopes'][1]['envelope'].encode()
    outcomes = []

    def replay(name, changed=None, case=None, required=(), oracle=None, baseline=False):
        case = copy.deepcopy(spec if case is None else case)
        changed = copy.deepcopy(payloads if changed is None else changed)
        directory = root / name
        directory.mkdir()
        raw = make_frames(case, changed, directory)
        parser = compile_normalizer(case)
        (directory / 'raw.jsonl').write_bytes(raw)
        (directory / 'normalizer.py').write_bytes(parser)
        save(directory / 'case.json', case)
        proc = subprocess.run([sys.executable, '-I', '-B', str(directory / 'normalizer.py')],
            input=raw, capture_output=True, timeout=180)
        (directory / 'stdout').write_bytes(proc.stdout)
        (directory / 'stderr').write_bytes(proc.stderr)
        assert proc.returncode == 0, (name, proc.stderr.decode())
        record = json.loads(proc.stdout)
        save(directory / 'records.json', record)
        rows = {(r['scan'], r['location']): r for r in record['scans']}
        checks = []
        for scan, loc in required:
            row = rows[(scan, loc)]
            hits = sum(v.get('protectedHits', 0) if scan == 'P' else v.get('targetHits', 0)
                for phase, v in row.get('observations', {}).items() if phase != 'before') if scan in ('P', 'C') else 0
            checks.append({'scan': scan, 'location': loc, 'observed': row['status'], 'hits': hits,
                'safe': row['status'] in ('FAIL', 'REFUSED')})
        for row in record['scans']:
            for phase in row.get('coverage', {}).values():
                for cov in phase.values():
                    assert cov['parsedBytes'] + cov['unparsedBytes'] == cov['size']
                    assert row['status'] != 'PASS' or cov['unparsedBytes'] == 0
        if baseline:
            assert record['status'] == 'PASS', record
        comparison = {'name': name, 'aggregateObserved': record['status'], 'checks': checks,
            'unsafe': any(not c['safe'] for c in checks) if not baseline else False,
            'oracle': oracle or {}, 'inputRunId': case['runId'], 'slot': case['slot'],
            'rawSha256': sha(raw), 'parserSha256': sha(parser),
            'claim': 'fresh synthetic fixture mutation; PASS observations are potential defects, not promotion'}
        save(directory / 'comparison.json', comparison)
        outcomes.append(comparison)
        print(name + ': ' + record['status'] + (' UNSAFE' if comparison['unsafe'] else ''), flush=True)
        return record

    replay('nominal', baseline=True)

    # [CX-VER01S-R2] Why: a known SQLite value can span two overflow pages and later be freed.
    # Rejected: appending contiguous markers (cannot test chain reconstruction).
    captured = None
    for prefix in range(650, 720):
        path = root / 'overflow-search.db'
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
            base_main = path.read_bytes()
            value = b'x' * prefix + plain + b'y' * (1700 - prefix - len(plain))
            db.execute('INSERT INTO sensitive VALUES (?)', (value,))
            db.commit()
            assert db.execute('SELECT value FROM sensitive').fetchone()[0] == value
            first_wal = Path(str(path) + '-wal').read_bytes()
            if plain in first_wal:
                continue
            # [CX-VER01S-R2] Why: reconstruct the committed image without resetting the live WAL.
            # Rejected: checkpoint before DELETE (can recycle the historical frames being tested).
            image = bytearray(base_main)
            for offset in range(32, len(first_wal), 512 + 24):
                number, commit = struct.unpack('>II', first_wal[offset:offset + 8])
                image.extend(bytes(max(0, number * 512 - len(image))))
                image[(number - 1) * 512:number * 512] = first_wal[offset + 24:offset + 24 + 512]
                if commit:
                    image = image[:commit * 512]
            populated_main = bytes(image)
            if plain in populated_main:
                continue
            db.execute('DELETE FROM sensitive')
            db.commit()
            deleted_wal = Path(str(path) + '-wal').read_bytes()
            assert db.execute('PRAGMA integrity_check').fetchall() == [('ok',)]
            assert db.execute('SELECT COUNT(*) FROM sensitive').fetchone()[0] == 0
            captured = base_main, populated_main, first_wal, deleted_wal, value, prefix
            break
        finally:
            db.close()
    assert captured is not None, 'could not seed a genuine cross-overflow-page needle'
    base_main, populated_main, first_wal, deleted_wal, value, prefix = captured
    oracle = {'sqlValueSha256': sha(value), 'needleSha256': sha(plain), 'prefixBytes': prefix, 'pageSize': 512,
        'needleContiguousInMain': False, 'needleContiguousInWal': False, 'valueBytes': len(value), 'integrityCheck': 'ok'}
    changed = copy.deepcopy(payloads)
    changed['rotate']['q-broker-sqlite'] = populated_main
    changed['rotate']['q-broker-wal'] = first_wal
    replay('two-overflow-pages', changed, required=[('P', 'q-broker-sqlite'), ('P', 'q-broker-wal')], oracle=oracle)
    changed['rotate']['q-broker-sqlite'] = base_main
    changed['rotate']['q-broker-wal'] = deleted_wal
    replay('superseded-committed-wal', changed, required=[('P', 'q-broker-wal')], oracle={**oracle, 'latestSqlTargetRows': 0})
    coalesced, commits = recalculate_wal(deleted_wal, remove_first_commit=True)
    changed['rotate']['q-broker-wal'] = coalesced
    save(root / 'wal-original-proof.json', {**oracle, 'originalCommitOffsets': commits,
        'baseMainSha256': sha(base_main), 'beforeDeleteWalSha256': sha(first_wal), 'afterDeleteWalSha256': sha(deleted_wal)})
    (root / 'pre-delete.wal').write_bytes(first_wal)
    (root / 'base-main.db').write_bytes(base_main)
    (root / 'after-delete.wal').write_bytes(deleted_wal)
    replay('superseded-within-commit-wal', changed, required=[('P', 'q-broker-wal')],
        oracle={**oracle, 'originalCommitOffsets': commits,
            'construction': 'native SQLite frames; first commit boundary removed and all frame checksums recomputed',
            'claim': 'checksummed native-layout WAL, no stock writer claim for the modified transaction boundary'})

    path = root / 'freelist.db'
    db = sqlite3.connect(path)
    try:
        db.execute('PRAGMA page_size=512')
        db.execute('PRAGMA secure_delete=OFF')
        db.execute('CREATE TABLE controls(value BLOB)')
        db.executemany('INSERT INTO controls VALUES (?)', [(twin,), (live,)])
        db.execute('CREATE TABLE sensitive(value BLOB)')
        db.execute('INSERT INTO sensitive VALUES (?)', (plain * 1000,))
        db.commit()
        db.execute('DELETE FROM sensitive')
        db.commit()
        free_count = db.execute('PRAGMA freelist_count').fetchone()[0]
        assert free_count > 0
        raw = path.read_bytes()
        assert plain in raw
    finally:
        db.close()
    changed = copy.deepcopy(payloads)
    changed['rotate']['q-recent-rows-h1'] = raw
    replay('freelist-page', changed, required=[('P', 'q-recent-rows-h1')], oracle={'freelistPages': free_count, 'rawContainsNeedle': True})

    stream = pglz_repeat(plain, 20)
    decompressed = independent_pglz(stream)
    assert decompressed == plain * 20
    compressed = struct.pack('<I', len(decompressed)) + stream
    assert len(compressed) < len(decompressed)
    toast, decl = native_toast(compressed, len(decompressed), 'pglz')
    assert plain not in toast
    case, changed = copy.deepcopy(spec), copy.deepcopy(payloads)
    case['inventory']['host-log'].update(codec='postgres-toast/16-le8192', toastValues=decl)
    for phase in ('before', 'shred'):
        before_toast, before_decl = native_toast(twin + b'\x00' + live + b'\x00' + target, len(twin + b'\x00' + live + b'\x00' + target), 'none')
        changed[phase]['host-log'] = before_toast
    payload = twin + b'\x00' + live + b'\x00' + decompressed
    stream = pglz_repeat(payload, 10)
    assert independent_pglz(stream) == payload * 10
    changed['rotate']['host-log'], after_decl = native_toast(struct.pack('<I', len(payload) * 10) + stream, len(payload) * 10, 'pglz')
    case['inventory']['host-log'].pop('toastValues')
    case['inventory']['host-log']['toastValuesByPhase'] = {'before': before_decl, 'shred': before_decl, 'rotate': after_decl}
    replay('toast-pglz', changed, case, [('P', 'host-log')], oracle={'decodedSha256': sha(payload * 10), 'encoder': 'independent PG16 layout and pglz vector; no server invocation'})

    changed, case = copy.deepcopy(payloads), copy.deepcopy(spec)
    case['inventory']['x-buffer-l0']['codec'] = 'xtdb-arrow-block/unknown'
    block = b'ARROW1' + gzip.compress(twin + b'\x00' + live + b'\x00' + target + b'\x00' + plain) + b'ARROW1'
    assert plain in gzip.decompress(block[6:-6])
    changed['rotate']['x-buffer-l0'] = block
    replay('xtdb-buffer-block', changed, case, [('P', 'x-buffer-l0')], oracle={'claim': 'opaque IPC-like block; not a native XTDB serialization qualification', 'independentGzipContainsNeedle': True})

    changed = copy.deepcopy(payloads)
    for part, data in vocabulary([twin, live, target, plain]).items():
        changed['rotate']['q-vocabulary:' + part] = data
    replay('qlever-vocabulary-word', changed, required=[('P', 'q-vocabulary')], oracle={'decodedExpectedSha256': sha(plain), 'profile': 'FSST-squared word'})

    encoded = base64.b64encode(plain).decode()
    log = b'INFO event=' + packed({'value': encoded})
    changed = copy.deepcopy(payloads)
    changed['rotate']['host-log'] = fixture_record_file([twin, live, log])
    replay('base64-json-log', changed, required=[('P', 'host-log')], oracle={'decodedValueSha256': sha(base64.b64decode(json.loads(log[11:])['value']))})
    escaped = ''.join('\\u%04x' % ord(char) for char in encoded)
    log = ('INFO event={"value":"' + escaped + '"}').encode()
    assert base64.b64decode(json.loads(log[11:])['value']) == plain
    changed['rotate']['host-log'] = fixture_record_file([twin, live, log])
    replay('escaped-base64-json-log', changed, required=[('P', 'host-log')], oracle={'independentlyDecodedSha256': sha(plain), 'json': 'each base64 character uses legal Unicode escape'})
    p = root / 'json-log.db'
    db = sqlite3.connect(p)
    db.execute('CREATE TABLE logs(value TEXT)')
    db.executemany('INSERT INTO logs VALUES (?)', [(twin.decode(),), (live.decode(),), (log.decode(),)])
    db.commit()
    assert base64.b64decode(json.loads(db.execute('SELECT value FROM logs WHERE value LIKE ?', ('INFO%',)).fetchone()[0][11:])['value']) == plain
    native = p.read_bytes()
    db.close()
    changed = copy.deepcopy(payloads)
    changed['rotate']['q-recent-rows-h1'] = native
    replay('escaped-base64-json-sqlite', changed, required=[('P', 'q-recent-rows-h1')], oracle={'independentSqlJsonBase64Sha256': sha(plain), 'schema': 'logs(value TEXT)'})

    key = next(row for row in spec['keyNeedles'] if row['kind'] == 'wrapped' and row['epoch'] == 2)
    changed = copy.deepcopy(payloads)
    control_keys = [base64.b64decode(k['control']) for k in spec['keyNeedles'] if k['kind'] == 'wrapped']
    changed['rotate']['d-keys-heap'] = fixture_record_file(control_keys + [base64.b64decode(key['target']).hex().encode()])
    replay('hex-key-separate-envelope', changed, required=[('K', 'd-keys-heap'), ('D', 'all-declared-key-copies')],
        oracle={'keySha256': sha(base64.b64decode(key['target'])), 'epoch': 2,
            'keyFile': 'd-keys-heap', 'envelopeFiles': 'q-frame-segment, q-vocabulary, x-log (distinct declared data files)'})

    for relative, pin in pins.items():
        assert sha((REPO / relative).read_bytes()) == pin, relative
    assert sha(Path(__file__).read_bytes()) == own_sha
    summary = {'candidate': CANDIDATE, 'runId': spec['runId'], 'scenarios': outcomes,
        'unsafeScenarios': [v['name'] for v in outcomes if v['unsafe']], 'completedAtUnixMs': time.time_ns() // 1000000,
        'claim': 'offline QA only; observed PASS on seeded negatives is a defect, never promotion'}
    save(root / 'summary.json', summary)
    lines = []
    for path in sorted(root.rglob('*')):
        if path.is_file():
            lines.append(sha(path.read_bytes()) + '  ' + str(path.relative_to(root)))
    (root / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')
    print(json.dumps({'output': str(root), 'scenarioCount': len(outcomes), 'unsafe': summary['unsafeScenarios'], 'manifestSha256': sha((root / 'SHA256SUMS').read_bytes())}), flush=True)


if __name__ == '__main__':
    main()

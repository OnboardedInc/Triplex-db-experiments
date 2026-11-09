#!/usr/bin/env python3
"""Supplement attempt-01 with envelope boundaries and an actual alternate-encoding WAL."""
import argparse
import base64
import copy
import gzip
import json
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
SOURCE = REPO / 'lab/observer/erasure'
sys.path.insert(0, str(SOURCE))
from compile import compile_normalizer
from fixtures import LOCATIONS, PHASES, b64, make_frames, packed, sha, vocabulary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--original', required=True)
    ap.add_argument('--output', required=True)
    args = ap.parse_args()
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    original, root = Path(args.original).resolve(), Path(args.output).resolve()
    root.mkdir(parents=True, exist_ok=False)
    original_pins = json.loads((original / 'source-pins.json').read_bytes())
    for rel, pin in original_pins['sources'].items():
        assert sha((REPO / rel).read_bytes()) == pin
    pins = {str(path.relative_to(REPO)): sha(path.read_bytes()) for path in (HERE / 'coverage.py', HERE / 'rewrap.mjs')}
    spec = json.loads((original / 'baseline/case.json').read_bytes())
    payloads = {}
    for line in (original / 'baseline/raw.jsonl').read_bytes().splitlines():
        frame = json.loads(line)
        sample = json.loads(base64.b64decode(frame['rawBase64']))
        payloads[sample['phase']] = {item['fileId']: base64.b64decode(item['bytes']) for item in sample['files']}
    results = []

    def run(name, changed, expected, oracle):
        path = root / name
        path.mkdir()
        raw = make_frames(spec, changed, path)
        parser = compile_normalizer(spec)
        (path / 'case.json').write_bytes(packed(spec))
        (path / 'raw.jsonl').write_bytes(raw)
        (path / 'normalizer.py').write_bytes(parser)
        output = subprocess.check_output([sys.executable, '-I', '-B', str(path / 'normalizer.py')], input=raw, timeout=40)
        record = json.loads(output)
        (path / 'records.json').write_bytes(output)
        lookup = {(row['scan'], row['location']): row for row in record['scans']}
        for scan, loc, status in expected:
            assert lookup[(scan, loc)]['status'] == status, (name, scan, loc, lookup[(scan, loc)])
        result = {'name': name, 'aggregateObserved': record['status'], 'rawSha256': sha(raw),
            'parserSha256': sha(parser), 'oracle': oracle, 'checked': [
                {'scan': scan, 'location': loc, 'observed': lookup[(scan, loc)]['status']}
                for scan, loc, _ in expected]}
        (path / 'comparison.json').write_bytes(packed(result))
        results.append(result)
        print(name + ': ' + record['status'], flush=True)
        return record

    target = spec['envelopes'][0]['envelope'].encode()
    live = spec['envelopes'][1]['envelope'].encode()
    twin = base64.b64decode(spec['plain']['twin'])
    for boundary in ('start', 'end', 'page'):
        changed = copy.deepcopy(payloads)
        expected = []
        for loc, config in LOCATIONS.items():
            if config[2] is None:
                continue
            expected.append(('C', loc, 'FAIL' if config[2] == 'remove' else 'PASS'))
            if config[3] == 'vocab':
                for phase in ('before', 'rotate'):
                    for part, data in vocabulary([target, live, twin]).items():
                        changed[phase][loc + ':' + part] = data
            else:
                for phase in ('before', 'rotate'):
                    controls = twin + b'\x00' + live + b'\x00'
                    if boundary == 'start':
                        data = target + b'\x00' + controls
                    elif boundary == 'end':
                        data = controls + target
                    else:
                        offset = 4096 - len(target) // 2
                        data = controls.ljust(offset, b'\x00') + target
                        assert offset // 4096 != (offset + len(target) - 1) // 4096
                    changed[phase][loc] = data
        record = run('envelope-' + boundary, changed, expected,
            {'claim': 'exact envelope planted before and after; remove profiles fail, append-only retain',
             'boundary': boundary, 'vocabulary': 'decoded word, no raw page semantics'})
        for row in record['scans']:
            if row['scan'] == 'C':
                assert row['observations']['before']['targetHits'] > 0
                assert row['observations']['rotate']['targetHits'] > 0

    rewrapped = json.loads((original / 'rewrap-proof.json').read_bytes())
    new_row = rewrapped['row']
    rows = json.loads(payloads['before']['keys-backup'])['rows']
    control_row = rows[2]

    # [CX-VER01S] Why: compare the identical supported four-column schema in UTF-8/UTF-16le.
    # Rejected: declaring a mock Postgres payload alone proves a native SQLite WAL failure.
    for encoding in ('UTF-8', 'UTF-16le'):
        path = root / (encoding + '.db')
        db = sqlite3.connect(path)
        try:
            db.execute("PRAGMA encoding='" + encoding + "'")
            db.execute('PRAGMA journal_mode=WAL')
            db.execute('PRAGMA wal_autocheckpoint=0')
            db.execute('CREATE TABLE er01_keys (key_id TEXT, tenant TEXT, epoch INTEGER, wrapped TEXT)')
            db.execute('CREATE TABLE byte_controls (value BLOB)')
            db.execute('INSERT INTO er01_keys VALUES (?, ?, ?, ?)', tuple(control_row[k] for k in ('keyId', 'tenant', 'epoch', 'wrapped')))
            db.execute('INSERT INTO byte_controls VALUES (?)', (base64.b64decode(control_row['wrapped']),))
            db.commit()
            db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
            # Keep a complete old commit frame containing the new wrapper, then delete its SQL row.
            db.execute('INSERT INTO er01_keys VALUES (?, ?, ?, ?)', tuple(new_row[k] for k in ('keyId', 'tenant', 'epoch', 'wrapped')))
            db.execute('INSERT INTO byte_controls VALUES (?)', (base64.b64decode(control_row['wrapped']),))
            db.commit()
            assert db.execute('SELECT wrapped FROM er01_keys WHERE key_id=?', (new_row['keyId'],)).fetchone()[0] == new_row['wrapped']
            db.execute('DELETE FROM er01_keys WHERE key_id=?', (new_row['keyId'],))
            db.execute('INSERT INTO byte_controls VALUES (?)', (base64.b64decode(control_row['wrapped']),))
            db.commit()
            assert db.execute('SELECT COUNT(*) FROM er01_keys WHERE key_id=?', (new_row['keyId'],)).fetchone() == (0,)
            assert db.execute('PRAGMA integrity_check').fetchall() == [('ok',)]
            main_bytes, wal = path.read_bytes(), Path(str(path) + '-wal').read_bytes()
            assert new_row['wrapped'].encode('utf-16le' if encoding == 'UTF-16le' else 'utf8') in wal
            # An independent SQLite replay stopped at the prior committed frame recovers the key.
            page_size = int.from_bytes(wal[8:12], 'big')
            frame_size = 24 + page_size
            commits = [32 + (i + 1) * frame_size for i in range((len(wal) - 32) // frame_size)
                if int.from_bytes(wal[32 + i * frame_size + 4:32 + i * frame_size + 8], 'big')]
            assert len(commits) == 2
            recovered_path = root / (encoding + '-old-commit.db')
            recovered_path.write_bytes(main_bytes)
            Path(str(recovered_path) + '-wal').write_bytes(wal[:commits[0]])
            previous = sqlite3.connect('file:' + str(recovered_path) + '?mode=ro', uri=True)
            try:
                recovered = previous.execute('SELECT key_id,tenant,epoch,wrapped FROM er01_keys WHERE key_id=?', (new_row['keyId'],)).fetchone()
                assert recovered == tuple(new_row[k] for k in ('keyId', 'tenant', 'epoch', 'wrapped'))
            finally:
                previous.close()
            proof = json.loads((original / 'rewrap-input.json').read_bytes())
            proof['key'] = dict(zip(('keyId', 'tenant', 'epoch', 'wrapped'), recovered))
            authenticated = json.loads(subprocess.check_output(['node', str(HERE / 'rewrap.mjs')], input=packed(proof)))
            assert authenticated['independentlyOpenedSha256'] == spec['envelopes'][0]['plainSha256']
            # Save exactly the bytes collected while the original SQLite writer is held.
            (root / (encoding + '-captured.db')).write_bytes(main_bytes)
            (root / (encoding + '-captured.wal')).write_bytes(wal)
        finally:
            db.close()
        changed = copy.deepcopy(payloads)
        changed['rotate']['qx-keys-sqlite'] = main_bytes
        changed['rotate']['qx-keys-wal'] = wal
        expected_status = 'FAIL' if encoding == 'UTF-8' else 'PASS'
        result = run('new-wrapper-old-wal-' + encoding, changed,
            [('D', 'all-declared-key-copies', expected_status), ('K', 'qx-keys-sqlite', 'PASS'), ('K', 'qx-keys-wal', 'PASS')],
            {'encoding': encoding, 'headerEncoding': int.from_bytes(main_bytes[56:60], 'big'),
             'currentTargetRows': 0, 'priorCommitRowRecovered': dict(zip(('keyId', 'tenant', 'epoch', 'wrapped'), recovered)),
             'independentlyOpenedSha256': authenticated['independentlyOpenedSha256'], 'integrityCheck': 'ok',
             'committedWalEnds': commits, 'databaseSha256': sha(main_bytes), 'walSha256': sha(wal),
             'claim': 'real four-column SQLite key schema; prior committed WAL opens the erased envelope'})
        if encoding == 'UTF-16le':
            assert result['status'] == 'PASS'

    # Keep compressed/split envelope and key coverage explicit as generic byte diagnostics.
    for encoding in ('gzip', 'fragments'):
        changed = copy.deepcopy(payloads)
        encoded = gzip.compress(target) if encoding == 'gzip' else packed([b64(target[:40]), b64(target[40:])])
        recovered = gzip.decompress(encoded) if encoding == 'gzip' else b''.join(base64.b64decode(v) for v in json.loads(encoded))
        assert recovered == target
        for loc in ('q-broker-sqlite', 'q-recent-rows-h1', 'd-storage-segment'):
            changed['rotate'][loc] += b'\x00' + encoded
        run('envelope-' + encoding, changed, [('C', loc, 'PASS') for loc in ('q-broker-sqlite', 'q-recent-rows-h1', 'd-storage-segment')],
            {'recoveredEnvelopeSha256': sha(recovered), 'encoding': encoding,
             'claim': 'generic encoding diagnostic; not valid native SQL/XTDB compressed serialization'})
        changed = copy.deepcopy(payloads)
        for loc in ('d-keys-heap', 'd-keys-toast', 'd-keys-wal'):
            for row in spec['keyNeedles']:
                if row['kind'] == 'wrapped':
                    key = base64.b64decode(row['target'])
                    # [CX-VER01S] Why: incompressible random binary can be stored verbatim by deflate.
                    # Rejected: assuming gzip alone hides the binary needle (coverage-01 disproved it).
                    encoded = gzip.compress(key.hex().encode()) if encoding == 'gzip' else packed([b64(key[:30]), b64(key[30:])])
                    recovered = bytes.fromhex(gzip.decompress(encoded).decode()) if encoding == 'gzip' else b''.join(base64.b64decode(v) for v in json.loads(encoded))
                    assert recovered == key
                    assert all(form not in encoded for form in (key, base64.b64encode(key), key.hex().encode()))
                    changed['rotate'][loc] += b'\x00' + encoded
        run('keys-' + encoding, changed, [('K', loc, 'PASS') for loc in ('d-keys-heap', 'd-keys-toast', 'd-keys-wal')],
            {'encoding': encoding, 'claim': 'generic key encoding diagnostic; not native TOAST/pglz'})

    for rel, pin in {**original_pins['sources'], **pins}.items():
        assert sha((REPO / rel).read_bytes()) == pin, rel
    summary = {'candidate': original_pins['candidate'], 'originalAttempt': str(original), 'fixtureRunId': spec['runId'],
        'verifierSources': pins, 'scenarios': results,
        'claim': 'additional offline replays of attempt-01; reproduced PASS values are defects'}
    (root / 'summary.json').write_bytes(packed(summary))
    entries = []
    for path in sorted(root.rglob('*')):
        if path.is_file():
            data = path.read_bytes()
            entries.append({'path': str(path.relative_to(root)), 'bytes': len(data), 'sha256': sha(data)})
    (root / 'SHA256.json').write_bytes(packed({'files': entries}))
    print(json.dumps({'output': str(root), 'scenarioCount': len(results), 'files': len(entries),
        'bytes': sum(item['bytes'] for item in entries), 'summarySha256': sha((root / 'summary.json').read_bytes()),
        'manifestSha256': sha((root / 'SHA256.json').read_bytes())}), flush=True)


if __name__ == '__main__':
    main()

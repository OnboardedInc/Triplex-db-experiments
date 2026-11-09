#!/usr/bin/env python3
"""Offline QA of immutable ER01-S sources; retains every replay outside git."""
import argparse
import base64
import copy
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
SOURCE = REPO / 'lab/observer/erasure'
sys.path.insert(0, str(SOURCE))
from compile import compile_normalizer
from fixtures import (KEY_LOCATIONS, LOCATIONS, PHASES, UNSCANNABLE, b64,
                      make_fixture, make_frames, packed, sha, vocabulary)
from snapshot import read_file

CANDIDATE = '1492d8b8457d62a942328889f651bef1ef707550'


def write_json(path, value):
    path.write_bytes(packed(value) + b'\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    root = Path(args.output).resolve()
    root.mkdir(parents=True, exist_ok=False)
    pins = {}
    for path in sorted(SOURCE.iterdir()):
        if path.is_file():
            relative = str(path.relative_to(REPO))
            committed = subprocess.check_output(['git', 'show', CANDIDATE + ':' + relative], cwd=REPO)
            assert path.read_bytes() == committed, relative
            pins[relative] = sha(committed)
    own_pins = {p.name: sha(p.read_bytes()) for p in (HERE / 'review.py', HERE / 'rewrap.mjs')}
    write_json(root / 'source-pins.json', {'candidate': CANDIDATE, 'sources': pins,
        'verifierSources': own_pins, 'python': sys.version, 'sqlite': sqlite3.sqlite_version,
        'node': subprocess.check_output(['node', '--version']).decode().strip(),
        'scope': 'offline synthetic files; no engine, slot, or semantic erasure acceptance'})
    # [CX-VER01S] Why: compare actual retained bytes, never infer a historical gate is fresh.
    # Rejected: trusting the builder's report/manifest without reading each listed file.
    location = json.loads((REPO / 'lab/experiments/EXP-ER01-S/evidence/location.json').read_bytes())
    retained = Path(location['path'])
    manifest_bytes = (retained / 'SHA256.json').read_bytes()
    assert sha(manifest_bytes) == location['manifestSha256']
    assert sha((retained / 'gates.json').read_bytes()) == location['gatesSha256']
    manifest = json.loads(manifest_bytes)
    for item in manifest['files']:
        path = (retained / item['path']).resolve()
        assert path.is_relative_to(retained.resolve())
        content = path.read_bytes()
        assert len(content) == item['bytes'] and sha(content) == item['sha256'], item['path']
    assert len(manifest['files']) == location['manifestFileCount']
    assert sum(item['bytes'] for item in manifest['files']) == location['manifestBytes']
    write_json(root / 'historical-readback.json', {**location, 'readbackFileCount': len(manifest['files']),
        'claim': 'historical bytes match; not a fresh execution'})

    spec, payloads, raw = make_fixture(root / 'fresh-fixture')
    namespace = {'__name__': 'frozen_er01_verifier'}
    frozen = compile_normalizer(spec)
    exec(frozen, namespace)
    results = []

    def run(name, changed=None, case=None, expected=None, oracle=None):
        case = copy.deepcopy(spec if case is None else case)
        changed = copy.deepcopy(payloads if changed is None else changed)
        directory = root / name
        directory.mkdir()
        # Each generated input is written and independently read back through acquisition.
        raw = make_frames(case, changed, directory)
        normalizer = compile_normalizer(case)
        (directory / 'case.json').write_bytes(packed(case) + b'\n')
        (directory / 'raw.jsonl').write_bytes(raw)
        (directory / 'normalizer.py').write_bytes(normalizer)
        proc = subprocess.run([sys.executable, '-I', '-B', str(directory / 'normalizer.py')],
            input=raw, capture_output=True, timeout=40, check=True)
        record = json.loads(proc.stdout)
        (directory / 'records.json').write_bytes(proc.stdout)
        (directory / 'stderr').write_bytes(proc.stderr)
        lookup = {(row['scan'], row['location']): row for row in record['scans']}
        for scan, loc, status in expected or []:
            assert lookup[(scan, loc)]['status'] == status, (name, scan, loc, lookup[(scan, loc)])
        summary = {'name': name, 'aggregateObserved': record['status'],
            'rawSha256': sha(raw), 'parserSha256': sha(normalizer), 'runId': case['runId'],
            'checked': [{'scan': s, 'location': l, 'observed': lookup[(s, l)]['status']} for s, l, _ in expected or []],
            'oracle': oracle or {}, 'replay': 'mutation of this fresh synthetic attempt; not a new engine collection'}
        write_json(directory / 'comparison.json', summary)
        results.append(summary)
        print(name + ': ' + record['status'], flush=True)
        return record

    baseline = run('baseline', expected=[(s, loc, 'PASS') for loc, config in spec['locations'].items()
        for s in config['scans']] + [('D', 'all-declared-key-copies', 'PASS')])
    assert baseline['status'] == 'PASS'
    d = next(row for row in baseline['scans'] if row['scan'] == 'D')
    assert all(row['opened'] for row in d['observations']['before'])
    assert all(not d['observations'][p][0]['opened'] and d['observations'][p][1]['opened'] for p in ('shred', 'rotate'))
    plain = base64.b64decode(spec['plain']['target'])
    twin = base64.b64decode(spec['plain']['twin'])
    envelope = spec['envelopes'][0]['envelope'].encode()
    live = spec['envelopes'][1]['envelope'].encode()
    raw_locations = [loc for loc, item in LOCATIONS.items() if item[3] != 'vocab']

    # [CX-VER01S] Why: independently plant at file edges and across byte/page boundaries.
    # Rejected: calling the scanner's found() helper to decide whether our seed exists.
    for boundary in ('start', 'end', 'page'):
        mutated = copy.deepcopy(payloads)
        for loc in raw_locations:
            original = mutated['rotate'][loc]
            if boundary == 'start':
                blob = plain + original
            elif boundary == 'end':
                blob = original + plain
            else:
                offset = ((len(original) + 4095) // 4096 + 1) * 4096 - len(plain) // 2
                blob = original.ljust(offset, b'\x00') + plain
                assert blob[offset:offset + len(plain)] == plain
                assert offset // 4096 != (offset + len(plain) - 1) // 4096
            mutated['rotate'][loc] = blob
        for loc, item in LOCATIONS.items():
            if item[3] == 'vocab':
                for part, content in vocabulary([twin, live, envelope, plain]).items():
                    mutated['rotate'][loc + ':' + part] = content
        run('plaintext-' + boundary, mutated,
            expected=[('P', loc, 'FAIL') for loc in LOCATIONS],
            oracle={'plantedPlainSha256': sha(plain), 'dataLocations': len(LOCATIONS),
                    'boundary': boundary, 'vocabulary': 'FSST decoded word; boundary test applies to raw files'})

    for boundary in ('start', 'end', 'page'):
        mutated = copy.deepcopy(payloads)
        for loc, config in KEY_LOCATIONS.items():
            kind = config[1]
            needles = [base64.b64decode(row['target']) for row in spec['keyNeedles'] if row['kind'] == kind]
            original = mutated['rotate'][loc]
            residual = b'\x00'.join(needles)
            if boundary == 'start':
                blob = residual + original
            elif boundary == 'end':
                blob = original + residual
            else:
                offset = ((len(original) + 4095) // 4096 + 1) * 4096 - 30
                blob = original.ljust(offset, b'\x00') + residual
                assert offset // 4096 != (offset + len(needles[0]) - 1) // 4096
            mutated['rotate'][loc] = blob
        run('keys-' + boundary, mutated, expected=[('K', loc, 'FAIL') for loc in KEY_LOCATIONS],
            oracle={'keyLocations': len(KEY_LOCATIONS), 'boundary': boundary,
                    'claim': 'physical byte search; intentionally not a valid JSON/SQLite D extraction case'})

    blind = copy.deepcopy(spec)
    blind['blindVocabulary'] = True
    run('blind-fsst', case=blind, expected=[(scan, loc, 'REFUSED') for loc, item in LOCATIONS.items()
        if item[3] == 'vocab' for scan in ('P', 'C')])
    for kind, codec in UNSCANNABLE.items():
        case = copy.deepcopy(spec)
        case['inventory']['host-log']['codec'] = codec
        run('unknown-' + kind, case=case, expected=[('P', 'host-log', 'REFUSED'), ('C', 'host-log', 'REFUSED')])
    missing = root / 'does-not-exist'
    try:
        read_file(str(missing), 100)
    except FileNotFoundError:
        write_json(root / 'missing-file.json', {'path': str(missing), 'observed': 'FileNotFoundError',
            'claim': 'acquisition aborts; no PASS or normalized REFUSED emitted by read_file'})
    else:
        raise AssertionError('missing acquisition passed')
    # Normalizer rejects a missing entry from any phase.
    frames = [json.loads(line) for line in raw.splitlines()]
    sample = json.loads(base64.b64decode(frames[0]['rawBase64']))
    sample['files'].pop()
    encoded = packed(sample)
    frames[0].update(rawBase64=b64(encoded), rawSha256=sha(encoded))
    missing_result = namespace['normalize_erasure'](b'\n'.join(packed(f) for f in frames), spec)
    assert missing_result['status'] == 'REFUSED'
    write_json(root / 'missing-inventory.json', missing_result)

    def overflow_pair(needle, name):
        # A genuine SQLite logical value, with an overflow pointer inserted in its bytes.
        # Search only local disposable files; keep the successful physical DB/WAL and SQL result.
        for prefix in range(0, 100):
            path = root / (name + '-search.db')
            if path.exists():
                path.unlink()
            db = sqlite3.connect(path)
            db.execute('PRAGMA page_size=512')
            db.execute('PRAGMA journal_mode=WAL')
            db.execute('PRAGMA wal_autocheckpoint=0')
            db.execute('CREATE TABLE controls (padding BLOB, value BLOB, tail BLOB)')
            db.executemany('INSERT INTO controls VALUES (?, ?, ?)', [(b'', twin, b''), (b'', live, b'')])
            db.commit()
            db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
            db.execute('INSERT INTO controls VALUES (?, ?, ?)', (b'x' * prefix, needle, b'y' * (1000 - prefix - len(needle))))
            db.commit()
            wal = Path(str(path) + '-wal').read_bytes()
            assert db.execute('PRAGMA integrity_check').fetchall() == [('ok',)]
            selected = db.execute('SELECT value FROM controls WHERE length(padding)=? AND length(tail)>0', (prefix,)).fetchone()[0]
            assert selected == needle
            db.execute('PRAGMA wal_checkpoint(PASSIVE)')
            database = path.read_bytes()
            db.close()
            if needle not in wal and needle not in database:
                (root / (name + '.db')).write_bytes(database)
                (root / (name + '.wal')).write_bytes(wal)
                sql_proof = {'selectedBase64': b64(selected), 'sha256': sha(selected), 'prefixBytes': prefix,
                    'pageSize': 512, 'mainRawContainsNeedle': False, 'walRawContainsNeedle': False,
                    'integrityCheck': 'ok', 'databaseSha256': sha(database), 'walSha256': sha(wal)}
                write_json(root / (name + '-sql.json'), sql_proof)
                path.unlink()
                return database, wal, sql_proof
        raise AssertionError('could not construct SQLite overflow seed')

    database, wal, oracle = overflow_pair(plain, 'plaintext-overflow')
    mutated = copy.deepcopy(payloads)
    mutated['rotate']['q-broker-sqlite'] = database
    mutated['rotate']['q-recent-rows-h1'] = database
    mutated['rotate']['q-broker-wal'] = wal
    overflow = run('sqlite-overflow-plaintext', mutated,
        expected=[('P', loc, 'PASS') for loc in ('q-broker-sqlite', 'q-recent-rows-h1', 'q-broker-wal')], oracle=oracle)
    assert overflow['status'] == 'PASS'  # Reproduces a defect, never an erasure endorsement.
    database, wal, oracle = overflow_pair(envelope, 'ciphertext-overflow')
    mutated = copy.deepcopy(payloads)
    mutated['rotate']['q-broker-sqlite'] = database
    mutated['rotate']['q-recent-rows-h1'] = database
    overflow = run('sqlite-overflow-envelope', mutated,
        expected=[('C', loc, 'PASS') for loc in ('q-broker-sqlite', 'q-recent-rows-h1')], oracle=oracle)
    assert overflow['status'] == 'PASS'

    # Gzip and record-fragment fixtures are explicitly generic supported-bytes inputs,
    # not claims that these are actual Postgres/XTDB encodings.
    for encoding in ('gzip', 'record-fragments'):
        mutated = copy.deepcopy(payloads)
        encoded = gzip.compress(plain) if encoding == 'gzip' else packed([b64(plain[:13]), b64(plain[13:])])
        recovered = gzip.decompress(encoded) if encoding == 'gzip' else b''.join(base64.b64decode(p) for p in json.loads(encoded))
        assert recovered == plain
        for loc in raw_locations:
            mutated['rotate'][loc] += b'\x00' + encoded
        record = run('plaintext-' + encoding, mutated,
            expected=[('P', loc, 'PASS') for loc in raw_locations],
            oracle={'recoveredPlainSha256': sha(recovered), 'encoding': encoding,
                    'claim': 'missing decoder/reassembly coverage; generic encoding diagnostic, not native engine fixture'})
        assert record['status'] == 'PASS'

    # K can miss split binary key material even in an actual SQLite file.
    target_key = next(row for row in spec['keyNeedles'] if row['kind'] == 'wrapped')
    wrapped = base64.b64decode(target_key['target'])
    database, wal, oracle = overflow_pair(wrapped, 'wrapped-key-overflow')
    # Retain baseline live key controls; the extra SQLite file is in the same declared K location.
    case, mutated = copy.deepcopy(spec), copy.deepcopy(payloads)
    extra_id = 'd-keys-toast-overflow'
    case['inventory'][extra_id] = {'path': '/fixture/triplex_keys/overflow.db', 'location': 'd-keys-toast',
        'sourceKind': 'HO', 'codec': 'bytes'}
    for phase in PHASES:
        mutated[phase][extra_id] = b'' if phase != 'rotate' else database
    run('physical-overflow-key', mutated, case=case, expected=[('K', 'd-keys-toast', 'PASS')], oracle=oracle)

    # [CX-VER01S] Why: a valid rewrapped assertion key must not evade D by changing nonce.
    # Rejected: relying on the known pre-erasure byte pattern to enumerate all usable keys.
    keys = json.loads(payloads['before']['keys-backup'])['rows']
    epochs = json.loads(payloads['before']['kms-records'])['rows']
    rewrap_input = {'root': payloads['before']['root'].decode(), 'key': keys[1],
        'epoch': epochs[1], 'envelope': spec['envelopes'][0]}
    rewrapped = json.loads(subprocess.check_output(['node', str(HERE / 'rewrap.mjs')], input=packed(rewrap_input)))
    assert rewrapped['independentlyOpenedSha256'] == spec['envelopes'][0]['plainSha256']
    assert rewrapped['row']['wrapped'] not in {row['wrapped'] for row in keys}
    write_json(root / 'rewrap-input.json', rewrap_input)
    write_json(root / 'rewrap-proof.json', rewrapped)
    for location in ('d-keys-heap', 'd-keys-toast', 'd-keys-wal'):
        mutated = copy.deepcopy(payloads)
        mutated['rotate'][location] += b'\x00' + packed(rewrapped['row'])
        result = run('new-wrapper-' + location, mutated,
            expected=[('K', location, 'PASS'), ('D', 'all-declared-key-copies', 'PASS')],
            oracle={'physicalRow': rewrapped['row'], 'independentlyOpenedSha256': rewrapped['independentlyOpenedSha256'],
                    'claim': 'valid new wrapper under retained live epoch; raw Postgres fixture, not native page serialization'})
        assert result['status'] == 'PASS'

    stale = copy.deepcopy(payloads)
    stale['rotate']['keys-backup'] = payloads['before']['keys-backup']
    stale['rotate']['kms-records'] = payloads['before']['kms-records']
    run('stale-backup', stale, expected=[('D', 'all-declared-key-copies', 'FAIL')])
    for rel, pin in pins.items():
        assert sha((REPO / rel).read_bytes()) == pin, 'source drift: ' + rel
    for name, pin in own_pins.items():
        assert sha((HERE / name).read_bytes()) == pin, 'verifier drift: ' + name
    summary = {'format': 'cx-ver01s-review/1', 'candidate': CANDIDATE, 'fixtureRunId': spec['runId'],
        'completedAtUnixMs': time.time_ns() // 1000000, 'verdict': 'FIX-FIRST', 'scenarios': results,
        'claim': 'QA observations only; reproduced PASS values are defects, not erasure verdicts',
        'sourcePinsSha256': sha((root / 'source-pins.json').read_bytes())}
    write_json(root / 'summary.json', summary)
    entries = []
    for path in sorted(root.rglob('*')):
        if path.is_file():
            content = path.read_bytes()
            entries.append({'path': str(path.relative_to(root)), 'bytes': len(content), 'sha256': sha(content)})
    write_json(root / 'SHA256.json', {'files': entries})
    print(json.dumps({'output': str(root), 'scenarioCount': len(results), 'files': len(entries),
        'bytes': sum(item['bytes'] for item in entries), 'summarySha256': sha((root / 'summary.json').read_bytes()),
        'manifestSha256': sha((root / 'SHA256.json').read_bytes()), 'verdict': summary['verdict']}), flush=True)


if __name__ == '__main__':
    main()

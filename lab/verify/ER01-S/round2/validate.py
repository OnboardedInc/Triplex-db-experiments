#!/usr/bin/env python3
"""Independent SQLite readback, multi-block vocabulary controls and evidence retention."""
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

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
SOURCE = REPO / 'lab/observer/erasure'
ROOT = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/round2')
sys.path.insert(0, str(SOURCE))
from compile import compile_normalizer
from fixtures import packed, vocabulary


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    path.write_bytes(packed(value) + b'\n')


def read_manifest(directory, digest=None):
    path = directory / 'SHA256SUMS'
    data = path.read_bytes()
    if digest:
        assert sha(data) == digest
    seen, count_bytes = set(), 0
    for line in data.decode().splitlines():
        pin, relative = line.split('  ', 1)
        source = (directory / relative).resolve()
        assert source.is_relative_to(directory.resolve()) and source not in seen, relative
        seen.add(source)
        content = source.read_bytes()
        assert sha(content) == pin, relative
        count_bytes += len(content)
    current = {p.resolve() for p in directory.rglob('*') if p.is_file() and p != path}
    assert seen == current, str(directory)
    return {'path': str(directory), 'manifestSha256': sha(data), 'files': len(seen), 'bytes': count_bytes}


def main():
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    output = ROOT / 'validation-01'
    output.mkdir(parents=True, exist_ok=False)
    pins = json.loads((ROOT / 'probe-02/source-pins.json').read_bytes())
    for rel, pin in pins['sourceSha256'].items():
        assert sha((REPO / rel).read_bytes()) == pin, rel
    own_pin = sha(Path(__file__).read_bytes())
    shutil.copyfile(__file__, output / 'validate-executed.py')
    probe = ROOT / 'probe-02'
    scenario = probe / 'superseded-within-commit-wal'
    case = json.loads((scenario / 'case.json').read_bytes())
    plain = base64.b64decode(case['plain']['target'])
    oracle = json.loads((probe / 'wal-original-proof.json').read_bytes())
    frames = [json.loads(v) for v in (scenario / 'raw.jsonl').read_bytes().splitlines()]
    rotate = json.loads(base64.b64decode(frames[-1]['rawBase64']))
    files = {v['fileId']: base64.b64decode(v['bytes']) for v in rotate['files']}
    sql_results = []
    # [CX-VER01S-R2] Why: SQLite itself must accept the final modified WAL and recover the old native view.
    # Rejected: trusting only the decoder under review to call our checksummed frame stream valid.
    for name, main_bytes, wal_bytes, expected_count in (
        ('final-coalesced', files['q-broker-sqlite'], files['q-broker-wal'], 0),
        ('native-prior-commit', (probe / 'base-main.db').read_bytes(), (probe / 'pre-delete.wal').read_bytes(), 1),
    ):
        path = output / (name + '.db')
        path.write_bytes(main_bytes)
        Path(str(path) + '-wal').write_bytes(wal_bytes)
        db = sqlite3.connect('file:' + str(path) + '?mode=ro', uri=True)
        try:
            assert db.execute('PRAGMA integrity_check').fetchall() == [('ok',)]
            rows = db.execute('SELECT value FROM sensitive').fetchall()
            assert len(rows) == expected_count
            if rows:
                assert sha(rows[0][0]) == oracle['sqlValueSha256']
                assert plain in rows[0][0]
            sql_results.append({'name': name, 'integrityCheck': 'ok', 'targetRows': len(rows),
                'selectedValueSha256': sha(rows[0][0]) if rows else None,
                'mainSha256': sha(main_bytes), 'walSha256': sha(wal_bytes)})
        finally:
            db.close()
    save(output / 'sqlite-independent.json', sql_results)

    # [CX-VER01S-R2] Why: global word 2^20 must select the second pair of FSST dictionaries.
    # Rejected: repeating the archived tiny one-block vocabulary test (cannot exercise block selection).
    count = 1 << 20
    marker = b'z-' + plain + b'-' + base64.b64decode(case['plain']['twin'])
    book1 = bytearray(2304)
    for i, value in enumerate(b'w0123456789'):
        book1[9 + i] = 1
        book1[264 + i * 8] = value
    identity = bytearray(2304)
    for i in range(255):
        identity[9 + i] = 1
        identity[264 + i * 8] = i
    final = vocabulary([marker])
    words = bytearray(count * 8)
    for i in range(count):
        digits = str(i).zfill(7).encode()
        words[i * 8] = 0
        words[i * 8 + 1:i * 8 + 8] = bytes(v - 47 for v in digits)
    words.extend(final['external'])
    offsets = bytearray((count + 2) * 8)
    for i in range(count + 1):
        struct.pack_into('<Q', offsets, i * 8, i * 8)
    struct.pack_into('<Q', offsets, (count + 1) * 8, len(words))
    parts = {'codebooks': struct.pack('<Q', 2) + book1 + identity + final['codebooks'][8:],
        'external': bytes(words),
        'offsets': bytes(offsets) + struct.pack('<QQQII', count + 2, count + 2, len(offsets), 7601577, 0),
        'internal': final['internal'], 'ids': struct.pack('<QQ', 1, count)}
    for name, data in parts.items():
        (output / ('vocabulary.' + name)).write_bytes(data)
    ns = {'__name__': 'frozen_round2_validation'}
    parser = compile_normalizer(case)
    (output / 'frozen-parser.py').write_bytes(parser)
    exec(parser, ns)
    decoded = ns['qlever_vocabulary'](parts)
    assert len(decoded) == count + 2
    assert decoded[0] == b'w0000000' and decoded[count - 1] == b'w1048575'
    assert decoded[count] == marker and decoded[-1] == marker
    assert plain in decoded[count]
    broken = dict(parts)
    broken['codebooks'] = struct.pack('<Q', 1) + bytes(book1) + bytes(identity)
    try:
        ns['qlever_vocabulary'](broken)
    except ValueError as error:
        refusal = str(error)
    else:
        raise AssertionError('missing second dictionary did not refuse')
    save(output / 'vocabulary-block.json', {'globalIndex': count, 'decodedCount': len(decoded),
        'markerSha256': sha(marker), 'needleSha256': sha(plain), 'found': True,
        'missingDecoderRefusal': refusal, 'parserSha256': sha(parser),
        'claim': 'direct frozen decoder control over two-block native-layout fixture; no live IndexBuilder or full normalizer collection'})

    for rel, pin in pins['sourceSha256'].items():
        assert sha((REPO / rel).read_bytes()) == pin, rel
    assert sha(Path(__file__).read_bytes()) == own_pin
    save(output / 'summary.json', {'candidate': pins['candidate'], 'inputRunId': case['runId'],
        'verifierSha256': own_pin, 'sqlite': sql_results, 'vocabularyControl': 'found at index 2^20; missing second decoder refuses',
        'scope': 'independent offline readback and direct decoder fixture; no engine acceptance'})
    lines = [sha(p.read_bytes()) + '  ' + str(p.relative_to(output)) for p in sorted(output.rglob('*')) if p.is_file()]
    (output / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')
    builder = json.loads((REPO / 'lab/experiments/EXP-ER01-S/round2/INDEX.json').read_bytes())
    readbacks = [read_manifest(Path(builder['finalRun']), builder['manifestSha256'])]
    for name in ('baseline-01', 'probe-02', 'validation-01'):
        readbacks.append(read_manifest(ROOT / name))
    failed = ROOT / 'probe-01'
    shutil.copyfile(HERE / 'probe-01.stdout', failed / 'process.stdout')
    shutil.copyfile(HERE / 'probe-01.stderr', failed / 'process.stderr')
    save(failed / 'diagnostic.json', {'result': 'verifier seed-construction assertion failed',
        'cause': 'initial padding window did not place the marker across an overflow boundary',
        'rerun': 'probe-02 used padding offsets 650..719 and retained WAL history without checkpoint recycling',
        'claim': 'no scanner qualification or finding follows from this failed attempt'})
    (failed / 'SHA256SUMS').write_text('\n'.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(failed))
        for p in sorted(failed.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS') + '\n')
    readbacks.append(read_manifest(failed))
    result = json.loads((probe / 'summary.json').read_bytes())
    index = {'format': 'cx-ver01s-round2-index/1', 'candidate': pins['candidate'], 'verdict': 'FIX-FIRST',
        'fixtureRunId': case['runId'], 'retainedReplays': 31, 'newProbeScenarios': len(result['scenarios']),
        'unsafeScenarios': result['unsafeScenarios'], 'readbacks': readbacks,
        'claim': 'offline QA; no engine erasure acceptance or obligation promotion'}
    save(HERE / 'INDEX.json', index)
    checksums = []
    for entry in readbacks:
        p = Path(entry['path']) / 'SHA256SUMS'
        checksums.append(entry['manifestSha256'] + '  ' + str(p))
    for name in ('probe.py', 'validate.py', 'INDEX.json', 'baseline.stdout', 'baseline.stderr',
                 'probe-01.stdout', 'probe-01.stderr', 'probe-02.stdout', 'probe-02.stderr'):
        p = HERE / name
        checksums.append(sha(p.read_bytes()) + '  ' + str(p))
    (HERE / 'SHA256SUMS').write_text('\n'.join(checksums) + '\n')
    print(json.dumps(index, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()

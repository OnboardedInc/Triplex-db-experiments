#!/usr/bin/env python3
"""Independent ordered layer matrix and real default-depth controls; no observer edits."""
import argparse
import base64
import gzip
import hashlib
import itertools
import json
from pathlib import Path
import quopri
import shutil
import sqlite3
import subprocess
import sys
import time
from urllib.parse import unquote_to_bytes

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
SOURCE = REPO / 'lab/observer/erasure'
sys.path.insert(0, str(SOURCE))
from compile import compile_normalizer
from fixtures import make_fixture, make_frames, fixture_record_file, packed

CANDIDATE = '1a7fc86c4ee90f2f255d4767c1ff9fcc55da308a'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def save(path, value):
    path.write_bytes(packed(value) + b'\n')


def variable(number):
    out = bytearray()
    while number >= 128:
        out.append((number & 127) | 128)
        number >>= 7
    out.append(number)
    return bytes(out)


def varint_inverse(raw):
    result, number, shift = bytearray(), 0, 0
    for byte in raw:
        number |= (byte & 127) << shift
        if byte < 128:
            assert number <= 255
            result.append(number)
            number, shift = 0, 0
        else:
            shift += 7
    assert shift == 0
    return bytes(result)


def sqlite_pack(raw):
    db = sqlite3.connect(':memory:')
    try:
        db.execute('CREATE TABLE controls(value BLOB)')
        db.execute('INSERT INTO controls VALUES (?)', (raw,))
        db.commit()
        assert db.execute('SELECT value FROM controls').fetchone()[0] == raw
        return db.serialize()
    finally:
        db.close()


def sqlite_unpack(raw):
    db = sqlite3.connect(':memory:')
    try:
        db.deserialize(raw)
        assert db.execute('PRAGMA integrity_check').fetchall() == [('ok',)]
        return db.execute('SELECT value FROM controls').fetchone()[0]
    finally:
        db.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--output', required=True)
    args = ap.parse_args()
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    root = Path(args.output).resolve()
    root.mkdir(parents=True, exist_ok=False)
    own_sha = sha(Path(__file__).read_bytes())
    shutil.copyfile(__file__, root / 'matrix-executed.py')
    pins = {}
    for path in SOURCE.rglob('*'):
        if path.is_file() and '__pycache__' not in str(path):
            rel = str(path.relative_to(REPO))
            committed = subprocess.check_output(['git', 'show', CANDIDATE + ':' + rel], cwd=REPO)
            assert committed == path.read_bytes(), rel
            pins[rel] = sha(committed)
    save(root / 'source-pins.json', {'candidate': CANDIDATE, 'observerSources': pins, 'verifierSha256': own_sha})
    spec, payloads, _ = make_fixture(root / 'fixture')
    frozen = compile_normalizer(spec)
    (root / 'frozen-normalizer.py').write_bytes(frozen)
    ns = {'__name__': 'round4_frozen'}
    exec(frozen, ns)
    bound = ns['VIEW_DEPTH_LIMIT']
    assert bound == 32
    marker = base64.b64decode(spec['plain']['target'])
    # [CX-VER01S-R4] Why: independent inverse functions prove exact control preservation for each composition.
    # Rejected: using the observer's decoder itself as the fixture round-trip oracle.
    def escaped(raw, prefix, width):
        return b''.join((prefix + format(byte, width)).encode() for byte in raw)
    layers = {
        'json': (lambda b: json.dumps(b.decode('utf8'), ensure_ascii=True).encode(), lambda b: json.loads(b).encode()),
        'json-unicode': (lambda b: ('"' + ''.join('\\u%04x' % ord(c) for c in b.decode('utf8')) + '"').encode(), lambda b: json.loads(b).encode()),
        'backslash-hex': (lambda b: escaped(b, '\\x', '02x'), lambda b: bytes(int(b[i + 2:i + 4], 16) for i in range(0, len(b), 4))),
        'backslash-octal': (lambda b: escaped(b, '\\', '03o'), lambda b: bytes(int(b[i + 1:i + 4], 8) for i in range(0, len(b), 4))),
        'url': (lambda b: escaped(b, '%', '02X'), unquote_to_bytes),
        'quoted-printable': (lambda b: escaped(b, '=', '02X'), quopri.decodestring),
        'base64': (base64.b64encode, lambda b: base64.b64decode(b, validate=True)),
        'base64url': (lambda b: base64.urlsafe_b64encode(b).rstrip(b'='), lambda b: base64.urlsafe_b64decode(b + b'=' * (-len(b) % 4))),
        'folded-base64': (lambda b: b'\r\n'.join(base64.b64encode(b)[i:i + 16] for i in range(0, len(base64.b64encode(b)), 16)), lambda b: base64.b64decode(b)),
        'hex': (lambda b: b.hex().encode(), lambda b: bytes.fromhex(b.decode())),
        'length-le': (lambda b: len(b).to_bytes(4, 'little') + b, lambda b: b[4:]),
        'length-be': (lambda b: len(b).to_bytes(4, 'big') + b, lambda b: b[4:]),
        'byte-varints': (lambda b: b''.join(variable(v) for v in b), varint_inverse),
        'fixture-record': (lambda b: fixture_record_file([b]) if b.decode('utf8') is not None else None, lambda b: b[18:]),
        'utf16le': (lambda b: b.decode('utf8').encode('utf-16le'), lambda b: b.decode('utf-16le').encode()),
        'utf16be': (lambda b: b.decode('utf8').encode('utf-16be'), lambda b: b.decode('utf-16be').encode()),
        'utf32le': (lambda b: b.decode('utf8').encode('utf-32le'), lambda b: b.decode('utf-32le').encode()),
        'utf32be': (lambda b: b.decode('utf8').encode('utf-32be'), lambda b: b.decode('utf-32be').encode()),
        'gzip': (lambda b: gzip.compress(b, mtime=0), gzip.decompress),
        'sqlite': (sqlite_pack, sqlite_unpack),
    }
    save(root / 'matrix-contract.json', {'layers': list(layers), 'sizes': [2, 3], 'order': 'inner-to-outer',
        'repeatLayers': True, 'unicodeDomain': 'strict UTF-8 before JSON/Unicode/text-fixture encode; invalid combinations recorded, not claimed tested',
        'markerSha256': sha(marker), 'markerBase64': base64.b64encode(marker).decode(), 'depthLimit': bound,
        'scope': 'direct exact frozen supplemental_views; selected full-normalizer boundary probes below'})
    inputs = root / 'inputs'
    inputs.mkdir()
    counts = {'pairs': 0, 'triples': 0, 'outOfDomain': 0, 'found': 0, 'foundWithIssues': 0, 'missWithIssues': 0, 'missNoIssues': 0}
    problems = []
    result_file = root / 'matrix.jsonl'
    with result_file.open('wb') as log:
        for size in (2, 3):
            for number, names in enumerate(itertools.product(layers, repeat=size)):
                raw = marker
                try:
                    for name in names:
                        raw = layers[name][0](raw)
                except UnicodeError:
                    counts['outOfDomain'] += 1
                    log.write(packed({'layers': names, 'size': size, 'status': 'OUT-OF-DOMAIN', 'reason': 'text encoder requires valid UTF-8'}) + b'\n')
                    continue
                recovered = raw
                for name in reversed(names):
                    recovered = layers[name][1](recovered)
                assert recovered == marker, names
                key = sha(raw)
                path = inputs / key
                if not path.exists():
                    path.write_bytes(raw)
                start = time.monotonic()
                views, records, issues = ns['supplemental_views'](raw)
                found = any(marker in v for v in [raw] + views)
                counts['pairs' if size == 2 else 'triples'] += 1
                if found:
                    counts['foundWithIssues' if issues else 'found'] += 1
                else:
                    counts['missWithIssues' if issues else 'missNoIssues'] += 1
                observation = {'layers': names, 'size': size, 'inputSha256': key, 'inputBytes': len(raw),
                    'found': found, 'viewCount': len(views), 'issues': issues, 'elapsedSeconds': round(time.monotonic() - start, 6)}
                log.write(packed(observation) + b'\n')
                if not found:
                    problems.append(observation)
                if number % 100 == 0:
                    log.flush()
                    print(json.dumps({'size': size, 'index': number, 'counts': counts}), flush=True)
    save(root / 'matrix-observations.json', {'counts': counts, 'problems': problems})

    # [CX-VER01S-R4] Why: linear-size percent nesting reaches the actual default bound without expansion limits.
    # Rejected: testing only a reduced depth override or an exponential 33-layer hex fixture.
    depth_results = []
    for depth in (bound - 1, bound, bound + 1):
        value = b'%' + ('%02X' % marker[0]).encode() + marker[1:]
        for _ in range(depth - 1):
            value = value.replace(b'%', b'%25')
        independent = value
        for _ in range(depth):
            independent = unquote_to_bytes(independent)
        assert independent == marker
        views, _, issues = ns['supplemental_views'](value)
        direct = {'depth': depth, 'inputSha256': sha(value), 'inputBytes': len(value), 'found': any(marker in v for v in [value] + views), 'issues': issues}
        directory = root / ('depth-' + str(depth))
        directory.mkdir()
        changed = {phase: dict(files) for phase, files in payloads.items()}
        twin = base64.b64decode(spec['plain']['twin'])
        live = spec['envelopes'][1]['envelope'].encode()
        changed['rotate']['host-log'] = fixture_record_file([twin, live, value])
        raw = make_frames(spec, changed, directory)
        parser = compile_normalizer(spec)
        (directory / 'raw.jsonl').write_bytes(raw)
        save(directory / 'case.json', spec)
        (directory / 'normalizer.py').write_bytes(parser)
        process = subprocess.run([sys.executable, '-I', '-B', str(directory / 'normalizer.py')], input=raw,
            capture_output=True, timeout=180)
        (directory / 'stdout').write_bytes(process.stdout)
        (directory / 'stderr').write_bytes(process.stderr)
        assert process.returncode == 0, process.stderr
        record = json.loads(process.stdout)
        save(directory / 'records.json', record)
        row = next(v for v in record['scans'] if v['scan'] == 'P' and v['location'] == 'host-log')
        direct.update(fullStatus=row['status'], aggregateObserved=record['status'],
            protectedHits=row['observations']['rotate']['protectedHits'],
            unparsedBytes=sum(v['unparsedBytes'] for p in row['coverage'].values() for v in p.values()))
        save(directory / 'comparison.json', direct)
        depth_results.append(direct)
        print(json.dumps(direct), flush=True)

    for rel, pin in pins.items():
        assert sha((REPO / rel).read_bytes()) == pin, rel
    assert sha(Path(__file__).read_bytes()) == own_sha
    summary = {'candidate': CANDIDATE, 'runId': spec['runId'], 'counts': counts, 'depthResults': depth_results,
        'problemCount': len(problems), 'scope': 'offline direct closure matrix and source-bound full-normalizer boundary replays'}
    save(root / 'summary.json', summary)
    (root / 'SHA256SUMS').write_text('\n'.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(root)) for p in sorted(root.rglob('*')) if p.is_file()) + '\n')
    print(json.dumps(summary), flush=True)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Independent Unicode combinations, full-parser representatives and evidence readback."""
import argparse
import base64
import copy
import hashlib
import itertools
import json
from pathlib import Path
import quopri
import re
import shutil
import sqlite3
import subprocess
import sys
from urllib.parse import unquote_to_bytes

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
ROOT = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S/round4')
sys.path.insert(0, str(REPO / 'lab/observer/erasure'))
from compile import compile_normalizer
from fixtures import make_frames, packed
from matrix import sqlite_pack, variable, varint_inverse


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    path.write_bytes(packed(value) + b'\n')


def readback(directory, expected=None):
    manifest = directory / 'SHA256SUMS'
    raw = manifest.read_bytes()
    if expected:
        assert sha(raw) == expected, str(directory)
    seen, total = set(), 0
    for line in raw.decode().splitlines():
        digest, relative = line.split('  ', 1)
        path = (directory / relative).resolve()
        assert path.is_relative_to(directory.resolve()) and path not in seen
        seen.add(path)
        data = path.read_bytes()
        assert sha(data) == digest, str(path)
        total += len(data)
    assert seen == {p.resolve() for p in directory.rglob('*') if p.is_file() and p != manifest}
    return {'path': str(directory), 'files': len(seen), 'bytes': total, 'manifestSha256': sha(raw)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', type=Path, default=ROOT)
    ap.add_argument('--attempt', default='validation-02')
    ap.add_argument('--boundary', default='boundary-02')
    args = ap.parse_args()
    root = args.root.resolve()
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    assert Path(args.attempt).name == args.attempt and Path(args.boundary).name == args.boundary
    output = root / args.attempt
    output.mkdir(parents=True, exist_ok=False)
    own_sha = sha(Path(__file__).read_bytes())
    shutil.copyfile(__file__, output / 'finish-executed.py')
    matrix = root / 'matrix-01'
    pins = json.loads((matrix / 'source-pins.json').read_bytes())
    for relative, digest in pins['observerSources'].items():
        assert sha((REPO / relative).read_bytes()) == digest
    assert sha((HERE / 'matrix.py').read_bytes()) == pins['verifierSha256']
    observations = json.loads((matrix / 'summary.json').read_bytes())
    spec = json.loads((matrix / 'fixture/case.json').read_bytes())
    payloads = {}
    for line in (matrix / 'fixture/raw.jsonl').read_bytes().splitlines():
        sample = json.loads(base64.b64decode(json.loads(line)['rawBase64']))
        payloads[sample['phase']] = {v['fileId']: base64.b64decode(v['bytes']) for v in sample['files']}
    ns = {'__name__': 'round4_frozen_validation'}
    frozen = (matrix / 'frozen-normalizer.py').read_bytes()
    exec(frozen, ns)
    marker = 'unicode-control-😀-雪'.encode()

    def ujson(raw):
        units = raw.decode().encode('utf-16be')
        return ('"' + ''.join('\\u%04x' % int.from_bytes(units[i:i + 2], 'big') for i in range(0, len(units), 2)) + '"').encode()

    # [CX-VER01S-R4] Why: supplementary-plane and UTF-8 octet controls need independent inverse checks too.
    # Rejected: relying solely on an ASCII matrix or decoder-generated expected values.
    unicode_layers = {
        'json': (lambda b: json.dumps(b.decode(), ensure_ascii=True).encode(), lambda b: json.loads(b).encode()),
        'json-unicode': (ujson, lambda b: json.loads(b).encode()),
        'byte-hex': (lambda b: b''.join(('\\x%02x' % v).encode() for v in b), lambda b: bytes(int(b[i + 2:i + 4], 16) for i in range(0, len(b), 4))),
        'byte-octal': (lambda b: b''.join(('\\%03o' % v).encode() for v in b), lambda b: bytes(int(b[i + 1:i + 4], 8) for i in range(0, len(b), 4))),
        'url': (lambda b: b''.join(('%%%02X' % v).encode() for v in b), unquote_to_bytes),
        'quoted-printable': (lambda b: b''.join(('=%02X' % v).encode() for v in b), quopri.decodestring),
        'base64': (base64.b64encode, base64.b64decode),
        'base64url': (lambda b: base64.urlsafe_b64encode(b).rstrip(b'='), lambda b: base64.urlsafe_b64decode(b + b'=' * (-len(b) % 4))),
        'folded-base64': (lambda b: b'\r\n'.join(base64.b64encode(b)[i:i + 16] for i in range(0, len(base64.b64encode(b)), 16)), base64.b64decode),
        'hex': (lambda b: b.hex().encode(), lambda b: bytes.fromhex(b.decode())),
        # [CX-VER01S-5] Why: ASCII byte-varints are an identity; UTF-8 octets exercise real varint decoding.
        # Rejected: counting the ASCII framing matrix as evidence for high-bit varints (no transformation).
        'byte-varints': (lambda b: b''.join(variable(v) for v in b), varint_inverse),
    }
    unicode_counts = {'pairs': 0, 'triples': 0, 'found': 0, 'foundWithIssues': 0, 'misses': 0, 'outOfDomain': 0}
    with (output / 'unicode-matrix.jsonl').open('wb') as log:
        for size in (2, 3):
            for names in itertools.product(unicode_layers, repeat=size):
                raw = marker
                try:
                    for name in names:
                        raw = unicode_layers[name][0](raw)
                except UnicodeError:
                    unicode_counts['outOfDomain'] += 1
                    log.write(packed({'layers': names, 'status': 'OUT-OF-DOMAIN',
                        'reason': 'text encoder requires valid UTF-8'}) + b'\n')
                    continue
                expected = raw
                for name in reversed(names):
                    expected = unicode_layers[name][1](expected)
                assert expected == marker
                decoded, _, issues = ns['supplemental_views'](raw)
                found = any(marker in b for b in [raw] + decoded)
                unicode_counts['pairs' if size == 2 else 'triples'] += 1
                unicode_counts['foundWithIssues' if found and issues else 'found' if found else 'misses'] += 1
                log.write(packed({'layers': names, 'inputBase64': base64.b64encode(raw).decode(), 'inputSha256': sha(raw),
                    'found': found, 'issues': issues}) + b'\n')
            print(json.dumps({'unicode': unicode_counts}), flush=True)

    wanted = json.loads((matrix / 'matrix-contract.json').read_bytes())['layers']
    selected = {}
    with (matrix / 'matrix.jsonl').open() as log:
        for line in log:
            row = json.loads(line)
            names = row['layers']
            if row.get('found') and names[:2] == ['json-unicode', 'base64'] and len(names) == 3:
                selected[names[-1]] = row
    assert set(selected) == set(wanted)
    full_results = []
    target = base64.b64decode(spec['plain']['target'])
    twin = base64.b64decode(spec['plain']['twin'])
    live = spec['envelopes'][1]['envelope'].encode()
    # [CX-VER01S-R4] Why: exercise each outer layer through the complete normalizer and native SQLite acquisition.
    # Rejected: equating direct closure findings with a full P/C/K/D acceptance receipt.
    for name, row in selected.items():
        raw_value = (matrix / 'inputs' / row['inputSha256']).read_bytes()
        directory = output / ('full-' + name)
        directory.mkdir()
        path = directory / 'h1.db'
        db = sqlite3.connect(path)
        try:
            db.execute('CREATE TABLE controls(value BLOB)')
            db.executemany('INSERT INTO controls VALUES (?)', [(twin,), (live,), (raw_value,)])
            db.commit()
            assert db.execute('SELECT value FROM controls ORDER BY rowid DESC LIMIT 1').fetchone()[0] == raw_value
            native = path.read_bytes()
        finally:
            db.close()
        changed = copy.deepcopy(payloads)
        changed['rotate']['q-recent-rows-h1'] = native
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
        p = next(v for v in record['scans'] if v['scan'] == 'P' and v['location'] == 'q-recent-rows-h1')
        result = {'outerLayer': name, 'layers': row['layers'], 'observed': p['status'],
            'protectedHits': p['observations']['rotate']['protectedHits'], 'aggregateObserved': record['status'],
            'unparsedBytes': sum(v['unparsedBytes'] for phase in p['coverage'].values() for v in phase.values()),
            'inputSha256': sha(raw), 'parserSha256': sha(parser)}
        save(directory / 'comparison.json', result)
        full_results.append(result)
        print(json.dumps(result), flush=True)

    for relative, digest in pins['observerSources'].items():
        assert sha((REPO / relative).read_bytes()) == digest
    assert sha(Path(__file__).read_bytes()) == own_sha
    assert sha((HERE / 'matrix.py').read_bytes()) == pins['verifierSha256']
    # [CX-VER01S-5] Why: publish a verdict only after complete evidence and baseline readback.
    # Rejected: writing ACCEPT before checking the historical regression gate (could leave a partial verdict).
    builder = json.loads((REPO / 'lab/experiments/EXP-ER01-S/round4/INDEX.json').read_bytes())
    readbacks = [readback(Path(builder['finalRun']), builder['manifestSha256'])]
    readbacks += [readback(root / name) for name in ('baseline-01', 'matrix-01', args.boundary)]
    baseline = json.loads((root / 'baseline-01/RESULT.json').read_bytes())
    assert baseline['status'] == 'PASS' and baseline['qaScenarioCount'] == 61 and baseline['secondBlockFsstControl'] is True
    assert {'lab/observer/erasure/' + rel: digest for rel, digest in baseline['sourceSha256'].items()} == pins['observerSources']
    for suite, count in (('test_formats.py', 11), ('test_scanners.py', 28)):
        log = (root / 'baseline-01' / (suite + '.stderr')).read_text()
        assert re.search(r'Ran ' + str(count) + r' tests in [0-9.]+s\s+OK', log), log
    boundary = json.loads((root / args.boundary / 'summary.json').read_bytes())
    assert boundary['candidate'] == pins['candidate'] and boundary['runId'] == spec['runId']
    assert boundary['qualified'] and len(boundary['results']) == 2
    assert sha((HERE / 'boundary.py').read_bytes()) == boundary['verifierSha256']
    assert unicode_counts['pairs'] + unicode_counts['triples'] + unicode_counts['outOfDomain'] == len(unicode_layers) ** 2 + len(unicode_layers) ** 3
    assert observations['counts']['pairs'] + observations['counts']['triples'] + observations['counts']['outOfDomain'] == len(wanted) ** 2 + len(wanted) ** 3
    for relative, digest in pins['observerSources'].items():
        assert sha((REPO / relative).read_bytes()) == digest
    assert sha(Path(__file__).read_bytes()) == own_sha
    depth33 = next(v for v in observations['depthResults'] if v['depth'] == 33)
    accepted = (observations['problemCount'] == 0 and unicode_counts['misses'] == 0 and
        depth33['fullStatus'] == 'REFUSED' and depth33['unparsedBytes'] > 0 and
        all(v['protectedHits'] > 0 and v['observed'] in ('FAIL', 'REFUSED') for v in full_results))
    summary = {'candidate': pins['candidate'], 'runId': spec['runId'], 'unicodeCounts': unicode_counts,
        'fullResults': full_results, 'unicodeMarkerSha256': sha(marker), 'unicodeLayers': list(unicode_layers),
        'verifierSha256': own_sha, 'verdict': 'ACCEPT' if accepted else 'FIX-FIRST',
        'claim': 'offline decoder/scanner QA only; no live erasure acceptance or obligation promotion'}
    save(output / 'summary.json', summary)
    (output / 'SHA256SUMS').write_text('\n'.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(output)) for p in sorted(output.rglob('*')) if p.is_file()) + '\n')
    readbacks.append(readback(output))
    index = {'format': 'cx-ver01s-round4-index/1', 'candidate': pins['candidate'], 'verdict': summary['verdict'],
        'runId': spec['runId'], 'historicalScenarios': 61, 'unitTests': 39, 'secondBlockFsstControl': True,
        'asciiCounts': observations['counts'], 'unicodeCounts': unicode_counts, 'depthResults': observations['depthResults'],
        'additionalBoundaryResults': boundary['results'],
        'fullNormalizerOuterLayers': len(full_results), 'readbacks': readbacks, 'claim': summary['claim']}
    save(HERE / 'INDEX.json', index)
    lines = [v['manifestSha256'] + '  ' + str(Path(v['path']) / 'SHA256SUMS') for v in readbacks]
    for path in sorted(HERE.iterdir()):
        if path.is_file() and path.name not in ('SHA256SUMS', 'validation-01.stdout', 'validation-01.stderr'):
            lines.append(sha(path.read_bytes()) + '  ' + str(path))
    (HERE / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')
    print(json.dumps(index, sort_keys=True), flush=True)


if __name__ == '__main__':
    main()

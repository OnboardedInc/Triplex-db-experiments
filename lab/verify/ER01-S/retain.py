#!/usr/bin/env python3
"""Read back durable QA evidence and publish a small content-hash index, never an erasure PASS."""
import json
from pathlib import Path
import shutil
import hashlib

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ROOT = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VER01S')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def packed(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode() + b'\n'


def main():
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    # [CX-VER01S] Why: keep the first failed verifier diagnostic and its correction separate.
    # Rejected: replacing the failed directory with a successful rerun.
    failed = ROOT / 'coverage-01'
    diagnostic = {'result': 'verifier assertion failure', 'semanticErasureVerdict': None,
        'cause': 'gzip of random binary retained searchable bytes; K correctly returned FAIL',
        'rerun': 'coverage-02', 'correction': 'gzip hex form; assert independent decode and absence of all three literal key forms',
        'sourceSnapshot': 'coverage-executed.py was copied immediately after failure; post-failure snapshot, not a prior source-pin witness'}
    (failed / 'diagnostic.json').write_bytes(packed(diagnostic))
    files = []
    for path in sorted(failed.rglob('*')):
        if path.is_file() and path.name != 'SHA256.json':
            data = path.read_bytes()
            files.append({'path': str(path.relative_to(failed)), 'bytes': len(data), 'sha256': sha(data)})
    (failed / 'SHA256.json').write_bytes(packed({'files': files}))

    attempts = []
    checksums = []
    # [CX-VER01S] Why: every manifest entry is read back, with path confinement and exact bytes.
    # Rejected: treating a generated manifest or an exit code as content verification.
    for name in ('attempt-01', 'coverage-01', 'coverage-02'):
        directory = ROOT / name
        path = directory / 'SHA256.json'
        manifest = json.loads(path.read_bytes())
        seen = set()
        for item in manifest['files']:
            source = (directory / item['path']).resolve()
            assert source.is_relative_to(directory.resolve()) and source not in seen
            seen.add(source)
            data = source.read_bytes()
            assert sha(data) == item['sha256'] and len(data) == item['bytes'], str(source)
        files_now = {p.resolve() for p in directory.rglob('*') if p.is_file() and p != path}
        assert seen == files_now, name
        attempts.append({'path': str(directory), 'manifestSha256': sha(path.read_bytes()),
            'manifestFileCount': len(seen), 'manifestBytes': sum(item['bytes'] for item in manifest['files']),
            'result': 'retained failed verifier diagnostic' if name == 'coverage-01' else 'completed QA reproduction'})
        checksums.append((path, sha(path.read_bytes())))
        for leaf in ('summary.json', 'source-pins.json', 'diagnostic.json'):
            path = directory / leaf
            if path.is_file():
                checksums.append((path, sha(path.read_bytes())))

    source_pins = json.loads((ROOT / 'attempt-01/source-pins.json').read_bytes())
    for relative, pin in source_pins['sources'].items():
        assert sha((REPO / relative).read_bytes()) == pin, relative
    for name, pin in source_pins['verifierSources'].items():
        assert sha((HERE / name).read_bytes()) == pin, name
    supplemental = json.loads((ROOT / 'coverage-02/summary.json').read_bytes())
    for relative, pin in supplemental['verifierSources'].items():
        assert sha((REPO / relative).read_bytes()) == pin, relative
    index = {'format': 'cx-ver01s-evidence-index/1', 'candidate': source_pins['candidate'],
        'fixtureRunId': supplemental['fixtureRunId'], 'verdict': 'FIX-FIRST',
        'claim': 'QA reproductions only; no engine or semantic erasure PASS',
        'completedScenarios': 31, 'attempts': attempts,
        'primaryFindings': {'F1': 'attempt-01/sqlite-overflow-plaintext and sqlite-overflow-envelope',
            'F2': 'coverage-02/new-wrapper-old-wal-UTF-16le; compare UTF-8'},
        'baseline': 'baseline.stderr: 25 original tests OK; source unchanged',
        'firstFailure': diagnostic}
    (HERE / 'EVIDENCE.json').write_bytes(packed(index))
    checksums.append((HERE / 'EVIDENCE.json', sha((HERE / 'EVIDENCE.json').read_bytes())))
    for name in ('review.py', 'coverage.py', 'rewrap.mjs', 'retain.py', 'baseline.stderr',
                 'review-attempt-01.stdout', 'review-attempt-01.stderr',
                 'coverage-01.stdout', 'coverage-01.stderr', 'coverage-02.stdout', 'coverage-02.stderr'):
        path = HERE / name
        checksums.append((path, sha(path.read_bytes())))
    (HERE / 'SHA256SUMS').write_text(''.join(pin + '  ' + str(path) + '\n' for path, pin in checksums))
    print(json.dumps(index, sort_keys=True))


if __name__ == '__main__':
    main()

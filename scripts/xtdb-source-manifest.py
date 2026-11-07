#!/usr/bin/env python3
"""Copy immutable workload inputs and audit the explicitly protected references.

Uses only Python's standard library. Never writes to a reference checkout.
Capture is create-only: subsequent runs must verify, rather than reset, evidence.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
from datetime import datetime, timezone

PROJECT = Path(__file__).resolve().parents[1]
REFERENCE = Path('[LOCAL_PATH_0019]')
TRIPLEX = REFERENCE / 'triplex-source'
DUCKDB = REFERENCE / 'research-reference'
TEMPORAL = 'projects/temporal-datalog'
MANIFEST = PROJECT / 'qualification/source-manifest.json'


def git(root, *args):
    return subprocess.check_output(
        ['git', '--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', str(root), *args],
        text=True,
    ).strip()


def digest(path):
    hasher = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


def protected(root, pathspec=None):
    args = ['ls-files', '-z'] + ([pathspec] if pathspec else [])
    paths = git(root, *args).split('\0')
    # Source, documentation and committed evidence only; no untracked databases,
    # dependencies, git internals, caches or running-process state is inspected.
    files = {}
    for name in sorted(filter(None, paths)):
        path = root / name
        if path.is_file():
            files[name] = {'sha256': digest(path), 'bytes': path.stat().st_size}
    return {
        'root': str(root),
        'head': git(root, 'rev-parse', 'HEAD'),
        'trackedStatus': git(root, 'status', '--porcelain=v1', '--untracked-files=no', '--', pathspec or '.'),
        'files': files,
    }


def capture():
    if MANIFEST.exists():
        raise SystemExit('Manifest already exists; use --verify. Do not reset an audit baseline.')
    target = PROJECT / 'qualification/workloads'
    target.mkdir(parents=True, exist_ok=True)
    copies = {}
    for source in sorted((DUCKDB / TEMPORAL / 'runtime/workloads').iterdir()):
        if not source.is_file() or source.suffix not in {'.json', '.mjs', '.py'}:
            continue
        destination = target / source.name
        if destination.exists():
            raise SystemExit(f'Refusing to replace {destination}')
        shutil.copy2(source, destination)
        copies[str(destination.relative_to(PROJECT))] = {
            'source': str(source), 'sha256': digest(destination), 'bytes': destination.stat().st_size,
        }
    upstream_package = json.loads((TRIPLEX / 'packages/core/package.json').read_text())
    root_package = json.loads((TRIPLEX / 'package.json').read_text())
    report = {
        'format': 'triplex-xtdb-source-manifest/1',
        'capturedAt': datetime.now(timezone.utc).isoformat(),
        'triplexCoreVersion': upstream_package['version'],
        'triplexMonorepoVersion': root_package['version'],
        'protectionScope': 'All tracked Triplex files and tracked temporal-datalog project files; '
                           'does not claim an inventory of untracked data or process state.',
        'protected': [protected(TRIPLEX), protected(DUCKDB, TEMPORAL)],
        'copiedWorkloads': copies,
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    with MANIFEST.open('x') as output:
        json.dump(report, output, indent=2)
        output.write('\n')
    print(json.dumps({'result': 'CAPTURED', 'manifest': str(MANIFEST), 'copiedFiles': len(copies),
                      'protectedFiles': sum(len(item['files']) for item in report['protected'])}))


def verify():
    original = json.loads(MANIFEST.read_text())
    differences = []
    for expected in original['protected']:
        root = Path(expected['root'])
        scope = None if root == TRIPLEX else TEMPORAL
        actual = protected(root, scope)
        if actual != expected:
            changed = sorted(set(actual['files']) ^ set(expected['files']))
            changed += [name for name in actual['files'].keys() & expected['files'].keys()
                        if actual['files'][name] != expected['files'][name]]
            differences.append({'root': str(root), 'changedFiles': sorted(changed),
                                'headMatches': actual['head'] == expected['head'],
                                'trackedStatusMatches': actual['trackedStatus'] == expected['trackedStatus']})
    for name, expected in original['copiedWorkloads'].items():
        path = PROJECT / name
        if not path.is_file() or digest(path) != expected['sha256']:
            differences.append({'copiedFile': name, 'result': 'CHANGED_OR_MISSING'})
    print(json.dumps({'format': 'triplex-xtdb-source-verification/1',
                      'result': 'PASS' if not differences else 'FAIL', 'differences': differences}))
    if differences:
        raise SystemExit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    options = parser.parse_args()
    verify() if options.verify else capture()

#!/usr/bin/env python3
"""Retain interrupted verifier attempts separately from the completed semantic gate."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import time

from finish import readback

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, sort_keys=True) + '\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', required=True, type=Path)
    args = ap.parse_args()
    root = args.root.resolve()
    if shutil.disk_usage(REPO).free < 5 * 1024 ** 3:
        raise RuntimeError('below 5 GiB disk floor')
    output = root / 'retention-01'
    output.mkdir(exist_ok=False)
    own_pin = sha(Path(__file__).read_bytes())
    primary_raw = (HERE / 'INDEX.json').read_bytes()
    primary = json.loads(primary_raw)
    pins = json.loads((root / 'matrix-01/source-pins.json').read_bytes())
    assert primary['candidate'] == pins['candidate'] and primary['runId']
    assert primary['verdict'] == 'ACCEPT' and primary['historicalScenarios'] == 61
    readbacks = [readback(Path(row['path']), row['manifestSha256']) for row in primary['readbacks']]
    retained = []
    # [CX-VER01S-5] Why: post-interruption retention proves bytes only, never an original semantic result.
    # Rejected: silently replacing the incomplete attempts or giving their new manifests a gate PASS.
    for name, status in (('boundary-01', 'ABORTED'), ('validation-01', 'FAILED-MISSING-DEPENDENCY')):
        directory = root / name
        files = sorted(p for p in directory.rglob('*') if p.is_file())
        lines = [sha(p.read_bytes()) + '  ' + str(p.relative_to(directory)) for p in files]
        manifest = ('\n'.join(lines) + '\n').encode()
        (output / (name + '.SHA256SUMS')).write_bytes(manifest)
        assert set(files) == {p for p in directory.rglob('*') if p.is_file()}
        for line in lines:
            pin, rel = line.split('  ', 1)
            assert sha((directory / rel).read_bytes()) == pin
        retained.append({'path': str(directory), 'files': len(files), 'bytes': sum(p.stat().st_size for p in files),
            'status': status, 'manifestSha256': sha(manifest), 'manifestPath': str(output / (name + '.SHA256SUMS')),
            'claim': 'post-interruption retention only; no semantic acceptance or original manifest claim'})
    for path in [p for p in HERE.iterdir() if p.is_file() and p.name not in ('SHA256SUMS', 'FINAL-INDEX.json')] + [HERE.parent / 'VERIFY-round4.md']:
        target = output / 'verifier' / path.name
        target.parent.mkdir(exist_ok=True)
        shutil.copyfile(path, target)
        assert target.read_bytes() == path.read_bytes()
    for rel, digest in pins['observerSources'].items():
        data = (REPO / rel).read_bytes()
        assert sha(data) == digest
        assert data == subprocess.check_output(['git', 'show', primary['candidate'] + ':' + rel], cwd=REPO)
    assert sha(Path(__file__).read_bytes()) == own_pin
    assert (HERE / 'INDEX.json').read_bytes() == primary_raw
    save(output / 'RECEIPT.json', {'format': 'cx-ver01s-round4-retention/1', 'timeUnixMs': time.time_ns() // 1000000,
        'candidate': primary['candidate'], 'runId': primary['runId'], 'primaryIndexSha256': sha(primary_raw),
        'primaryVerdict': primary['verdict'], 'completedReadbacks': readbacks, 'incompleteAttempts': retained,
        'preReportCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO).decode().strip(),
        'verifierSha256': own_pin, 'claim': 'offline fixture QA and retention only; no live-engine acceptance'})
    (output / 'SHA256SUMS').write_text('\n'.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(output))
        for p in sorted(output.rglob('*')) if p.is_file()) + '\n')
    receipt = readback(output)
    save(HERE / 'FINAL-INDEX.json', {'primaryIndexSha256': sha(primary_raw), 'verdict': primary['verdict'],
        'candidate': primary['candidate'], 'readback': receipt, 'incompleteAttempts': retained})
    manifests = [Path(v['path']) / 'SHA256SUMS' for v in readbacks] + [output / 'SHA256SUMS']
    files = sorted(p for p in HERE.iterdir() if p.is_file() and p.name != 'SHA256SUMS')
    files += [HERE.parent / 'VERIFY-round4.md'] + manifests
    lines = [sha(p.read_bytes()) + '  ' + str(p) for p in files]
    (HERE / 'SHA256SUMS').write_text('\n'.join(lines) + '\n')
    for line in lines:
        digest, path = line.split('  ', 1)
        assert sha(Path(path).read_bytes()) == digest
    print(json.dumps({'verdict': primary['verdict'], 'candidate': primary['candidate'], 'retention': receipt,
        'reviewManifestSha256': sha((HERE / 'SHA256SUMS').read_bytes())}, sort_keys=True))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""CX-VOBS6: verify retained bytes and index an offline FIX-FIRST review."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VOBS6')
REVIEWED = 'c1a14ad577fcdebbfdea4407b9d5999da12ac0e2'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    # [CX-VOBS6] Why: a receipt is about read-back bytes, not successful commands.
    # Rejected: adopting the builder's historical test status as fresh review.
    attempts = ['baseline01', 'baseline02', 'adversarial01', 'adversarial02', 'adversarial03']
    checked = 0
    for name in attempts:
        directory = EVIDENCE / name
        for line in (directory / 'SHA256SUMS').read_text().splitlines():
            digest, relative = line.split('  ', 1)
            file = directory / relative
            assert file.is_relative_to(directory) and sha(file.read_bytes()) == digest, file
            checked += 1
    baseline = json.loads((EVIDENCE / 'baseline02/RESULT.json').read_bytes())
    assert baseline['status'] == 'PASS'
    assert 'Ran 11 tests' in (EVIDENCE / 'baseline02/python.stderr').read_text()
    assert '# pass 9' in (EVIDENCE / 'baseline02/engine.stdout').read_text()
    final = json.loads((EVIDENCE / 'adversarial03/RESULT.json').read_bytes())
    assert final['sourceUnchanged']
    checks = {entry['name']: entry for entry in final['checks']}
    assert len(checks) == 9
    assert checks['path-replacement']['lateLowerBoundNs'] > 300_000_000
    assert checks['path-replacement']['outcome'] == 'ACCEPTED'
    assert checks['synchronous-off']['writerSynchronous'] == 0
    assert checks['synchronous-off']['explicitSyncStartNs'] - checks['synchronous-off']['observedU'] > 300_000_000
    assert checks['synchronous-off']['outcome'] == 'ACCEPTED'
    impossible = checks['send-after-publication']['details']
    assert impossible['sendNs'] > impossible['windowUpperNs']
    assert checks['send-after-publication']['outcome'] == 'ACCEPTED'
    for name in ('wal-rewrite', 'wal-reset', 'wal-checksum', 'unknown-schema', 'checkpoint-rollover'):
        assert checks[name]['outcome'] == 'REFUSED'
    for name, digest in final['sourceSha256'].items():
        assert sha((ROOT / name).read_bytes()) == digest, name
        if not name.startswith('lab/verify/'):
            original = subprocess.check_output(['git', 'show', REVIEWED + ':' + name], cwd=ROOT)
            assert sha(original) == digest, name
    docs = [ROOT / 'lab/observer/VM.md', ROOT / 'lab/experiments/EXP-OBS01/REPORT.md',
            Path('/Users/sam/projects/triplex-db-2/lab/research/R44-ns-run-execution.md'),
            Path('/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS-PENDING.md'),
            Path('/Users/sam/projects/triplex-db-2/.claude/worktrees/g03/lab/experiments/EXP-G03/V-PROBES.md')]
    inputs = {str(file): sha(file.read_bytes()) for file in docs}
    rows = [line for line in docs[3].read_text().splitlines() if any(line.startswith('| ' + ruling + ' ') for ruling in ('Q100e', 'Q100q', 'Q100r', 'Q100s'))]
    assert len(rows) == 4
    (EVIDENCE / 'review-rulings.txt').write_text('\n'.join(rows) + '\n')
    (EVIDENCE / 'review-inputs.json').write_text(json.dumps(inputs, sort_keys=True, indent=2) + '\n')
    files = [p for p in sorted(EVIDENCE.rglob('*')) if p.is_file() and p.name != 'REVIEW-SHA256SUMS']
    manifest = ''.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(EVIDENCE)) + '\n' for p in files)
    (EVIDENCE / 'REVIEW-SHA256SUMS').write_text(manifest)
    destination = ROOT / 'lab/verify/OBS01'
    (destination / 'SHA256SUMS').write_text(manifest)
    index = {'format': 'CX-VOBS6-evidence-index/1', 'verdict': 'FIX-FIRST', 'reviewedCommit': REVIEWED,
             'evidenceRoot': str(EVIDENCE), 'files': len(files), 'bytes': sum(p.stat().st_size for p in files),
             'manifestSha256': sha(manifest.encode()), 'nestedManifestEntriesChecked': checked,
             'finalAttempt': 'adversarial03', 'sourceSha256': final['sourceSha256'],
             'retentionToolSha256': sha(Path(__file__).read_bytes()),
             'claim': 'offline review and file integrity only; no sealed VM or NS acceptance'}
    # [CX-VOBS6] Why: verify the complete retained set after manifest publication.
    # Rejected: checking only the previously listed subset when new files exist.
    current = {str(p.relative_to(EVIDENCE)) for p in EVIDENCE.rglob('*') if p.is_file() and p.name != 'REVIEW-SHA256SUMS'}
    assert current == {str(p.relative_to(EVIDENCE)) for p in files}
    for p in files:
        expected = next(line[:64] for line in manifest.splitlines() if line[66:] == str(p.relative_to(EVIDENCE)))
        assert sha(p.read_bytes()) == expected, p
    (destination / 'INDEX.json').write_text(json.dumps(index, sort_keys=True, indent=2) + '\n')
    print(json.dumps(index))


if __name__ == '__main__':
    main()

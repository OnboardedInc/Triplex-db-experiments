#!/usr/bin/env python3
"""CX-VOBS6 round 2 evidence readback; no live durability admission."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VOBS6/round8')
TARGET = Path('/Users/sam/projects/triplex-db-2/.claude/worktrees/obs01')


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    final_attempt = sys.argv[1]
    final = json.loads((EVIDENCE / final_attempt / 'RESULT.json').read_bytes())
    # [CX-VOBS6-R2] Why: only assertion-backed, current source-bound runs grant
    # an offline verdict. Rejected: fixture success as live P3 qualification.
    assert final['status'] == 'ACCEPT-OFFLINE' and final['sourceUnchanged']
    assert 'Ran 14 tests' in (EVIDENCE / final_attempt / 'python.stderr').read_text()
    assert 'OK' in (EVIDENCE / final_attempt / 'python.stderr').read_text()
    adapted = {check['name']: check for check in final['adaptedOriginalProbes']}
    assert len(adapted) == 9
    assert adapted['full-control']['outcome'] == 'ACCEPTED'
    for name, check in adapted.items():
        if name != 'full-control':
            assert check['outcome'] == 'REFUSED', name
    checks = {check['name']: check for check in final['checks']}
    assert len(checks) == 9
    assert checks['path-replacement']['outcome'] == 'REFUSED'
    rename = checks['rename-over-fast']
    assert rename['outcome'] == 'REFUSED' and any('rename/delete event' in e for e in rename['collectorErrors'])
    assert rename['swap']['durationNs'] < rename['swap']['surroundingMeasuredPollPeriodNs']
    for mode in ('sync-off-actual', 'sync-off-after-start', 'full-control'):
        assert checks[mode]['vm']['outcome'] == 'REFUSED' and 'F2' in checks[mode]['vm']['error']
    assert checks['sync-off-actual']['offline']['outcome'] == 'REFUSED'
    toggle = checks['sync-off-after-start']
    assert toggle['startWriterState']['pragmas']['synchronous'] == 2 and toggle['actualWriterSynchronous'] == 0
    assert toggle['offline']['outcome'] == 'ACCEPTED'
    assert checks['full-control']['offline']['outcome'] == 'ACCEPTED'
    for mode in ('F3-original', 'F3-send-U-plus-one', 'F3-grouped-future'):
        assert checks[mode]['outcome'] == 'REFUSED' and 'F20 driver send after publication' in checks[mode]['error']
    assert checks['F3-send-equals-U']['outcome'] == 'ACCEPTED'
    for name, digest in final['sourceSha256'].items():
        assert sha((TARGET / name).read_bytes()) == digest, name
        exact = subprocess.check_output(['git', 'show', final['reviewedCommit'] + ':' + name], cwd=ROOT)
        assert sha(exact) == digest
    assert sha((ROOT / 'lab/verify/OBS01/probe_round8.py').read_bytes()) == final['reviewerToolSha256']
    original = (ROOT / 'lab/verify/OBS01/probe_round7.py').read_bytes()
    assert sha(original) == final['originalProbeSha256']
    assert original == subprocess.check_output(['git', 'show', '2f1d1f10:lab/verify/OBS01/probe_round7.py'], cwd=ROOT)
    (EVIDENCE / 'original-reviewer-probe.py').write_bytes(original)
    (EVIDENCE / 'retention-tool.py').write_bytes(Path(__file__).read_bytes())
    count = 0
    attempts = {}
    for directory in sorted(EVIDENCE.glob('attempt*')):
        if not directory.is_dir():
            continue
        result = json.loads((directory / 'RESULT.json').read_bytes())
        attempts[directory.name] = {'status': result['status'], 'sourceUnchanged': result['sourceUnchanged'],
                                   'resultSha256': sha((directory / 'RESULT.json').read_bytes())}
        for line in (directory / 'SHA256SUMS').read_text().splitlines():
            digest, name = line.split('  ', 1)
            file = directory / name
            assert file.is_relative_to(directory) and sha(file.read_bytes()) == digest, file
            count += 1
    history = {'attempts': attempts, 'finalAttempt': final_attempt,
               'attempt01Note': 'Incomplete harness: refusal stopped polling before a following poll existed. '
                                'New attempt delays emulated inotify delivery until both adjacent poll starts are measured. '
                                'This note was authored after execution; original result and manifest are unchanged.'}
    (EVIDENCE / 'attempt-history.json').write_text(json.dumps(history, sort_keys=True, indent=2) + '\n')
    files = [p for p in sorted(EVIDENCE.rglob('*')) if p.is_file() and p.name != 'REVIEW-SHA256SUMS']
    manifest = ''.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(EVIDENCE)) + '\n' for p in files)
    (EVIDENCE / 'REVIEW-SHA256SUMS').write_text(manifest)
    destination = ROOT / 'lab/verify/OBS01'
    (destination / 'round8-SHA256SUMS').write_text(manifest)
    # [CX-VOBS6-R2] Why: validate full file-set equality and every final readback,
    # not just entries inherited from a partial attempt's nested manifest.
    assert {str(p.relative_to(EVIDENCE)) for p in files} == {
        str(p.relative_to(EVIDENCE)) for p in EVIDENCE.rglob('*') if p.is_file() and p.name != 'REVIEW-SHA256SUMS'}
    for line in manifest.splitlines():
        digest, name = line.split('  ', 1)
        assert sha((EVIDENCE / name).read_bytes()) == digest
    index = {'format': 'cx-vobs6-round8-index/1', 'verdict': 'ACCEPT-OFFLINE',
             'reviewedCommit': final['reviewedCommit'], 'evidenceRoot': str(EVIDENCE),
             'finalAttempt': final_attempt, 'files': len(files), 'bytes': sum(p.stat().st_size for p in files),
             'manifestSha256': sha(manifest.encode()), 'nestedManifestEntriesChecked': count,
             'sourceSha256': final['sourceSha256'], 'reviewerToolSha256': final['reviewerToolSha256'],
             'originalProbeSha256': sha(original), 'retentionToolSha256': sha(Path(__file__).read_bytes()),
             'scope': 'F1-F3 offline; VM durable/P3 evidence refuses pending independent sync enforcement'}
    (destination / 'round8-INDEX.json').write_text(json.dumps(index, sort_keys=True, indent=2) + '\n')
    print(json.dumps(index))


if __name__ == '__main__':
    main()

"""CX-VA01-040: verify and retain this review's actual offline artifacts.

Why: gate exits and claimed statuses alone do not establish content/freshness/binding.
Rejected: adopting historical builder outputs or including dependency caches in Git.
"""
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

R = Path(__file__).resolve().parents[3]
E = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040')
V = R / 'lab/verify/A01/evidence-0.4.0'
V.mkdir(exist_ok=False)
assert shutil.disk_usage(R).free >= 5 * 1024**3
HEAD = '4fa6192cf3b90ecc0f6f75ca018914d9590dd1eb'
sha = lambda b: hashlib.sha256(b).hexdigest()
load = lambda name: json.loads((E / name).read_text())
def store(path, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, target)
    assert path.read_bytes() == target.read_bytes()

summary = {'reviewedHead': HEAD, 'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
           'verdict': 'FIX-FIRST', 'scope': 'contract and offline review; no engine or performance qualification'}
for label in ['verify', 'contract-tests', 'mutations', 'evaluator', 'pack', 'explicit-w0-build-attempt2',
              *['G0-' + lane + '-after-w0-build' for lane in ['xtdb', 'datomic', 'qlever']]]:
    record = load(label + '.json')
    assert record['head'] == HEAD and record['exitCode'] == 0 and record['trackedInputsUnchanged'], label
    assert sha((E / (label + '.log')).read_bytes()) == record['logSha256'], label
    assert record['startedAt'] < record['endedAt']
for label, code in [('audit', 1), ('G0-xtdb', 1)]:
    record = load(label + '.json')
    assert record['head'] == HEAD and record['exitCode'] == code and record['trackedInputsUnchanged']
    assert sha((E / (label + '.log')).read_bytes()) == record['logSha256']
assert 'Ran 13 tests' in (E / 'contract-tests.log').read_text()
assert (E / 'contract-tests.log').read_text().rstrip().endswith('OK')
mutations = load('mutations-results.json')
assert len(mutations) == 34 and all(m['caught'] for m in mutations)
bad = [dict(commit=e['commit'], **p) for e in load('pin-history.json') for p in e['movedPins'] if not p['sameCommitRepin']]
assert len(bad) == 1 and bad[0]['path'] == 'lab/acceptance/oracle-contract.json'
summary['unrepinnedProjection'] = bad
for label in ['evaluator', 'merged-evaluator']:
    record = load(label + '.json')
    assert record['exitCode'] == 0 and record['trackedInputsUnchanged']
    raw = (E / (label + '.log')).read_bytes()
    assert sha(raw) == record['logSha256']
    counts = {k: int(v) for k, v in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$', raw.decode(), re.M)}
    assert counts == {'tests': 108, 'pass': 108, 'fail': 0, 'cancelled': 0, 'skipped': 0, 'todo': 0}
    summary[label] = {'head': record['head'], 'counts': counts, 'logSha256': sha(raw)}

pack, = (E / 'pack').glob('*/receipt.json')
receipt = json.loads(pack.read_text())
assert receipt['head'] == HEAD and receipt['status'] == 'PASS'
assert len(receipt['packages']) == 12 and len(receipt['imports']) == 25
for package in receipt['packages']:
    assert sha(Path(package['tarball']).read_bytes()) == package['sha256']
pack_inputs = load('pack.json')['inputs']
for p, digest in receipt['inputs'].items(): assert pack_inputs.get(p) == digest, p
for c in json.loads((pack.parent / 'commands.json').read_text()):
    assert c['exit'] == 0 and sha(Path(c['log']).read_bytes()) == c['outputSha256']
summary['pack'] = {'receipt': str(pack.relative_to(E)), 'sha256': sha(pack.read_bytes()), 'packages': 12, 'imports': 25}

summary['gates'] = []
labels = ['G0-xtdb'] + ['G0-' + lane + '-after-w0-build' for lane in ['xtdb', 'datomic', 'qlever']]
for label in labels:
    log = (E / (label + '.log')).read_text()
    rid, = re.findall(r'raw output runs/G0/(G0-[\w-]+)', log)
    path = R / 'lab/runs/G0' / (rid + '.json')
    gate = json.loads(path.read_text())
    envelope = load(label + '.json')
    stamp = lambda t: dt.datetime.fromisoformat(t.replace('Z', '+00:00'))
    assert stamp(envelope['startedAt']) <= stamp(gate['startedAt']) < stamp(gate['endedAt']) <= stamp(envelope['endedAt'])
    assert gate['experiment'] == 'CX-VA01-040' and gate['git']['head'] == HEAD
    assert not gate['git']['modifiedFiles'] and gate['git']['diffBytes'] == 0
    assert gate['slot'] is None and gate['counts']['unexpectedSkip'] == 0
    assert gate['contract']['sha256'] == load(label + '.json')['inputs']['lab/acceptance/obligations.json']
    if label == 'G0-xtdb':
        assert gate['verdict'] == 'FAIL' and gate['reasons'] == ['lab checkJs failed (exit 1)']
    else:
        assert gate['verdict'] == 'PASS' and not gate['reasons']
        expected = {'xtdb': (1289, 140), 'datomic': (1344, 66), 'qlever': (1513, 79)}[gate['lane']]
        assert gate['counts'] == {'executed': expected[0], 'pass': expected[0], 'fail': 0,
                                 'skip': expected[1], 'expectedSkip': expected[1], 'unexpectedSkip': 0}
        assert all(s['code'] == 0 for s in gate['steps'])
    grants = 0
    for step in gate['steps']:
        if 'parentGrant' in step:
            grant = step['parentGrant']
            assert grant['owner']['label'] == 'CX-VA01-040-' + label
            grants += 1
    assert grants >= 3
    for obj in gate['objects']:
        source = R / 'runs/objects' / obj['sha256']
        raw = source.read_bytes()
        assert len(raw) == obj['bytes'] and sha(raw) == obj['sha256']
        target = E / 'gates/runs/objects' / obj['sha256']
        if not target.exists(): store(source, target)
    shutil.copytree(R / gate['rawDir'], E / 'gates' / gate['rawDir'])
    store(path, E / 'gates/lab/runs/G0' / path.name)
    store(path, V / path.name)
    summary['gates'].append({'runId': rid, 'verdict': gate['verdict'], 'counts': gate['counts'],
                             'sha256': sha(path.read_bytes()), 'heavyGrants': grants})
    # Move only this review's own terminal receipt after retaining exact durable and Git copies.
    path.unlink()

w0 = load('explicit-w0-dist.json')['files']
for p, digest in w0.items():
    assert sha((R / p).read_bytes()) == digest == sha((E / 'explicit-w0-dist' / p).read_bytes())
summary['explicitW0Build'] = {'retainedFiles': len(w0), 'stableAcrossAllReruns': True}
summary['merge'] = load('merge.json')
merged_verify = load('merged-verify.json')
assert merged_verify['head'] == summary['merge']['mergedHead']
assert merged_verify['exitCode'] == 0 and merged_verify['trackedInputsUnchanged']
assert 'second regeneration byte-identical' in (E / 'merged-verify.log').read_text()
summary['mergedVerify'] = {'exitCode': 0, 'logSha256': sha((E / 'merged-verify.log').read_bytes())}
for file in ['review040.py', 'oracle-pin040.py', 'retain040.py', 'merge040.py']:
    store(R / 'lab/verify/A01' / file, E / 'review-tools' / file)
(E / 'artifact-audit.json').write_text(json.dumps(summary, indent=2) + '\n')
store(E / 'artifact-audit.json', V / 'artifact-audit.json')
for file in ['literal-pin-audit.json', 'pin-history.json', 'merge.json']:
    store(E / file, V / file)
entries = []
for p in sorted(E.rglob('*')):
    if not p.is_file() or p.is_symlink(): continue
    rel = p.relative_to(E)
    if any(x in ['node_modules', 'npm-cache', '_cacache', '.pnpm-store'] for x in rel.parts): continue
    entries.append((str(rel), sha(p.read_bytes()), p.stat().st_size))
(V / 'SHA256SUMS').write_text(''.join(h + '  ' + p + '\n' for p, h, _ in entries))
for p, digest, size in entries:
    assert sha((E / p).read_bytes()) == digest and (E / p).stat().st_size == size
print(json.dumps({'files': len(entries), 'bytes': sum(s for _, _, s in entries), 'verdict': 'FIX-FIRST'}))

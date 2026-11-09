"""CX-VA01-040: independent read-only contract review and fresh gate collector.

Why: preserve exact attempt outputs and reject stale or source-changing results.
Rejected: adopting builder receipts or writing mutation copies under acceptance/.
"""
import ast
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import runpy
import shutil
import subprocess as sp
import sys

R = Path(__file__).resolve().parents[3]
E = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040')
E.mkdir(parents=True, exist_ok=True)
G = R / 'lab/acceptance/build_contract.py'
BASE = 'd4227396'
sha = lambda b: hashlib.sha256(b).hexdigest()
now = lambda: dt.datetime.now(dt.timezone.utc).isoformat()
def git(*args):
    return sp.check_output(['git', *args], cwd=R)
def put(name, obj):
    (E / name).write_text(json.dumps(obj, indent=2) + '\n')
def snapshot():
    # Every tracked source byte, not merely the builder-selected pin inventory.
    return {p: sha((R / p).read_bytes()) for p in git('ls-files', '-z').decode().split('\0') if p and (R / p).is_file()}
def command(label, argv, heavy=True, env=None):
    assert shutil.disk_usage(R).free >= 5 * 1024**3
    cmd = ['node', 'lab/bin/heavy.mjs', '--label', 'CX-VA01-040-' + label, '--poll-ms', '100', '--', *argv] if heavy else argv
    start = now()
    before = snapshot()
    head = git('rev-parse', 'HEAD').decode().strip()
    with (E / (label + '.log')).open('x') as log:
        code = sp.call(cmd, cwd=R, env=env, stdout=log, stderr=sp.STDOUT)
    record = {'command': cmd, 'startedAt': start, 'endedAt': now(), 'head': head,
              'exitCode': code, 'logSha256': sha((E / (label + '.log')).read_bytes()),
              'trackedInputsUnchanged': before == snapshot(), 'inputs': before}
    put(label + '.json', record)
    print(label, code, record['trackedInputsUnchanged'], flush=True)
    assert record['trackedInputsUnchanged'], label
    return code

def mutations():
    C = runpy.run_path(str(G))
    source = G.read_text().replace('HERE = pathlib.Path(__file__).resolve().parent', 'HERE = pathlib.Path(' + repr(str(G.parent)) + ')')
    tests = {}
    for rid in C['RULES_040']:
        tests[rid + ' literal'] = f'RULES_040[{rid!r}]["rule"] = "weakened"'
        dest = 'FEED_RULES' if rid.startswith('Q98') else 'POSITION_MAPPING_RULES' if rid == 'Q101a' else 'NO_REGRESSION_RULES'
        tests[rid + ' consumer'] = f'{dest}.pop({rid!r})'
    for stage in ['QNODELAY', 'CHECKJS', 'CHECKJS_FINAL']:
        for i, pin in enumerate(C['PIN_STAGE_' + stage]):
            tests['repin ' + pin['path']] = f'PIN_STAGE_{stage}[{i}]["sha256"] = "0" * 64'
    tests.update({'repin Datomic image': 'DATOMIC_IMAGE_040["imageId"] = "sha256:" + "0" * 64',
                  'Q98 identity-only': 'FEED_POLICY["identityOnly"] = False',
                  'Q101 mapping consumers': 'POSITION_MAPPING_POLICY["consumers"] = []',
                  'Q104 bootstrap': 'NO_REGRESSION_POLICY["p99Alternative"] = "any percentile"',
                  'Q104 AA': 'NO_REGRESSION_POLICY["minAaRounds"] = 1'})
    temp = R / 'lab/verify/A01/mutation040.tmp.py'
    outputs = {p.name: sha(p.read_bytes()) for p in G.parent.iterdir() if p.is_file()}
    results = []
    try:
        # A separate known-good copy must pass before any negative control counts.
        temp.write_text(source)
        p = sp.run([sys.executable, '-I', '-B', str(temp), '--verify'], capture_output=True, text=True)
        assert p.returncode == 0 and 'byte-identical' in p.stdout, p.stdout + p.stderr
        for name, code in tests.items():
            temp.write_text(source.replace('\ndef main():', '\n' + code + '\n\ndef main():'))
            p = sp.run([sys.executable, '-I', '-B', str(temp), '--verify'], capture_output=True, text=True)
            caught = p.returncode != 0 and p.stdout.startswith('CONTRACT INVALID:\n')
            results.append({'name': name, 'caught': caught, 'exitCode': p.returncode,
                            'stdout': p.stdout, 'stderr': p.stderr, 'mutantSha256': sha(temp.read_bytes())})
            print(name, caught, flush=True)
    finally:
        temp.unlink(missing_ok=True)
    assert outputs == {p.name: sha(p.read_bytes()) for p in G.parent.iterdir() if p.is_file()}
    put('mutations-results.json', results)
    assert len(results) == 34 and all(x['caught'] for x in results)

def audit():
    old = git('show', BASE + ':lab/acceptance/RULINGS-PENDING.md').decode()
    new = (R / 'lab/acceptance/RULINGS-PENDING.md').read_text()
    pattern = r'^\| (Q\d+[a-z]?)\b([^|]*)\| (.*?) \| (.*?) \|$'
    rows = lambda s: {m[1]: (m[2].strip(), m[3], m[4]) for m in re.finditer(pattern, s, re.M)}
    a, b = rows(old), rows(new)
    expected = {'Q98' + c for c in 'abcdefghi'} | {'Q101a', 'Q104a'}
    assert a.keys() - b.keys() == expected and not b.keys() - a.keys()
    assert all(a[k] == b[k] for k in b)
    doc = json.loads((G.parent / 'obligations.json').read_text())
    olddoc = json.loads(git('show', BASE + ':lab/acceptance/obligations.json'))
    compiled = {x['id']: x for x in doc['rulings']}
    assert set(compiled) - {x['id'] for x in olddoc['rulings']} == expected
    for rid in expected:
        assert compiled[rid]['ruling'] == a[rid][1]
        for file in ['RULINGS.md', 'ACCEPTANCE.md']:
            assert a[rid][1] in (G.parent / file).read_text()
    # Inspect maps, nested path/hash records, generated references, and SHA256SUMS.
    files = set(git('ls-tree', '-r', '--name-only', BASE).decode().splitlines())
    references = set()
    def walk(v):
        if isinstance(v, dict):
            for k, x in v.items():
                if k in files: references.add(k)
                walk(x)
        elif isinstance(v, list):
            for x in v: walk(x)
        elif isinstance(v, str) and v in files: references.add(v)
    for file in git('ls-tree', '-r', '--name-only', BASE, 'lab/acceptance').decode().splitlines():
        raw = git('show', BASE + ':' + file)
        if file.endswith('.json'):
            try: walk(json.loads(raw))
            except ValueError: pass
        elif file.endswith('.py'):
            for node in ast.walk(ast.parse(raw)):
                if isinstance(node, ast.Constant) and isinstance(node.value, str) and node.value in files:
                    references.add(node.value)
        elif 'SHA256SUMS' in file:
            for line in raw.decode().splitlines():
                m = re.match(r'^[0-9a-f]{64}\s+(.+)$', line)
                if m and m[1] in files: references.add(m[1])
    changed = []
    for file in sorted(references):
        oldbytes = git('show', BASE + ':' + file)
        current = R / file
        if not current.exists() or oldbytes != current.read_bytes():
            changed.append({'path': file, 'oldSha256': sha(oldbytes),
                            'newSha256': sha(current.read_bytes()) if current.exists() else None})
    put('literal-pin-audit.json', {'head': git('rev-parse', 'HEAD').decode().strip(),
        'compiledExactly': sorted(expected), 'pendingPreserved': len(b),
        'referenceFilesScanned': len(references), 'changedReferences': changed})
    # Pin locations remain named by their exact JSON trails; compare each merge to first parent.
    def pins(v, trail=()):
        found = {}
        if isinstance(v, dict):
            for key, value in v.items():
                if key in files and isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value):
                    found[trail + (key,)] = (key, value)
                elif key in ('path', 'file', 'source') and isinstance(value, str) and value in files:
                    for hkey in ('sha256', 'hash'):
                        if isinstance(v.get(hkey), str) and re.fullmatch('[0-9a-f]{64}', v[hkey]):
                            found[trail + (hkey,)] = (value, v[hkey])
                found.update(pins(value, trail + (key,)))
        elif isinstance(v, list):
            for i, value in enumerate(v): found.update(pins(value, trail + (i,)))
        return found
    history = []
    for rev in git('rev-list', '--first-parent', '--reverse', BASE + '..4fa6192c').decode().splitlines():
        parent = git('rev-parse', rev + '^1').decode().strip()
        prev = pins(json.loads(git('show', parent + ':lab/acceptance/obligations.json')))
        after = pins(json.loads(git('show', rev + ':lab/acceptance/obligations.json')))
        changes = []
        for trail, (file, digest) in prev.items():
            prior = git('show', parent + ':' + file)
            actual = git('show', rev + ':' + file)
            if digest == sha(prior) and actual != prior:
                match = after.get(trail)
                changes.append({'path': file, 'trail': trail, 'oldSha256': digest,
                                'newSha256': sha(actual), 'sameCommitRepin': match == (file, sha(actual))})
        history.append({'commit': rev, 'parent': parent, 'movedPins': changes})
    put('pin-history.json', history)
    assert all(x['sameCommitRepin'] for entry in history for x in entry['movedPins'])
    print('literal authority, pending rows and same-commit pin projections checked', flush=True)

mode = sys.argv[1]
if mode == 'mutations': mutations()
elif mode == 'audit': audit()
elif mode == 'contract':
    assert command('verify', ['python3', '-I', '-B', str(G), '--verify']) == 0
    assert command('contract-tests', ['python3', '-B', 'lab/experiments/EXP-A01-acceptance-contract/regressions/test040.py']) == 0
    assert command('mutations', ['python3', '-I', '-B', str(Path(__file__).resolve()), 'mutations']) == 0
    assert command('audit', ['python3', '-I', '-B', str(Path(__file__).resolve()), 'audit']) == 0
elif mode == 'gates':
    env = dict(os.environ)
    env['PATH'] = str(R / 'lab/verify/P3M/bin') + os.pathsep + env['PATH']
    ev = ['node', '--test', 'lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs']
    assert command('evaluator', ev, env=env) == 0
    env['TRIPLEX_PACK_ARTIFACT_ROOT'] = str(E / 'pack')
    env['npm_config_cache'] = str(E / 'npm-cache')
    assert command('pack', ['node', 'lab/bin/check-packages.mjs'], env=env) == 0
    for lane in ['xtdb', 'datomic', 'qlever']:
        assert command('G0-' + lane, ['node', 'lab/bin/gate.mjs', 'G0', '--lane', lane,
            '--exp', 'CX-VA01-040', '--note', 'Independent contract 0.4.0 committed-head offline review'], env=env) == 0
elif mode == 'g0-after-explicit-w0-build':
    env = dict(os.environ)
    env['PATH'] = str(R / 'lab/verify/P3M/bin') + os.pathsep + env['PATH']
    assert command('explicit-w0-build-attempt2', ['pnpm', '--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store',
        '--filter', '@triplex-build/w0', 'build'], env=env) == 0
    w0 = {str(p.relative_to(R)): sha(p.read_bytes()) for p in (R / 'packages/w0/dist').rglob('*') if p.is_file()}
    assert w0
    put('explicit-w0-dist.json', {'head': git('rev-parse', 'HEAD').decode().strip(), 'files': w0})
    for p in w0:
        target = E / 'explicit-w0-dist' / p
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(R / p, target)
    for lane in ['xtdb', 'datomic', 'qlever']:
        assert command('G0-' + lane + '-after-w0-build', ['node', 'lab/bin/gate.mjs', 'G0', '--lane', lane,
            '--exp', 'CX-VA01-040', '--note', 'Independent 0.4.0 review; explicit prior W0 build; first XTDB attempt retained'], env=env) == 0
        assert w0 == {str(p.relative_to(R)): sha(p.read_bytes()) for p in (R / 'packages/w0/dist').rglob('*') if p.is_file()}
elif mode == 'merged-evaluator':
    assert command(mode, ['node', '--test', 'lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs']) == 0
elif mode == 'merged-verify':
    # Preserve the actual exit in its record; a failed diagnostic is a finding, never a PASS.
    command(mode, ['python3', '-I', '-B', str(G), '--verify'])
else: raise ValueError(mode)

"""[CX-VA01-040-R2] Why: independently bind the fixes to actual bytes and fresh gates.
Rejected: adopting builder exits or editing acceptance/ to run negative controls.
"""
import ast
import datetime as dt
import hashlib
import io
import json
import os
from pathlib import Path
import re
import runpy
import shutil
import subprocess as sp
import sys
import tarfile
import time

R = Path(__file__).resolve().parents[4]
E = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040/r2')
E.mkdir(parents=True, exist_ok=True)
G = R / 'lab/acceptance/build_contract.py'
sha = lambda b: hashlib.sha256(b).hexdigest()
now = lambda: dt.datetime.now(dt.timezone.utc).isoformat()
def git(*args): return sp.check_output(['git', *args], cwd=R)
def put(name, obj): (E / name).write_text(json.dumps(obj, indent=2) + '\n')
def inputs():
    doc = json.loads((G.parent / 'obligations.json').read_text())
    paths = set(doc['inputs']) | {'lab/acceptance/' + p for p in ['obligations.json', 'oracle-contract.json', 'load-contract.json', 'budgets.json', 'ACCEPTANCE.md', 'capability-matrix.md']}
    paths |= {'lab/bin/gate.mjs', 'pnpm-lock.yaml', 'lab/experiments/EXP-A01-acceptance-contract/regressions/test040.py', 'lab/experiments/EXP-A01-acceptance-contract/regressions/negtest040.py'}
    return {p: sha((R / p).read_bytes()) for p in sorted(paths)}
def command(label, argv):
    assert shutil.disk_usage(R).free >= 5 * 1024**3
    assert not git('diff', 'HEAD', '--')
    before, head, start = inputs(), git('rev-parse', 'HEAD').decode().strip(), now()
    tool = Path(__file__).read_bytes()
    saved = E / 'tools' / (sha(tool) + '.py')
    saved.parent.mkdir(exist_ok=True)
    saved.write_bytes(tool)
    cmd = ['node', 'lab/bin/heavy.mjs', '--label', 'CX-VA01-040-r2-' + label, '--poll-ms', '100', '--',
           'python3', '-I', '-B', str(Path(__file__).resolve()), '_admitted', *argv]
    env = dict(os.environ)
    env['PATH'] = str(R / 'lab/verify/P3M/bin') + os.pathsep + env['PATH']
    grant = None
    with (E / (label + '.log')).open('x') as out:
        p = sp.Popen(cmd, cwd=R, env=env, stdout=out, stderr=sp.STDOUT)
        while p.poll() is None and grant is None:
            for f in Path('/Users/sam/projects/triplex-db-2/lab/locks/heavy').glob('*/owner.json'):
                try: raw = f.read_bytes(); d = json.loads(raw)
                except (FileNotFoundError, ValueError): continue
                if d.get('pid') == p.pid:
                    grant = {'slot': f.parent.name, 'sha256': sha(raw), 'owner': d}
                    (E / (label + '-heavy-owner.json')).write_bytes(raw)
            if grant is None: time.sleep(.05)
        code = p.wait()
    record = {'head': head, 'candidate': git('rev-parse', '35cb04b5').decode().strip(), 'startedAt': start,
        'endedAt': now(), 'command': cmd, 'exitCode': code, 'heavy': grant, 'toolSha256': sha(tool),
        'logSha256': sha((E / (label + '.log')).read_bytes()), 'inputs': before,
        'inputsUnchanged': before == inputs(), 'trackedDiffEmpty': not git('diff', 'HEAD', '--')}
    put(label + '.json', record)
    print(label, code, record['inputsUnchanged'], flush=True)
    assert record['inputsUnchanged'] and record['trackedDiffEmpty']
    return code

def mutations():
    source = G.read_text().replace('HERE = pathlib.Path(__file__).resolve().parent', 'HERE = pathlib.Path(' + repr(str(G.parent)) + ')')
    stale = 'Q45a: O-CONTRACT runner pin is stale'
    stage = 'Q45a: O-CONTRACT projection pin, diff or per-hunk workload note drift'
    cases = [
        ('late-image', 'IMAGE_PINS["datomic"]["imageId"] = "sha256:" + "1" * 64', stale),
        ('late-projection-field', 'LOG_FIELDS["lateField"] = "str"', stale),
        ('wrong-projection-hash', 'ORACLE_RUNNERS["O-CONTRACT"]["sha256"]["lab/acceptance/oracle-contract.json"] = "0" * 64', stale),
        ('wrong-source-hash', 'ORACLE_RUNNERS["O-CONTRACT"]["sha256"]["lab/acceptance/build_contract.py"] = "0" * 64', stale),
        ('missing-runner-map', 'ORACLE_RUNNERS["O-CONTRACT"].pop("sha256")', stale),
        ('wrong-stage-hash', 'PIN_STAGE_OCONTRACT[0]["sha256"] = "0" * 64', stage),
        ('workload-note-flipped', 'PIN_STAGE_OCONTRACT[0]["hunks"][0]["changesMeasuredWorkload"] = True', stage)]
    temp = R / 'lab/verify/A01/r2/mutant.tmp.py'
    before = inputs()
    results = []
    try:
        temp.write_text(source)
        p = sp.run([sys.executable, '-I', '-B', str(temp), '--verify'], capture_output=True, text=True)
        assert p.returncode == 0 and 'second regeneration byte-identical' in p.stdout, p.stdout + p.stderr
        for name, code, reason in cases:
            temp.write_text(source.replace('\ndef main():', '\n' + code + '\n\ndef main():'))
            p = sp.run([sys.executable, '-I', '-B', str(temp), '--verify'], capture_output=True, text=True)
            caught = p.returncode != 0 and p.stdout.startswith('CONTRACT INVALID:\n') and reason in p.stdout
            results.append({'name': name, 'expectedReason': reason, 'caught': caught,
                'exitCode': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr, 'sourceSha256': sha(temp.read_bytes())})
            print(name, caught, flush=True)
    finally: temp.unlink(missing_ok=True)
    put('mutation-results.json', results)
    assert len(results) == 7 and all(r['caught'] for r in results) and before == inputs()

def audit():
    C = runpy.run_path(str(G))
    doc = json.loads((G.parent / 'obligations.json').read_text())
    base = json.loads(git('show', 'd4227396:lab/acceptance/obligations.json'))
    expected = {'Q98' + c for c in 'abcdefghi'} | {'Q101a', 'Q104a'}
    assert {r['id'] for r in doc['rulings']} - {r['id'] for r in base['rulings']} == expected
    main_pending = git('show', '1c2ee46f:lab/acceptance/RULINGS-PENDING.md').decode()
    after = (G.parent / 'RULINGS-PENDING.md').read_text().splitlines()
    held = [line for line in main_pending.splitlines() if (m := re.match(r'^\| (Q\d+[a-z]?)\b', line)) and m[1] not in expected]
    assert len(held) == 100 and all(line in after for line in held)
    assert not expected.intersection(doc['pendingRulings']['ids'])
    assert doc['pendingRulings']['ids'] == C['pending_ruling_ids']()
    old_projection = json.loads(git('show', 'f3ed6211^1:lab/acceptance/oracle-contract.json'))
    new_projection = json.loads((G.parent / 'oracle-contract.json').read_text())
    def differences(a, b, trail=()):
        if isinstance(a, dict) and isinstance(b, dict):
            return sum((differences(a.get(k), b.get(k), trail + (k,)) for k in a.keys() | b.keys()), [])
        return [] if a == b else [trail]
    assert differences(old_projection, new_projection) == [('imagePins', 'datomic', 'imageId')]
    assert C['checks_pin_OCONTRACT']() == []
    for path, digest in doc['oracleRunners']['O-CONTRACT']['sha256'].items(): assert sha((R / path).read_bytes()) == digest
    tree = ast.parse(G.read_text())
    pin_line = next(n.lineno for n in tree.body if isinstance(n, ast.If) and 'o_contract_runner_hashes()' in ast.get_source_segment(G.read_text(), n))
    later = [{'line': n.lineno, 'type': type(n).__name__} for n in tree.body if n.lineno > pin_line and isinstance(n, (ast.Assign, ast.AugAssign, ast.AnnAssign))]
    put('static-audit.json', {'head': git('rev-parse', 'HEAD').decode().strip(), 'compiledExactly': sorted(expected),
        'mainPendingRowsPreserved': len(held), 'pendingUniqueIds': len(doc['pendingRulings']['ids']),
        'projectionChangedPaths': differences(old_projection, new_projection), 'runnerPinAssignmentLine': pin_line,
        'laterModuleAssignments': later, 'sourceInputs': inputs()})
    resolved = {}
    def bad(ref):
        if ref not in resolved:
            try: rev = git('rev-parse', '--verify', ref + '^{commit}').decode().strip()
            except sp.CalledProcessError: resolved[ref] = False; return False
            ancestor = lambda a, b: sp.call(['git', 'merge-base', '--is-ancestor', a, b], cwd=R) == 0
            resolved[ref] = ancestor('f3ed6211', rev) and not ancestor('a853fe42', rev)
        return resolved[ref]
    semantic_refs = []
    def walk(v, trail=()):
        if isinstance(v, dict):
            for k, x in v.items(): walk(x, trail + (k,))
        elif isinstance(v, list):
            for i, x in enumerate(v): walk(x, trail + (i,))
        elif isinstance(v, str) and re.fullmatch('[0-9a-f]{40}', v) and any('commit' in str(k).lower() or 'head' in str(k).lower() for k in trail):
            semantic_refs.append({'trail': trail, 'commit': v, 'inDefectiveInterval': bad(v)})
    walk(doc)
    archive = git('archive', '35cb04b5', 'lab/runs', 'lab/experiments/EXP-A01-acceptance-contract/evidence-0.4.0')
    receipts = []
    with tarfile.open(fileobj=io.BytesIO(archive)) as t:
        for entry in t:
            if not entry.isfile() or not entry.name.endswith('.json'): continue
            raw = t.extractfile(entry).read()
            try: d = json.loads(raw)
            except (ValueError, UnicodeDecodeError): continue
            if not isinstance(d, dict) or d.get('format') != 'tx2-gate-receipt/1': continue
            head = d.get('git', {}).get('head')
            if not head or not bad(head): continue
            needles = {entry.name, d.get('runId'), sha(raw)} - {None}
            references = [k for k, v in doc['inputs'].items() if k in needles or v in needles]
            serialized = json.dumps(doc)
            textual = [v for v in needles if v in serialized]
            receipts.append({'path': entry.name, 'head': head, 'runId': d.get('runId'), 'verdict': d.get('verdict'),
                'directInputReferences': references, 'contractTextReferences': textual, 'sha256': sha(raw)})
    metadata = []
    timeline = git('rev-list', '--first-parent', '--reverse', 'd4227396..35cb04b5').decode().splitlines()
    for path in doc['inputs']:
        if 'evidence-0.4.0/' not in path: continue
        # [CX-VA01-040-R2] Why: rename/merge simplification can hide additions in git log -A.
        # Rejected: treating an empty history as proof that an input was never introduced.
        introduced = next(rev for rev in timeline if sp.call(['git', 'cat-file', '-e', rev + ':' + path], cwd=R, stdout=sp.DEVNULL, stderr=sp.DEVNULL) == 0)
        metadata.append({'path': path, 'introducedAt': introduced, 'inDefectiveInterval': bad(introduced)})
    findings = [r for r in semantic_refs if r['inDefectiveInterval']]
    reliance = [r for r in receipts if r['directInputReferences'] or r['contractTextReferences']]
    put('history-audit.json', {'head': git('rev-parse', 'HEAD').decode().strip(), 'fixCommit': 'a853fe42',
        'historicalGateReceipts': receipts, 'semanticCommitReferences': semantic_refs,
        'badSemanticReferences': findings, 'reusedDefectiveReceipts': reliance,
        'evidenceInputsAuthoredInInterval': [m for m in metadata if m['inDefectiveInterval']],
        'qualificationBlockers': doc['qualificationRun']['blockers'], 'buildSpecArgv': doc['buildSpec']['argv']})
    assert not findings and not reliance

mode = sys.argv[1]
if mode == '_admitted':
    free = shutil.disk_usage(R).free
    assert free >= 5 * 1024**3, free
    print(json.dumps({'admittedHostFreeBytes': free, 'at': now()}), flush=True)
    os.execvpe(sys.argv[2], sys.argv[2:], os.environ)
elif mode == 'mutations': mutations()
elif mode == 'audit': audit()
elif mode == 'audit-retry':
    assert command('audit-attempt2', ['python3', '-I', '-B', str(Path(__file__).resolve()), 'audit']) == 0
elif mode == 'required':
    assert command('verify', ['python3', '-I', '-B', str(G), '--verify']) == 0
    assert command('evaluator', ['node', '--test', 'lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs']) == 0
elif mode == 'focused':
    assert command('tests', ['python3', '-I', '-B', 'lab/experiments/EXP-A01-acceptance-contract/regressions/test040.py']) == 0
    assert command('mutations', ['python3', '-I', '-B', str(Path(__file__).resolve()), 'mutations']) == 0
    assert command('audit', ['python3', '-I', '-B', str(Path(__file__).resolve()), 'audit']) == 0
elif mode == 'fresh-g0':
    dist = R / 'packages/w0/dist'
    backup = R / 'runs/verify/CX-VA01-040-r2/w0-before'
    assert not backup.exists()
    backup.parent.mkdir(parents=True, exist_ok=True)
    if dist.exists(): dist.rename(backup)
    dist.mkdir()
    put('w0-empty-before.json', {'head': git('rev-parse', 'HEAD').decode().strip(), 'at': now(), 'files': list(dist.iterdir()), 'priorOutputsRetainedAt': str(backup)})
    assert command('fresh-g0', ['node', 'lab/bin/gate.mjs', 'G0', '--lane', 'xtdb', '--exp', 'CX-VA01-040-R2', '--note', 'Independent F2 reproduction: empty W0 dist; no manual W0 build']) == 0
else: raise ValueError(mode)

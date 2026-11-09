# [EXP-GS12F-R5] Why: compare actual merged bytes and direct pins with frozen current main. Rejected: inherited equality claims from the older branch base.
import hashlib, json, pathlib, subprocess, sys, time

def git(*args):
    return subprocess.check_output(['git', *args])

def sha(data):
    return hashlib.sha256(data).hexdigest()

main = git('rev-parse', 'main').decode().strip()
assert main == 'e4850f801b8a7771a94e1b3394ecc5ddf24efb5f', 'main moved; sync again'
assert not git('diff', main, '--', 'lab/acceptance'), 'acceptance differs from main'
paths = git('ls-files', 'packages', 'test/integration', 'vitest.workspace-aliases.ts', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'package.json', 'lab/bin/heavy.mjs', 'lab/experiments/EXP-GS12F/round4').decode().splitlines()
paths += ['lab/experiments/EXP-GS12F/round5/audit.py', 'lab/experiments/EXP-GS12F/round5/run.sh']
paths = sorted(set(p for p in paths if '/evidence/' not in p and pathlib.Path(p).is_file()))
rows = [{'path': p, 'sha256': sha(pathlib.Path(p).read_bytes())} for p in paths]
changed = set(git('diff', '--name-only', main).decode().splitlines())
pins = {}

def visit(node):
    if isinstance(node, dict):
        pairs = [(node.get('path'), v) for v in node.values() if isinstance(v, str) and len(v) == 64]
        pairs += list(node.items())
        for p, h in pairs:
            if isinstance(p, str) and p in changed and isinstance(h, str) and len(h) == 64 and all(c in '0123456789abcdef' for c in h) and pathlib.Path(p).is_file():
                before = sha(git('show', main + ':' + p))
                after = sha(pathlib.Path(p).read_bytes())
                if before != after:
                    pins[p] = {'path': p, 'mainSha256': before, 'candidateSha256': after, 'publishedSha256': h}
        for value in node.values():
            visit(value)
    elif isinstance(node, list):
        for value in node:
            visit(value)

visit(json.loads(pathlib.Path('lab/acceptance/obligations.json').read_text()))
result = {'timeUnix': time.time(), 'main': main, 'preMergeHead': git('rev-parse', 'HEAD').decode().strip(), 'mergeHead': git('rev-parse', 'MERGE_HEAD').decode().strip(), 'acceptanceEqualsMain': True, 'sourceFiles': rows, 'changedDirectPinsAgainstMain': list(pins.values()), 'physicalSlot': None, 'offlineOnly': True}
output = pathlib.Path(sys.argv[1])
if len(sys.argv) > 2:
    start = json.loads(pathlib.Path(sys.argv[2]).read_text())
    assert start['sourceFiles'] == rows, 'execution source drift'
    result['sourceStable'] = True
output.write_text(json.dumps(result, indent=2) + '\n')

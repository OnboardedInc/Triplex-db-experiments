"""CX-VA01-040: committed Q87 merge; refresh projections without fixing reviewed code.

Why: current main adds pending rows and generated metadata at the older contract version.
Rejected: dropping those pending rows, accepting conflict markers, or fixing the findings.
"""
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess as sp
import sys

R = Path(__file__).resolve().parents[3]
E = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040')
sha = lambda b: hashlib.sha256(b).hexdigest()
def git(*args): return sp.check_output(['git', *args], cwd=R).decode().strip()
assert shutil.disk_usage(R).free >= 5 * 1024**3
assert git('branch', '--show-current') == 'verify/A01-040'
before = git('rev-parse', 'HEAD')
assert before == '4fa6192cf3b90ecc0f6f75ca018914d9590dd1eb'
assert not git('diff', 'HEAD', '--')
main = git('rev-parse', 'main')
started = dt.datetime.now(dt.timezone.utc).isoformat()
p = sp.run(['git', 'merge', '--no-commit', '--no-ff', main], cwd=R, text=True, capture_output=True)
(E / 'merge-command.log').write_text(p.stdout + p.stderr)
conflicts = git('diff', '--name-only', '--diff-filter=U').splitlines()
allowed = {'lab/acceptance/ACCEPTANCE.md', 'lab/acceptance/obligations.json'}
assert set(conflicts) <= allowed, conflicts
assert p.returncode == 0 or conflicts, p.stdout + p.stderr
for file in conflicts:
    sp.check_call(['git', 'checkout', '--ours', '--', file], cwd=R)
# [CX-VA01-040] Why: regenerate merge-conflicted outputs from the unchanged 0.4.0 generator.
# Rejected: applying a pin or G0 implementation repair in an independent review branch.
with (E / 'merge-regeneration.log').open('x') as out:
    sp.check_call([sys.executable, '-I', '-B', 'lab/acceptance/build_contract.py'], cwd=R, stdout=out, stderr=sp.STDOUT)
expected = {'Q98' + c for c in 'abcdefghi'} | {'Q101a', 'Q104a'}
main_pending = sp.check_output(['git', 'show', main + ':lab/acceptance/RULINGS-PENDING.md'], cwd=R).decode()
pending = (R / 'lab/acceptance/RULINGS-PENDING.md').read_text().splitlines()
held = []
for line in main_pending.splitlines():
    m = re.match(r'^\| (Q\d+[a-z]?)\b', line)
    if m and m[1] not in expected:
        assert line in pending, line
        held.append(line)
assert not git('diff', before, '--', 'lab/acceptance/build_contract.py', 'lab/bin/gate.mjs',
               'packages/host/src/feed/ConsumerStore.ts', 'packages/datomic/gateway/src/triplex/gateway/feed.clj',
               'packages/qlever/src/QleverClient.ts')
generated = ['lab/acceptance/' + p for p in ['ACCEPTANCE.md', 'obligations.json', 'oracle-contract.json',
             'load-contract.json', 'budgets.json', 'capability-matrix.md']]
tools = ['lab/verify/A01/' + p for p in ['review040.py', 'oracle-pin040.py', 'retain040.py', 'merge040.py']]
sp.check_call(['git', 'add', '--', *generated, *tools], cwd=R)
with (E / 'merge-commit.log').open('x') as out:
    sp.check_call(['git', '-c', 'commit.gpgsign=false', 'commit', '-m',
        'review(A01): merge current main for committed Q87 verification', '-m',
        'Refresh generated pending-row projections only; leave the stale oracle pin and G0 W0 dependency unchanged.', '-m',
        'Co-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>'], cwd=R, stdout=out, stderr=sp.STDOUT)
merged = git('rev-parse', 'HEAD')
changes = []
for file in git('diff', '--name-only', before, merged, '--', 'lab/acceptance').splitlines():
    a = sp.check_output(['git', 'show', before + ':' + file], cwd=R)
    b = (R / file).read_bytes()
    changes.append({'path': file, 'oldSha256': sha(a), 'newSha256': sha(b)})
record = {'startedAt': started, 'endedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
          'reviewedHead': before, 'main': main, 'mergedHead': merged, 'conflicts': conflicts,
          'generatedOutputsRefreshed': True, 'reviewedImplementationUnchanged': True,
          'mainPendingRowsPreserved': len(held), 'contractMetadataChanges': changes}
(E / 'merge.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record, indent=2))

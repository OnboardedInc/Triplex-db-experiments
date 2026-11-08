import hashlib
import json
from pathlib import Path
import shutil
import subprocess
from datetime import datetime, timezone

# [CX-VC8] Why: identify reviewed source and external instructions without altering main. Rejected: claiming current main is the reviewed revision.
root = Path.cwd()
main = Path('/Users/sam/projects/triplex-db-2')
out = root / 'lab/verify/C8'
inputs = out / 'inputs'
inputs.mkdir(exist_ok=True)
documents = [
    'CLAUDE.md', 'lab/SCOPE.md', 'lab/NORTH-STAR.md', 'lab/TARGETS.md', 'lab/PROTOCOL.md',
    'lab/verify/C8/BRIEF.md', 'lab/agents/handoffs/V-C8.md',
    'lab/experiments/EXP-C8-read-only-frontier/REPORT.md',
    'lab/experiments/EXP-C8-read-only-frontier/BRIEF.md', 'lab/research/R10-read-only-recursion.md',
]
records = []
for name in documents:
    source = main / name
    target = inputs / name.replace('/', '__')
    shutil.copyfile(source, target)
    data = target.read_bytes()
    records.append({'source': str(source), 'copy': str(target.relative_to(root)), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
commits = ['620145c', 'd508c28', '0147c88', '6727da4', 'd9b2dc8']
files = set()
for commit in commits:
    files.update(subprocess.check_output(['git', 'diff-tree', '--no-commit-id', '--name-only', '-r', commit], text=True).splitlines())
files.update(['pnpm-lock.yaml', 'vitest.workspace-aliases.ts'])
sources = []
for name in sorted(files):
    if not (name.startswith('packages/') or name.startswith('lab/bin/') or name in ['pnpm-lock.yaml', 'vitest.workspace-aliases.ts']):
        continue
    p = root / name
    if not p.is_file():
        sources.append({'path': name, 'deleted': True})
        continue
    data = p.read_bytes()
    original = subprocess.check_output(['git', 'show', f'd9b2dc8:{name}'])
    sources.append({'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'matchesReviewedHead': data == original})
manifest = {
    'capturedAt': datetime.now(timezone.utc).isoformat(),
    'reviewedHead': subprocess.check_output(['git', 'rev-parse', 'd9b2dc8'], text=True).strip(),
    'scope': 'git diff bf1ad4d d9b2dc8; C8 commit attribution excludes unrelated merged lab/entity work',
    'branch': subprocess.check_output(['git', 'branch', '--show-current'], text=True).strip(),
    'node': subprocess.check_output(['node', '--version'], text=True).strip(),
    'documents': records, 'sourceFiles': sources,
}
(out / 'input-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'documents': len(records), 'sources': len(sources), 'allReviewedSourceUnchanged': all(s.get('matchesReviewedHead', True) for s in sources)}))

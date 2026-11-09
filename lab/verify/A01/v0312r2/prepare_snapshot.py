"""Build the precise candidate plus current-main review tree without modifying either branch."""
import json
from pathlib import Path
import shutil
import subprocess
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
TARGET = '4eb352b8a1dbc42c9696a61688e55e4698fa63c5'
MAIN = '28a27d48fd9cebab3ae530afdf7e5296d943bf67'
def git(*args, cwd=ROOT):
    return subprocess.check_output(['git', *args], cwd=cwd, text=True).strip()
def main():
    # [CX-VA01-0312] Why: evaluator integrity binds HEAD bytes, so test an actual merge. Rejected: an archive that inherits the verifier branch's Git identity.
    free = shutil.disk_usage(ROOT).free
    assert free >= 5 * 1024**3
    scratch = HERE / 'scratch'
    subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(ROOT), str(scratch)], check=True)
    git('checkout', '-b', 'review-0312', TARGET, cwd=scratch)
    git('-c', 'user.name=Contract Reviewer', '-c', 'user.email=noreply@openai.com', 'merge', '--no-ff', MAIN,
        '-m', 'Review candidate with pinned current main\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>', cwd=scratch)
    changed = git('diff', '--name-only', TARGET, 'HEAD', cwd=scratch).splitlines()
    assert set(changed) <= {'lab/NOTEBOOK.md', 'lab/agents/CODEX-PREAMBLE.md'}, changed
    (HERE / 'source.json').write_text(json.dumps({'candidate': TARGET, 'main': MAIN,
        'merge': git('rev-parse', 'HEAD', cwd=scratch), 'mergeParents': git('show', '-s', '--format=%P', cwd=scratch),
        'changedFromCandidate': changed, 'freeDiskBeforeBytes': free,
        'reviewerHead': git('rev-parse', 'HEAD'), 'network': False}, indent=2) + '\n')
if __name__ == '__main__': main()

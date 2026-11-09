"""Build the precise candidate plus current-main review tree without modifying either branch."""
import json
from pathlib import Path
import shutil
import subprocess
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
TARGET = 'f5e7a413e17948738472d3465bcfdda3b72b2e41'
MAIN = '28c61c72b52255bd98c31ec7ccd372e1fcc4ab96'
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
    assert set(changed) <= {'lab/NOTEBOOK.md', 'lab/STATE.md'}, changed
    (HERE / 'source.json').write_text(json.dumps({'candidate': TARGET, 'main': MAIN,
        'merge': git('rev-parse', 'HEAD', cwd=scratch), 'mergeParents': git('show', '-s', '--format=%P', cwd=scratch),
        'changedFromCandidate': changed, 'freeDiskBeforeBytes': free,
        'reviewerHead': git('rev-parse', 'HEAD'), 'network': False}, indent=2) + '\n')
if __name__ == '__main__': main()

"""Create a local, source-bound clone so evaluator Git-integrity checks use the reviewed commit."""
import json
from pathlib import Path
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
REV = 'b3af3751'


def main():
    # [CX-VA01-R3] Why: evaluator tests compare source files to Git blobs; use a real detached clone of the target. Rejected: a lab-only archive inheriting the verifier's unrelated HEAD.
    free = shutil.disk_usage(ROOT).free
    if free < 5 * 1024**3:
        raise SystemExit('less than 5 GiB free')
    rev = subprocess.check_output(['git', 'rev-parse', REV], cwd=ROOT, text=True).strip()
    scratch = HERE / 'scratch'
    subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(ROOT), str(scratch)], check=True)
    subprocess.run(['git', '-C', str(scratch), 'checkout', '--detach', rev], check=True)
    (HERE / 'source.json').write_text(json.dumps({'reviewedCommit': rev, 'baseline': '3b46c8a07ff3c6285252736cc10e04267f7dbe1d',
        'reviewerHeadBeforeReview': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'freeDiskBeforeSnapshot': free, 'clone': 'local shared clone; source checkout unmodified; no network'}, indent=2) + '\n')
    print(scratch)


if __name__ == '__main__':
    main()

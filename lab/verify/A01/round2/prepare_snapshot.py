"""Recreate the disposable reviewed tree for the retained delta tests."""
import io
import json
from pathlib import Path
import subprocess
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
REV = '3b46c8a07ff3c6285252736cc10e04267f7dbe1d'


def paths(value):
    if isinstance(value, dict):
        if isinstance(value.get('path'), str):
            yield value['path']
        for child in value.values():
            yield from paths(child)
    elif isinstance(value, list):
        for child in value:
            yield from paths(child)


def main():
    # [CX-VA01-R2] Why: suites rewrite pending/generated files; isolate those writes from both worktrees. Rejected: running mutations against the builder's live checkout.
    scratch = HERE / 'scratch'
    scratch.mkdir(exist_ok=False)
    raw = subprocess.check_output(['git', 'archive', REV, 'lab'], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(raw)) as source:
        source.extractall(scratch, filter='data')
    doc = json.loads((scratch / 'lab/acceptance/obligations.json').read_text())
    for path in set(paths(doc)):
        if not (scratch / path).exists() and not Path(path).is_absolute() and '..' not in Path(path).parts:
            proc = subprocess.run(['git', 'show', f'{REV}:{path}'], cwd=ROOT, capture_output=True)
            if proc.returncode == 0:
                (scratch / path).parent.mkdir(parents=True, exist_ok=True)
                (scratch / path).write_bytes(proc.stdout)
    print(scratch)


if __name__ == '__main__':
    main()

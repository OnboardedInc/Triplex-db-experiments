"""Reproduce the supplied suites on an isolated, source-bound copy.

Run through lab/bin/heavy.mjs. This script writes only beneath its own directory.
"""
import io
import json
import pathlib
import subprocess
import sys
import tarfile
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[3]
HERE = pathlib.Path(__file__).resolve().parent
REV = '36d74348df2dd224ec15e29856a04a4e8daa4a30'


def blob(path):
    return subprocess.check_output(['git', 'show', f'{REV}:{path}'], cwd=ROOT)


def paths_in(value):
    if isinstance(value, dict):
        if isinstance(value.get('path'), str):
            yield value['path']
        for child in value.values():
            yield from paths_in(child)
    elif isinstance(value, list):
        for child in value:
            yield from paths_in(child)


def main():
    if __import__('shutil').disk_usage(ROOT).free < 5 * 1024**3:
        raise SystemExit('host disk free below 5 GiB')
    archive = subprocess.check_output(['git', 'archive', REV, 'lab'], cwd=ROOT)
    with tempfile.TemporaryDirectory(dir=HERE, prefix='suite-copy-') as folder:
        scratch = pathlib.Path(folder)
        with tarfile.open(fileobj=io.BytesIO(archive)) as source:
            source.extractall(scratch, filter='data')
        doc = json.loads((scratch / 'lab/acceptance/obligations.json').read_text())
        for path in set(paths_in(doc)):
            target = scratch / path
            if not target.exists() and not pathlib.PurePosixPath(path).is_absolute() and '..' not in pathlib.PurePosixPath(path).parts:
                proc = subprocess.run(['git', 'show', f'{REV}:{path}'], cwd=ROOT, capture_output=True)
                if proc.returncode == 0:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(proc.stdout)
        commands = [
            ('rerun-scratch-verify.txt', 'lab/acceptance/build_contract.py', '--verify'),
            ('rerun-negtest0311.txt', 'lab/experiments/EXP-A01-acceptance-contract/regressions/negtest0311.py'),
            ('rerun-q47d_test0311.txt', 'lab/experiments/EXP-A01-acceptance-contract/regressions/q47d_test0311.py'),
        ]
        status = []
        for log, script, *args in commands:
            cmd = [sys.executable, '-u', '-I', '-B', str(scratch / script), *args]
            with (HERE / log).open('w') as out:
                proc = subprocess.run(cmd, cwd=scratch, stdout=out, stderr=subprocess.STDOUT)
            status.append({'script': script, 'exit': proc.returncode, 'log': log})
            print(status[-1], flush=True)
            if proc.returncode:
                break
        (HERE / 'rerun-suite-status.json').write_text(json.dumps({'revision': REV, 'results': status}, indent=2) + '\n')
    return int(any(s['exit'] for s in status))


if __name__ == '__main__':
    raise SystemExit(main())

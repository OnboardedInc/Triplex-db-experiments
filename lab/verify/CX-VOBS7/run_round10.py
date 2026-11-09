#!/usr/bin/env python3
"""Fresh offline review receipt, including the exact requested suites and prior fixtures."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = HERE / 'round10'
PATHS = ['lab/observer/vm_normalizer.py', 'lab/observer/vm_syncwitness.py', 'lab/observer/vm_syncwitness.bt',
    'lab/observer/vm_fixture.py', 'lab/observer/vm_planted_writer.py', 'lab/observer/test_vm.py',
    'lab/observer/test_syncwitness.py', 'lab/observer/test_round10.py', 'lab/observer/test_engine.mjs',
    'lab/observer/vm_clockcheck.py', 'lab/observer/vm_clockprobe.bt', 'lab/observer/bpftrace-image/Dockerfile',
    'lab/bin/sync-witness.mjs', 'lab/verify/CX-VOBS7/review_round9.py',
    'lab/verify/CX-VOBS7/review_round10.py', 'lab/verify/CX-VOBS7/run_round10.py']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    free = shutil.disk_usage(ROOT).free
    if free < 5 * 1024**3:
        raise RuntimeError('disk below 5 GiB')
    OUT.mkdir(exist_ok=False)
    pins = {p: sha((ROOT / p).read_bytes()) for p in PATHS}
    record = {'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'sourceSha256': pins, 'startedNs': time.time_ns(), 'hostFreeBytes': free, 'commands': [],
        'claim': 'offline review only; regression failures are retained; no engine slot or VM claim'}
    for name in ('R48-writer-sync-witness.md', 'R49-bpftrace-source.md'):
        raw = (Path('/Users/sam/projects/triplex-db-2/lab/research') / name).read_bytes()
        (OUT / name).write_bytes(raw)
    commands = [('python-vm', ['python3', '-B', 'lab/observer/test_vm.py']),
        ('python-syncwitness', ['python3', '-B', 'lab/observer/test_syncwitness.py']),
        ('python-round10', ['python3', '-B', 'lab/observer/test_round10.py']),
        ('node-engine', ['node', '--test', 'lab/observer/test_engine.mjs']),
        ('review-round9', ['python3', '-B', '-c',
            'import sys,unittest;from pathlib import Path;sys.path.insert(0,"lab/verify/CX-VOBS7");import review_round9 as r;r.OUT=Path("lab/verify/CX-VOBS7/round10/prior-fixtures");unittest.main(module=r,verbosity=2)']),
        ('review-round10', ['python3', '-B', 'lab/verify/CX-VOBS7/review_round10.py'])]
    for name, argv in commands:
        result = subprocess.run(argv, cwd=ROOT, capture_output=True, timeout=300, env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
        (OUT / (name + '.stdout')).write_bytes(result.stdout)
        (OUT / (name + '.stderr')).write_bytes(result.stderr)
        record['commands'].append({'name': name, 'argv': argv, 'exit': result.returncode,
            'stdoutSha256': sha(result.stdout), 'stderrSha256': sha(result.stderr)})
        print(name, result.returncode, flush=True)
    # [CX-VOBS7-R10] Why: concurrent lab work must not change the bytes these results claim. Rejected: branch-name-only binding.
    record['sourceUnchanged'] = all(sha((ROOT / p).read_bytes()) == digest for p, digest in pins.items())
    record['finishedNs'] = time.time_ns()
    (OUT / 'RUN.json').write_text(json.dumps(record, sort_keys=True, indent=2) + '\n')
    (OUT / 'SHA256SUMS').write_text(''.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(OUT)) + '\n'
        for p in sorted(OUT.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS'))
    if not record['sourceUnchanged']:
        raise RuntimeError('source drift')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Run only host/offline unit fixtures, with immutable-attempt evidence and source drift checks."""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = HERE / 'results'
DESIGN = Path('/Users/sam/projects/triplex-db-2/lab/research/R48-writer-sync-witness.md')
PATHS = ['lab/observer/vm_normalizer.py', 'lab/observer/vm_syncwitness.py', 'lab/observer/vm_syncwitness.bt',
         'lab/observer/vm_fixture.py', 'lab/observer/vm_planted_writer.py', 'lab/observer/test_vm.py',
         'lab/observer/test_syncwitness.py', 'lab/observer/vm_watch.py', 'lab/bin/sync-witness.mjs',
         'lab/verify/CX-VOBS7/review_round9.py', 'lab/verify/CX-VOBS7/run_review.py']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    if shutil.disk_usage(ROOT).free < 5 * 1024**3:
        raise RuntimeError('disk below 5 GiB')
    OUT.mkdir(exist_ok=False)
    pins = {p: sha((ROOT / p).read_bytes()) for p in PATHS}
    record = {'startedNs': time.time_ns(), 'sourceSha256': pins, 'designSha256': sha(DESIGN.read_bytes()),
              'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'claim': 'host offline unit review only; regression failures demonstrate findings; no VM or semantic acceptance'}
    (OUT / 'R48-writer-sync-witness.md').write_bytes(DESIGN.read_bytes())
    commands = [('builder-syncwitness', ['python3', '-B', 'lab/observer/test_syncwitness.py']),
                ('builder-vm', ['python3', '-B', 'lab/observer/test_vm.py']),
                ('reviewer', ['python3', '-B', 'lab/verify/CX-VOBS7/review_round9.py'])]
    record['commands'] = []
    for name, argv in commands:
        result = subprocess.run(argv, cwd=ROOT, capture_output=True, timeout=300)
        (OUT / (name + '.stdout')).write_bytes(result.stdout)
        (OUT / (name + '.stderr')).write_bytes(result.stderr)
        record['commands'].append({'name': name, 'argv': argv, 'exit': result.returncode,
            'stdoutSha256': sha(result.stdout), 'stderrSha256': sha(result.stderr)})
        print(name, result.returncode, flush=True)
    # [CX-VOBS7] Why: bind every observation to the actual reviewed bytes and attempt. Rejected: trusting the branch label after concurrent edits.
    record['sourceUnchanged'] = all(sha((ROOT / p).read_bytes()) == digest for p, digest in pins.items())
    record['finishedNs'] = time.time_ns()
    (OUT / 'RUN.json').write_text(json.dumps(record, sort_keys=True, indent=2) + '\n')
    (OUT / 'SHA256SUMS').write_text(''.join(sha(p.read_bytes()) + '  ' + str(p.relative_to(OUT)) + '\n'
        for p in sorted(OUT.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS'))
    if not record['sourceUnchanged']:
        raise RuntimeError('source drift; evidence unqualified')


if __name__ == '__main__':
    main()

"""Run the original mutation harness while retaining every full child diagnostic."""
import json
from pathlib import Path
import subprocess
import sys
HERE = Path(__file__).resolve().parent
ROOT = HERE / 'scratch'
HARNESS = ROOT / 'lab/experiments/EXP-A01-acceptance-contract/regressions/negtest0313.py'
ns = {'__file__': str(HARNESS), '__name__': '__main__'}
records = []
original_run = subprocess.run
def capture(*args, **kwargs):
    r = original_run(*args, **kwargs)
    # [CX-VA01-0312] Why: nonzero alone can hide an unrelated rejection; retain full errors and changed anchors. Rejected: relying on the harness's truncated first diagnostic.
    if any('_negtest_tmp.py' in str(x) for x in args[0]):
        records.append({'name': ns['name'], 'pairs': ns['pairs'], 'exit': r.returncode,
                        'stdout': r.stdout, 'stderr': r.stderr})
    return r
subprocess.run = capture
status = 0
try:
    exec(compile(HARNESS.read_bytes(), str(HARNESS), 'exec'), ns)
except SystemExit as e:
    status = e.code or 0
finally:
    subprocess.run = original_run
    (Path(__import__('json').loads((HERE/'source.json').read_text())['raw']) / 'mutations.json').write_text(json.dumps({'catalog': len(ns.get('tests', {})), 'run': len(records),
        'retired': ns.get('retired'), 'records': records}, indent=2) + '\n')
sys.exit(status)

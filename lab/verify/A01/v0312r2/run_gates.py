"""Execute source-bound gates and retain commands, exit codes and logs."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time
HERE = Path(__file__).resolve().parent
ROOT = HERE / 'scratch'
mode = sys.argv[1]
gates = {
'evaluator': [('evaluator', ['node', '--test', 'lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs'])],
'contract': [
('verify-before', ['python3', '-I', '-B', 'lab/acceptance/build_contract.py', '--verify']),
('contract-tests', ['python3', '-I', '-B', 'lab/experiments/EXP-A01-acceptance-contract/regressions/test0312.py']),
('screening-js', ['node', '--test', 'lab/experiments/EXP-A01-acceptance-contract/regressions/screening0312.test.mjs']),
('reviewer-35', ['python3', '-I', '-B', 'lab/verify/A01/regressions_review0311.py']),
('reviewer-5', ['python3', '-I', '-B', 'lab/verify/A01/regressions_round2.py'])],
'mutations': [('mutations', ['python3', '-I', '-B', str(HERE / 'capture_mutations.py')])],
'final': [('q47d', ['python3', '-I', '-B', 'lab/experiments/EXP-A01-acceptance-contract/regressions/q47d_test0311.py']),
('verify-after', ['python3', '-I', '-B', 'lab/acceptance/build_contract.py', '--verify'])]}
results = []
for label, argv in gates[mode]:
    start = time.time()
    with (HERE / (label + '.log')).open('wb') as out:
        r = subprocess.run(argv, cwd=ROOT, stdout=out, stderr=subprocess.STDOUT)
    results.append({'label': label, 'argv': argv, 'exit': r.returncode, 'seconds': time.time() - start})
    print(label, r.returncode, flush=True)
(HERE / (mode + '-results.json')).write_text(json.dumps(results, indent=2) + '\n')
sys.exit(any(x['exit'] for x in results))

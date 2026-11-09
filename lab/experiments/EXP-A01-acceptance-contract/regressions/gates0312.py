"""Run ancillary builder gates under one lab heavy grant; preserve raw outputs and source stability."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

REPO = Path(__file__).resolve().parents[4]
# [EXP-A01-0312-R2] Why: each round retains separate raw receipts. Rejected: overwriting the previous round's evidence.
EXPERIMENT = REPO / 'lab/experiments/EXP-A01-acceptance-contract'
OUT = EXPERIMENT / (sys.argv[1] if len(sys.argv) > 1 else 'evidence-0.3.12')
if OUT.parent != EXPERIMENT or not OUT.name.startswith('evidence-0.3.12'):
    raise ValueError('evidence output must be a direct experiment child for contract 0.3.12')
OUT.mkdir(exist_ok=True)
TESTS = 'lab/experiments/EXP-A01-acceptance-contract/regressions/'
ORACLE = 'lab/acceptance/oracle/'
COMMANDS = [
    ('contract-tests', [sys.executable, '-I', '-B', TESTS + 'test0312.py']),
    ('screening-js', ['node', '--test', TESTS + 'screening0312.test.mjs']),
    ('reviewer-regressions', [sys.executable, '-I', '-B', 'lab/verify/A01/regressions_review0311.py']),
    ('real-payloads', [sys.executable, '-I', '-B', 'lab/verify/A01/regressions_round2.py']),
] + [(Path(name).stem, [sys.executable, '-I', '-B', ORACLE + name]) for name in
     ('test_observe.py', 'test_cli.py', 'test_round2.py', 'test_round3.py', 'test_round4.py', 'selfcheck.py')]


def hashes():
    files = ['lab/acceptance/build_contract.py', 'lab/acceptance/RULINGS.md', 'lab/acceptance/RULINGS-PENDING.md',
             'lab/acceptance/obligations.json', 'lab/acceptance/ACCEPTANCE.md', 'lab/bin/claim.mjs',
             'lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs']
    return {p: hashlib.sha256((REPO / p).read_bytes()).hexdigest() for p in files}


before = hashes()
records = []
for label, argv in COMMANDS:
    started = time.time()
    with (OUT / (label + '.stdout.txt')).open('wb') as stdout, (OUT / (label + '.stderr.txt')).open('wb') as stderr:
        result = subprocess.run(argv, cwd=REPO, stdout=stdout, stderr=stderr, timeout=240)
    records.append(dict(label=label, argv=argv, exit=result.returncode, started=started, ended=time.time()))
    print(label, result.returncode, flush=True)
after = hashes()
summary = dict(sourceHead=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(),
               sourceBefore=before, sourceAfter=after, sourceStable=before == after,
               hostDiskFreeBytes=shutil.disk_usage(REPO).free, gates=records)
(OUT / 'ancillary-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
sys.exit(0 if before == after and all(x['exit'] == 0 for x in records) else 1)

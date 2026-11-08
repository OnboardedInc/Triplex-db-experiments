"""Sequential builder gates, intended to run under one lab heavy admission."""
import json
import hashlib
import shutil
import time
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
EVIDENCE = HERE.parents[1]/'experiments/EXP-O05-observation-oracle/evidence'
attempt = sys.argv[1]
def pins():
    return {str(p.relative_to(HERE.parents[2])): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(HERE.glob('*.py'))}

before = pins()
started = time.time()
free = shutil.disk_usage(HERE).free
if free < 5 * 1024**3:
    raise SystemExit('host disk free below 5 GiB')
results = []
for filename, args in [('test_observe.py', ['--write-fixtures']), ('test_cli.py', []),
                       ('test_round2.py', []), ('test_round3.py', []), ('replay_review_round2.py', []), ('selfcheck.py', [])]:
    proc = subprocess.run([sys.executable, '-I', '-B', str(HERE/filename), *args], capture_output=True)
    prefix = EVIDENCE/('round3-'+attempt+'-'+filename.removesuffix('.py'))
    prefix.with_suffix('.stdout.txt').write_bytes(proc.stdout)
    prefix.with_suffix('.stderr.txt').write_bytes(proc.stderr)
    results.append(dict(gate=filename, code=proc.returncode, stdout=str(prefix.with_suffix('.stdout.txt').relative_to(HERE.parents[2])),
                        stderr=str(prefix.with_suffix('.stderr.txt').relative_to(HERE.parents[2]))))
after = pins()
report = dict(attempt=attempt, startedEpochSeconds=started, endedEpochSeconds=time.time(), hostDiskFreeBefore=free,
              python=sys.version, sourceBefore=before, sourceAfter=after, sourceStable=before == after, gates=results)
print(json.dumps(report, indent=2))
sys.exit(0 if before == after and all(r['code'] == 0 for r in results) else 1)

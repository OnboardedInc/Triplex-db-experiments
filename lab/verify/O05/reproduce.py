"""Rerun one retained final-review case by ID, preserving the oracle's exit code."""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
results = json.loads((ROOT / 'lab/verify/O05/evidence/final/results.json').read_text())
row = next(r for r in results if r['id'] == sys.argv[1])
case = next(c for c in json.loads((ROOT / 'lab/verify/O05/cases.json').read_text()) if c['id'] == row['id'])
command = [sys.executable, '-I', '-B', str(ROOT / 'lab/acceptance/oracle/observe.py'),
           'check', case['protocol'], str(ROOT / row['evidencePath']), '--contract', str(ROOT / row['contractPath'])]
sys.exit(subprocess.run(command).returncode)

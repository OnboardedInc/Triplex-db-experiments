"""CX-VA01-040: check actual O-CONTRACT runner bytes against the frozen contract.

Why: --verify can reproduce a stale computed pin when image assignments change later.
Rejected: checking only artifacts.oracle-contract.json, which has the correct hash here.
"""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[3]
doc = json.loads((root / 'lab/acceptance/obligations.json').read_text())
runner = doc['oracleRunners']['O-CONTRACT']
observed = []
for path in runner['files']:
    actual = hashlib.sha256((root / path).read_bytes()).hexdigest()
    observed.append({'path': path, 'expectedSha256': runner['sha256'][path],
                     'actualSha256': actual, 'matches': actual == runner['sha256'][path]})
print(json.dumps({'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
                  'observed': observed,
                  'artifactProjectionSha256': doc['artifacts']['oracle-contract.json']}, indent=2), flush=True)
assert all(row['matches'] for row in observed), 'O-CONTRACT runner is pinned to different bytes'

#!/usr/bin/env python3
"""Validate copied fixture/oracle contracts. This does not execute a database."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
WORKLOADS = ROOT / 'qualification/workloads'
environment = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}
verification = subprocess.run([sys.executable, str(ROOT / 'scripts/xtdb-source-manifest.py'), '--verify'],
                              env=environment, text=True, capture_output=True, check=True)
validation = subprocess.run([sys.executable, str(WORKLOADS / 'validate_workloads.py')],
                            env=environment, text=True, capture_output=True, check=True)
tests = subprocess.run([sys.executable, str(WORKLOADS / 'test_event_oracles.py')],
                      env=environment, text=True, capture_output=True, check=True)
report = {
    'format': 'triplex-xtdb-oracle-validation/1',
    'timestampUtc': datetime.now(timezone.utc).isoformat(),
    'scope': 'Copied immutable-event fixture/oracle contracts only; no XTDB or DuckDB execution.',
    'packetSha256': hashlib.sha256((WORKLOADS / 'temporal-workloads.json').read_bytes()).hexdigest(),
    'sourceVerification': json.loads(verification.stdout),
    'validation': json.loads(validation.stdout),
    'oracleTests': {'exitCode': tests.returncode, 'output': tests.stderr.strip()},
}
if '--output' in sys.argv:
    output = Path(sys.argv[sys.argv.index('--output') + 1]).resolve()
    output.relative_to(ROOT / 'qualification')
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x') as destination:
        json.dump(report, destination, indent=2)
        destination.write('\n')
print(json.dumps(report, indent=2))

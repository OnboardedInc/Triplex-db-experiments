"""Replay one retained round-four invocation, preserving output and exit code."""
import json
from pathlib import Path
import subprocess
import sys

HERE=Path(__file__).resolve().parent
p=(HERE/sys.argv[1]).resolve()
if not p.is_relative_to(HERE):raise SystemExit('Expected round-four evidence directory')
row=json.loads((p/'result.json').read_bytes())
sys.exit(subprocess.run(row['command']).returncode)

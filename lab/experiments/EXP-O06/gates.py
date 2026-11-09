"""Run inside one lab heavy grant; retain each command, exit and output."""
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'lab/experiments/EXP-O06/evidence'
commands = [
 ('unit', [sys.executable,'-I','lab/oracles/replay/cli.py','--test'], {}),
 ('selfcheck', [sys.executable,'-I','lab/oracles/replay/cli.py','--self-check'], {}),
 ('fixtures', [sys.executable,'-I','lab/experiments/EXP-O06/fixture_runner.py'], {}),
]
for lane in ['core','qlever']:
 for version in ['baseline','final']:
  label=f'{version}-{lane}-gate'
  commands.append((label,[sys.executable,'-I','lab/experiments/EXP-O06/golden_runner.py',str(OUT/label)],{'O02_LANE':lane}))
receipts=[]
for label,cmd,env in commands:
 with (OUT/(label+'.log')).open('w') as f:
  proc=subprocess.run(cmd,cwd=ROOT,env=dict(os.environ,**env,PYTHONDONTWRITEBYTECODE='1'),stdout=f,stderr=subprocess.STDOUT)
 receipts.append({'label':label,'command':cmd,'environment':env,'exit':proc.returncode})
 print(label,proc.returncode,flush=True)
(OUT/'gates.json').write_text(json.dumps(receipts,indent=2)+'\n')
raise SystemExit(any(r['exit'] for r in receipts))

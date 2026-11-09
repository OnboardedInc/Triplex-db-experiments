"""EXP-O06 final-source run; first failures are retained in evidence/gates.json."""
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'lab/experiments/EXP-O06/evidence'
cmds = [
 ('baseline-unit', ['python3','-I',str(OUT/'baseline-source/lab/oracles/replay/cli.py'),'--test'], {},1),
 ('unit-final', ['python3','-I','lab/oracles/replay/cli.py','--test'], {},1),
 ('selfcheck-final', ['python3','-I','lab/oracles/replay/cli.py','--self-check'], {},0),
 ('fixtures-final', ['python3','-I','lab/experiments/EXP-O06/fixture_runner.py'], {},0),
]
for lane in ['core','qlever']:
 for kind in ['final','updated']:
  env={'O02_LANE':lane}
  if kind=='updated': env['O06_GOLD']=str(ROOT/'lab/acceptance/golden')
  cmds.append((f'{kind}-{lane}-bound',['python3','-I','lab/experiments/EXP-O06/golden_runner.py',str(OUT/f'{kind}-{lane}-bound')],env,0))
receipts=[]
for label,cmd,env,want in cmds:
 with (OUT/(label+'.log')).open('w') as f:
  proc=subprocess.run(cmd,cwd=ROOT,env=dict(os.environ,**env,PYTHONDONTWRITEBYTECODE='1'),stdout=f,stderr=subprocess.STDOUT)
 receipts.append({'label':label,'command':cmd,'environment':env,'exit':proc.returncode,'expectedExit':want})
 print(label,proc.returncode,flush=True)
(OUT/'final-gates.json').write_text(json.dumps(receipts,indent=2)+'\n')
raise SystemExit(any(r['exit']!=r['expectedExit'] for r in receipts))

"""Fresh shipped gates, with artifacts confined to the review directory."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
SOURCE=ROOT/'lab/acceptance/oracle'
out=HERE/'gate-evidence'
if out.exists():raise SystemExit('Retain earlier execution')
out.mkdir();free=shutil.disk_usage(HERE).free
if free<5*1024**3:raise SystemExit('Below disk admission floor')
def pins():return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in SOURCE.glob('*') if p.is_file()}
before=pins();started=time.time();results=[]
for name in ['test_observe.py','test_cli.py','test_round2.py','test_round3.py','test_round4.py','selfcheck.py']:
    cmd=[sys.executable,'-I','-B',str(SOURCE/name)]
    proc=subprocess.run(cmd,capture_output=True)
    (out/(name+'.stdout.txt')).write_bytes(proc.stdout);(out/(name+'.stderr.txt')).write_bytes(proc.stderr)
    results.append(dict(gate=name,code=proc.returncode,command=cmd))
summary=dict(start=started,end=time.time(),freeBytes=free,sourceBefore=before,sourceAfter=pins(),sourceStable=before==pins(),gates=results)
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))

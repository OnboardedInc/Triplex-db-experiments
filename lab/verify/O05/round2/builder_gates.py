"""Read-only rerun of the builder's shipped gates; retain stdout and exits."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

HERE=Path(__file__).resolve().parent
SUBJECT=HERE/'subject/lab/acceptance/oracle'
out=HERE/'builder-gates'
if out.exists():raise SystemExit('Retain previous attempt')
out.mkdir()
free=shutil.disk_usage(HERE).free
if free<5*1024**3:raise SystemExit('Insufficient disk')
def pins():return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in SUBJECT.glob('*') if p.is_file()}
before=pins();started=time.time();results=[]
for script in ['test_observe.py','test_cli.py','test_round2.py','selfcheck.py']:
    proc=subprocess.run([sys.executable,'-I','-B',str(SUBJECT/script)],capture_output=True)
    (out/(script+'.stdout.txt')).write_bytes(proc.stdout)
    (out/(script+'.stderr.txt')).write_bytes(proc.stderr)
    results.append(dict(gate=script,code=proc.returncode))
report=dict(start=started,end=time.time(),freeBytes=free,sourceStable=before==pins(),sources=before,gates=results)
(out/'summary.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
sys.exit(0 if all(x['code']==0 for x in results) and before==pins() else 1)

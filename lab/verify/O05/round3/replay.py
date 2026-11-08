"""Independent in-place replay of all retained review inputs against round three."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
OLD=HERE.parent/'round2'
ORACLE=ROOT/'lab/acceptance/oracle/observe.py'

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    out=HERE/'replay-evidence'
    if out.exists():raise SystemExit('Do not overwrite retained attempt')
    out.mkdir(parents=True)
    free=shutil.disk_usage(HERE).free
    if free<5*1024**3:raise SystemExit('Below disk admission floor')
    start=time.time();before=sha(ORACLE)
    rows=json.loads((OLD/'evidence/results.json').read_bytes())+json.loads((OLD/'supplement-evidence/results.json').read_bytes())
    results=[]
    for i,row in enumerate(rows):
        p=OLD/row['path'];dest=out/str(i).zfill(3);dest.mkdir()
        paths=[p/'evidence.json',p/'contract.json']
        cmd=[sys.executable,'-I','-B',str(ORACLE),'check',row['result']['protocol'],str(paths[0]),'--contract',str(paths[1])]
        if row.get('group')!='legacy':
            paths+=[p/'context.json',p/'run.key']+list((p/'bundle').rglob('*'))
            cmd+=['--context',str(p/'context.json'),'--bundle',str(p/'bundle'),'--key-file',str(p/'run.key')]
        pins={str(x.relative_to(OLD)):sha(x) for x in paths if x.is_file()}
        proc=subprocess.run(cmd,capture_output=True,text=True,timeout=45)
        (dest/'stdout.txt').write_text(proc.stdout);(dest/'stderr.txt').write_text(proc.stderr)
        try:report=json.loads(proc.stdout)
        except ValueError:report={'verdict':'CRASH'}
        expected=row['expected'];change=None
        if row['id']=='CANCEL/clock-margin-positive':
            # [CX-VO05-R3] Why: 1000 ms gaps and an exact final edge lack uncertainty slack. Rejected: hiding the changed expectation.
            expected='REJECT';change='Independent interval model requires cadence and final-edge slack; original input unchanged.'
        ok=(proc.returncode==0 and report['verdict']=='PASS') if expected=='PASS' else (proc.returncode in (1,2) and report['verdict'] in ('FAIL','REFUSED'))
        stable=all(sha(OLD/name)==digest for name,digest in pins.items())
        result=dict(id=row['id'],source=row['path'],expected=expected,priorExpected=row['expected'],expectationChange=change,
            code=proc.returncode,result=report,ok=ok,inputHashes=pins,inputStable=stable,command=cmd)
        (dest/'result.json').write_text(json.dumps(result,sort_keys=True)+'\n');results.append(result)
    summary=dict(start=start,end=time.time(),freeBytes=free,subjectCommit='537adf8',oracleSha256=before,
        sourceStable=before==sha(ORACLE),inputStable=all(r['inputStable'] for r in results),total=len(results),
        matched=sum(r['ok'] for r in results),discrepancies=[r for r in results if not r['ok']],
        expectedChanges=[dict(id=r['id'],reason=r['expectationChange'],result=r['result']) for r in results if r['expectationChange']])
    (out/'results.json').write_text(json.dumps(results,sort_keys=True)+'\n')
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps(summary,indent=2))

if __name__=='__main__':main()

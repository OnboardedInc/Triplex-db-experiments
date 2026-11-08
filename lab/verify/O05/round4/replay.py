"""Replay the review's complete 786-case retained cohort without changing inputs."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
PRIOR=HERE.parent/'round3'
ORACLE=ROOT/'lab/acceptance/oracle/observe.py'

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    out=HERE/'replay-evidence'
    if out.exists():raise SystemExit('Retain earlier execution')
    out.mkdir(parents=True);free=shutil.disk_usage(HERE).free
    if free<5*1024**3:raise SystemExit('Below disk admission floor')
    started=time.time();before=sha(ORACLE)
    cohorts={
        'retained':json.loads((PRIOR/'replay-evidence/results.json').read_bytes()),
        'general':json.loads((PRIOR/'general-evidence/results.json').read_bytes()),
        'coverage':json.loads((PRIOR/'coverage-evidence/summary.json').read_bytes())['results'],
        'context':json.loads((PRIOR/'context-evidence/summary.json').read_bytes())['results'],
    }
    results=[]
    for group,rows in cohorts.items():
        for row in rows:
            p=out/str(len(results)).zfill(4);p.mkdir()
            cmd=list(row['command']);assert Path(cmd[3])==ORACLE
            cmd[0]=sys.executable
            original=Path(cmd[6]).parent
            paths=[x for x in original.rglob('*') if x.is_file()]
            cp=Path(cmd[cmd.index('--contract')+1]);paths.append(cp)
            pins={str(x.relative_to(ROOT)):sha(x) for x in set(paths)}
            proc=subprocess.run(cmd,capture_output=True,text=True,timeout=45)
            (p/'stdout.txt').write_text(proc.stdout);(p/'stderr.txt').write_text(proc.stderr)
            try:report=json.loads(proc.stdout)
            except ValueError:report=dict(verdict='CRASH',reasons=[proc.stderr])
            expected=row['expected']
            ok=(proc.returncode==0 and report['verdict']=='PASS') if expected=='PASS' else (proc.returncode in [1,2] and report['verdict'] in ['FAIL','REFUSED'])
            reason=row.get('expectedReason')
            if group=='coverage':reason={'original':'cover uncertain','cadence-only':'cover uncertain','last-edge-only':'coverage gap'}.get(row['id'])
            if group=='context':reason='obligation does not select O-OBS'
            intended=reason is None or any(reason in x for x in report.get('reasons',[]))
            if group=='context':ok=ok and proc.returncode==2
            stable=all(sha(ROOT/name)==digest for name,digest in pins.items())
            result=dict(id=row['id'],group=group,expected=expected,code=proc.returncode,result=report,
                expectedReason=reason,intendedGuard=intended,inputStable=stable,ok=ok and intended and stable,
                command=cmd,inputHashes=pins,path=str(p.relative_to(HERE)))
            (p/'result.json').write_text(json.dumps(result,sort_keys=True)+'\n');results.append(result)
    summary=dict(start=started,end=time.time(),freeBytes=free,sourceSha256=before,sourceStable=before==sha(ORACLE),
        total=len(results),matched=sum(r['ok'] for r in results),inputStable=all(r['inputStable'] for r in results),
        discrepancies=[r for r in results if not r['ok']])
    (out/'results.json').write_text(json.dumps(results,sort_keys=True)+'\n');(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps(summary,indent=2))

if __name__=='__main__':main()

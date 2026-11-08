"""Check the Q80a contract-obligation boundary across every protocol family."""
import copy
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
OLD=HERE.parent/'round2'
sys.path.insert(0,str(OLD))
import review_round2 as r
ORACLE=ROOT/'lab/acceptance/oracle/observe.py'
CONTRACT=ROOT/'lab/acceptance/obligations.json'

def main():
    out=HERE/'context-evidence'
    if out.exists():raise SystemExit('Retain previous attempt')
    out.mkdir();free=shutil.disk_usage(HERE).free
    if free<5*1024**3:raise SystemExit('Below disk admission floor')
    before=r.sha(ORACLE.read_bytes());started=time.time()
    c=json.loads(CONTRACT.read_bytes());base,inventory,expectations=r.positives(c)
    unrelated=next(o for o in c['obligations'] if o['id']=='G1.found.unchanged44')
    assert 'O-OBS' not in unrelated['oracles']
    results=[]
    for protocol in base:
        e=copy.deepcopy(base[protocol]);p=out/protocol
        if protocol=='RESOURCE':e['obligation']=unrelated['id']
        e,ctx=r.encode(p,protocol,e,c,inventory,expectations)
        # [CX-VO05-R3] Why: trust does not make a contradictory obligation valid. Rejected: restricting the authority check to WORK.
        ctx.update(obligation=unrelated['id'],case='CS-U44/all')
        (p/'evidence.json').write_bytes(r.raw(e));(p/'context.json').write_bytes(r.raw(ctx))
        cmd=[sys.executable,'-I','-B',str(ORACLE),'check','OBS-'+protocol,str(p/'evidence.json'),
            '--contract',str(CONTRACT),'--context',str(p/'context.json'),'--bundle',str(p/'bundle'),'--key-file',str(p/'run.key')]
        proc=subprocess.run(cmd,capture_output=True,text=True,timeout=45)
        (p/'stdout.txt').write_text(proc.stdout);(p/'stderr.txt').write_text(proc.stderr)
        report=json.loads(proc.stdout)
        result=dict(id=protocol+'/obligation-does-not-use-O-OBS',expected='REJECT',code=proc.returncode,
            result=report,ok=proc.returncode in [1,2] and report['verdict'] in ['FAIL','REFUSED'],command=cmd)
        (p/'result.json').write_text(json.dumps(result,sort_keys=True)+'\n');results.append(result)
    summary=dict(start=started,end=time.time(),freeBytes=free,oracleSha256=before,sourceStable=before==r.sha(ORACLE.read_bytes()),
        unrelatedObligation=unrelated,total=len(results),matched=sum(x['ok'] for x in results),results=results)
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))

if __name__=='__main__':main()

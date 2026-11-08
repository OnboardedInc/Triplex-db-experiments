"""Isolate why the former supplemental positive lacks clock-coverage proof."""
import copy
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
sys.path.insert(0,str(OLD))
import review_round2 as r
ORACLE=ROOT/'lab/acceptance/oracle/observe.py'
CONTRACT=ROOT/'lab/acceptance/obligations.json'

def main():
    out=HERE/'coverage-evidence'
    if out.exists():raise SystemExit('Retain previous attempt')
    out.mkdir();free=shutil.disk_usage(HERE).free
    if free<5*1024**3:raise SystemExit('Below disk admission floor')
    before=r.sha(ORACLE.read_bytes());started=time.time()
    original=OLD/'supplement-evidence/018/evidence.json'
    original_sha=r.sha(original.read_bytes())
    evidence=json.loads(original.read_bytes());evidence.pop('source');evidence.pop('corroboration')
    c=json.loads(CONTRACT.read_bytes());_,inventory,expectations=r.positives(c);results=[]
    for label,ts,expected,reason in [
        ('original',[100+1000*i for i in range(8)],'REJECT','cover uncertain'),
        ('cadence-only',[100+500*i for i in range(15)],'REJECT','cover uncertain'),
        ('last-edge-only',[100+1000*i for i in range(8)]+[7600],'REJECT','coverage gap'),
        ('both',[100+500*i for i in range(16)],'PASS',None)]:
        p=out/label;e=copy.deepcopy(evidence)
        # [CX-VO05-R3] Why: vary only retained sample times, preserving drain/caller facts. Rejected: unrelated new cancellation positive.
        e['engineActiveSamples']=[dict(t=t,activeQueryIds=['query-a'] if t<2100 else []) for t in ts]
        e,ctx=r.encode(p,'CANCEL',e,c,inventory,expectations)
        b=json.loads((p/'bundle/bundle.json').read_bytes());b['clock']['maxUncertaintyMs']=1
        (p/'bundle/bundle.json').write_bytes(r.raw(b));ctx.update(bundleSha256=r.sha(r.raw(b)),clockMaxUncertaintyMs=1)
        (p/'evidence.json').write_bytes(r.raw(e));(p/'context.json').write_bytes(r.raw(ctx))
        cmd=[sys.executable,'-I','-B',str(ORACLE),'check','OBS-CANCEL',str(p/'evidence.json'),
            '--contract',str(CONTRACT),'--context',str(p/'context.json'),'--bundle',str(p/'bundle'),'--key-file',str(p/'run.key')]
        proc=subprocess.run(cmd,capture_output=True,text=True,timeout=45)
        (p/'stdout.txt').write_text(proc.stdout);(p/'stderr.txt').write_text(proc.stderr)
        report=json.loads(proc.stdout)
        ok=(proc.returncode==0 and report['verdict']=='PASS') if expected=='PASS' else (proc.returncode in [1,2] and report['verdict'] in ['FAIL','REFUSED'])
        intended=reason is None or any(reason in x for x in report['reasons'])
        result=dict(id=label,expected=expected,code=proc.returncode,result=report,ok=ok,intendedGuard=intended,command=cmd)
        (p/'result.json').write_text(json.dumps(result,sort_keys=True)+'\n');results.append(result)
    summary=dict(start=started,end=time.time(),freeBytes=free,original=str(original.relative_to(ROOT)),originalSha256=original_sha,
        inputStable=original_sha==r.sha(original.read_bytes()),sourceStable=before==r.sha(ORACLE.read_bytes()),oracleSha256=before,
        total=len(results),matched=sum(x['ok'] and x['intendedGuard'] for x in results),results=results)
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))

if __name__=='__main__':main()

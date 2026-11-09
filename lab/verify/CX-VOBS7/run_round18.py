#!/usr/bin/env python3
"""Capture round-18 suites, unchanged prior fixtures, new boundary controls and recorded live receipts."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'round18'
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
    free=shutil.disk_usage(ROOT).free
    if free<5*1024**3:raise RuntimeError('disk below 5 GiB')
    OUT.mkdir(exist_ok=False)
    paths=sorted(set([str(p.relative_to(ROOT)) for d in ['lab/bin','lab/observer'] for p in (ROOT/d).glob('*') if p.is_file() and p.suffix in ('.py','.mjs','.bt')]+[
        'lab/observer/golden/MANIFEST.json','lab/observer/golden/vm_syncwitness.bpftrace-0.20.2-d.dump.txt',
        'lab/observer/golden/bpf-func-id-enum.kernel-6.8.0-117.json','lab/experiments/EXP-OBS01/round16/EVIDENCE-SHA256SUMS',
        'lab/experiments/EXP-OBS01/round18/EVIDENCE-SHA256SUMS']+
        [str(p.relative_to(ROOT)) for p in HERE.glob('*') if p.is_file() and p.suffix in ('.py','.mjs')]))
    pins={p:sha((ROOT/p).read_bytes()) for p in paths}
    r={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'startedNs':time.time_ns(),'hostFreeBytes':free,
        'sourceSha256':pins,'commands':[],'claim':'offline correctness review only; historical rehearsal is not a guest-crash or acceptance result'}
    commands=[(n,['python3','-B','lab/observer/'+n+'.py']) for n in ['test_vm','test_syncwitness','test_round10','test_round11','test_w4']]
    commands += [(n,['node','--test','lab/observer/'+n+'.mjs']) for n in ['test_engine','test_round12','test_round16','test_abba','test_round17']]
    commands += [(label,['python3','-B',str(HERE/'replay_round18.py'),key]) for label,key in [('r16-python','r16'),('r17-review','r17'),('r17-pipeline','pipeline'),('recorded-r16','recorded')]]
    commands += [(label,['node','--import',str(HERE/'redirect_round18.mjs'),'--test',str(HERE/name)]) for label,name in [('r16-io','review_round16_w4_io.mjs'),('r16-js','review_round16.mjs')]]
    commands += [('r18-boundary',['python3','-B',str(HERE/'test_round18_review.py')]),('r18-live-replay',['python3','-B',str(HERE/'review_round18_evidence.py')])]
    for label,argv in commands:
        c=subprocess.run(argv,cwd=ROOT,capture_output=True,timeout=600,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
        (OUT/(label+'.stdout')).write_bytes(c.stdout);(OUT/(label+'.stderr')).write_bytes(c.stderr)
        r['commands'].append({'name':label,'argv':argv,'exit':c.returncode,'stdoutSha256':sha(c.stdout),'stderrSha256':sha(c.stderr)})
        print(label,c.returncode,flush=True)
    # [CX-VOBS7-R18] Why: exact exits, source pins and retained failures establish this attempt's scope. Rejected: inferring all tests passed from capture completion or adopting a stored PASS label.
    r['sourceUnchanged']=all(sha((ROOT/p).read_bytes())==h for p,h in pins.items());r['finishedNs']=time.time_ns()
    (OUT/'RUN.json').write_text(json.dumps(r,indent=2,sort_keys=True)+'\n')
    (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(OUT))+'\n' for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))
    if not r['sourceUnchanged']:raise RuntimeError('source drift')
if __name__=='__main__':main()

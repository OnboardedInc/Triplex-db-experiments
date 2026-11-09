#!/usr/bin/env python3
"""Capture fresh offline round-16 suites and reviewer replays; never invokes a VM."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'round16'
def sha(raw):return hashlib.sha256(raw).hexdigest()

def main():
    free=shutil.disk_usage(ROOT).free
    if free<5*1024**3:raise RuntimeError('disk below 5 GiB')
    OUT.mkdir(exist_ok=False)
    paths=sorted(set([str(p.relative_to(ROOT)) for d in ['lab/bin','lab/observer'] for p in (ROOT/d).glob('*') if p.is_file() and p.suffix in ('.py','.mjs','.bt')]+[
        'lab/observer/golden/MANIFEST.json','lab/observer/golden/vm_syncwitness.bpftrace-0.20.2-d.dump.txt',
        'lab/observer/golden/bpf-func-id-enum.kernel-6.8.0-117.json','lab/experiments/EXP-OBS01/round16/EVIDENCE-SHA256SUMS',
        'lab/verify/CX-VOBS7/review_round15.py','lab/verify/CX-VOBS7/review_round16.py',
        'lab/verify/CX-VOBS7/review_round16.mjs','lab/verify/CX-VOBS7/test_round16_adversarial.py','lab/verify/CX-VOBS7/run_round16.py']))
    pins={p:sha((ROOT/p).read_bytes()) for p in paths}
    result={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'startedNs':time.time_ns(),
        'hostFreeBytes':free,'sourceSha256':pins,'commands':[],'claim':'offline tests and recorded evidence only; no new live qualification'}
    commands=[(name,['python3','-B','lab/observer/'+name+'.py']) for name in ['test_vm','test_syncwitness','test_round10','test_round11','test_w4']]
    commands += [(name,['node','--test','lab/observer/'+name+'.mjs']) for name in ['test_engine','test_round12','test_round16','test_abba']]
    commands += [('recorded-replay',['python3','-B',str(HERE/'review_round16.py')]),
        ('abba-ir-replay',['node','--test',str(HERE/'review_round16.mjs')]),
        ('w4-adversarial',['python3','-B',str(HERE/'test_round16_adversarial.py')])]
    for name,argv in commands:
        child=subprocess.run(argv,cwd=ROOT,capture_output=True,timeout=600,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
        (OUT/(name+'.stdout')).write_bytes(child.stdout);(OUT/(name+'.stderr')).write_bytes(child.stderr)
        result['commands'].append({'name':name,'argv':argv,'exit':child.returncode,'stdoutSha256':sha(child.stdout),'stderrSha256':sha(child.stderr)})
        print(name,child.returncode,flush=True)
    # [CX-VOBS7-R16] Why: retain failed assertions and bind all results to this execution and unchanged inputs. Rejected: treating runner completion as an all-tests-pass receipt.
    result['sourceUnchanged']=all(sha((ROOT/p).read_bytes())==h for p,h in pins.items());result['finishedNs']=time.time_ns()
    (OUT/'RUN.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(OUT))+'\n' for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))
    if not result['sourceUnchanged']:raise RuntimeError('source drift')

if __name__=='__main__':main()

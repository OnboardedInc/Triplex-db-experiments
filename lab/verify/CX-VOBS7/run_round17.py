#!/usr/bin/env python3
"""Fresh source-bound capture of offline round-17 suites, unchanged R16 fixtures and boundary tests."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'round17'
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
    free=shutil.disk_usage(ROOT).free
    if free<5*1024**3:raise RuntimeError('disk below 5 GiB')
    OUT.mkdir(exist_ok=False)
    paths=sorted(set([str(p.relative_to(ROOT)) for d in ['lab/bin','lab/observer'] for p in (ROOT/d).glob('*') if p.is_file() and p.suffix in ('.py','.mjs','.bt')]+[
        'lab/observer/golden/MANIFEST.json','lab/observer/golden/vm_syncwitness.bpftrace-0.20.2-d.dump.txt',
        'lab/observer/golden/bpf-func-id-enum.kernel-6.8.0-117.json','lab/experiments/EXP-OBS01/round16/EVIDENCE-SHA256SUMS']+
        [str(p.relative_to(ROOT)) for p in HERE.glob('*') if p.is_file() and p.suffix in ('.py','.mjs')]))
    pins={p:sha((ROOT/p).read_bytes()) for p in paths}
    result={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'startedNs':time.time_ns(),
        'hostFreeBytes':free,'sourceSha256':pins,'commands':[],'claim':'offline W4 correctness review only; no VM/container operation'}
    commands=[(n,['python3','-B','lab/observer/'+n+'.py']) for n in ['test_vm','test_syncwitness','test_round10','test_round11','test_w4']]
    commands += [(n,['node','--test','lab/observer/'+n+'.mjs']) for n in ['test_engine','test_round12','test_round16','test_abba','test_round17']]
    commands += [('r16-python',['python3','-B',str(HERE/'replay_round16_for_round17.py'),'adversarial']),
        ('r16-io',['node','--import',str(HERE/'redirect_round17.mjs'),'--test',str(HERE/'review_round16_w4_io.mjs')]),
        ('r16-js',['node','--import',str(HERE/'redirect_round17.mjs'),'--test',str(HERE/'review_round16.mjs')]),
        ('recorded-replay',['python3','-B',str(HERE/'replay_round16_for_round17.py'),'recorded']),
        ('boundary-review',['python3','-B',str(HERE/'test_round17_review.py')])]
    for name,argv in commands:
        c=subprocess.run(argv,cwd=ROOT,capture_output=True,timeout=600,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
        (OUT/(name+'.stdout')).write_bytes(c.stdout);(OUT/(name+'.stderr')).write_bytes(c.stderr)
        result['commands'].append({'name':name,'argv':argv,'exit':c.returncode,'stdoutSha256':sha(c.stdout),'stderrSha256':sha(c.stderr)})
        print(name,c.returncode,flush=True)
    # [CX-VOBS7-R17] Why: preserve all failed boundary assertions, exact sources and exits. Rejected: equating successful capture with passing tests or adopting old PASS labels.
    result['sourceUnchanged']=all(sha((ROOT/p).read_bytes())==h for p,h in pins.items());result['finishedNs']=time.time_ns()
    (OUT/'RUN.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(OUT))+'\n' for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))
    if not result['sourceUnchanged']:raise RuntimeError('source drift')
if __name__=='__main__':main()

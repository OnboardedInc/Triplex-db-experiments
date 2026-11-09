#!/usr/bin/env python3
"""Capture offline suites and recorded-data replays in a fresh reviewer attempt."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'round15'
PATHS=['lab/bin/clock-proof.mjs','lab/bin/btf-helpers.mjs','lab/bin/sync-witness.mjs','lab/bin/vm-observer.mjs',
 'lab/observer/vm_syncwitness.bt','lab/observer/vm_normalizer.py','lab/observer/vm_syncwitness.py','lab/observer/vm_planted_writer.py',
 'lab/observer/vm_w3_load.py','lab/observer/vm_fixture.py','lab/observer/test_vm.py','lab/observer/test_syncwitness.py',
 'lab/observer/test_round10.py','lab/observer/test_round11.py','lab/observer/test_engine.mjs','lab/observer/test_round12.mjs',
 'lab/observer/golden/MANIFEST.json','lab/observer/golden/vm_syncwitness.bpftrace-0.20.2-d.dump.txt',
 'lab/observer/golden/bpf-func-id-enum.kernel-6.8.0-117.json','lab/experiments/EXP-OBS01/round15/EVIDENCE-SHA256SUMS',
 'lab/experiments/EXP-OBS01/round15/EVIDENCE-SHA256SUMS.pre-resize','lab/verify/CX-VOBS7/review_round15.py',
 'lab/verify/CX-VOBS7/review_round15.mjs','lab/verify/CX-VOBS7/run_round15.py']

def sha(raw):return hashlib.sha256(raw).hexdigest()

def main():
    free=shutil.disk_usage(ROOT).free
    if free<5*1024**3:raise RuntimeError('disk below 5 GiB')
    OUT.mkdir(exist_ok=False)
    pins={p:sha((ROOT/p).read_bytes()) for p in PATHS}
    result={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'startedNs':time.time_ns(),
        'hostFreeBytes':free,'sourceSha256':pins,'commands':[],'claim':'offline replay of recorded W0-W3 evidence; no VM/container operation or general acceptance qualification'}
    commands=[('python-vm',['python3','-B','lab/observer/test_vm.py']),('python-syncwitness',['python3','-B','lab/observer/test_syncwitness.py']),
        ('python-round10',['python3','-B','lab/observer/test_round10.py']),('python-round11',['python3','-B','lab/observer/test_round11.py']),
        ('node-engine',['node','--test','lab/observer/test_engine.mjs']),('node-round12',['node','--test','lab/observer/test_round12.mjs']),
        ('recorded-replay',['python3','-B','lab/verify/CX-VOBS7/review_round15.py']),('golden-harness',['node','--test','lab/verify/CX-VOBS7/review_round15.mjs'])]
    for name,argv in commands:
        child=subprocess.run(argv,cwd=ROOT,capture_output=True,timeout=300,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
        (OUT/(name+'.stdout')).write_bytes(child.stdout);(OUT/(name+'.stderr')).write_bytes(child.stderr)
        result['commands'].append({'name':name,'argv':argv,'exit':child.returncode,'stdoutSha256':sha(child.stdout),'stderrSha256':sha(child.stderr)})
        print(name,child.returncode,flush=True)
    # [CX-VOBS7-R15] Why: bind the replay to unchanged code and the recorded manifest, preserving any failed check. Rejected: adopting old PASS labels or inferring success from capture completion.
    result['sourceUnchanged']=all(sha((ROOT/p).read_bytes())==h for p,h in pins.items());result['finishedNs']=time.time_ns()
    (OUT/'RUN.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(OUT))+'\n' for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))
    if not result['sourceUnchanged']:raise RuntimeError('source drift')

if __name__=='__main__':main()

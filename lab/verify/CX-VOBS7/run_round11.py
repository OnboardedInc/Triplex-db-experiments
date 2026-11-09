#!/usr/bin/env python3
"""One admitted offline review attempt. Captures failures without replacing older evidence."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = HERE / 'round11'
PATHS = ['lab/bin/clock-proof.mjs','lab/bin/sync-witness.mjs','lab/observer/vm_normalizer.py',
    'lab/observer/vm_syncwitness.py','lab/observer/vm_syncwitness.bt','lab/observer/vm_clockcheck.py',
    'lab/observer/vm_fixture.py','lab/observer/vm_planted_writer.py','lab/observer/test_vm.py',
    'lab/observer/test_syncwitness.py','lab/observer/test_round10.py','lab/observer/test_round11.py',
    'lab/observer/test_engine.mjs','lab/verify/CX-VOBS7/review_round9.py','lab/verify/CX-VOBS7/review_round10.py',
    'lab/verify/CX-VOBS7/review_round11.mjs','lab/verify/CX-VOBS7/run_round11.py']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    free = shutil.disk_usage(ROOT).free
    if free < 5*1024**3:
        raise RuntimeError('disk below 5 GiB')
    OUT.mkdir(exist_ok=False)
    pins = {p:sha((ROOT/p).read_bytes()) for p in PATHS}
    result = {'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
        'startedNs':time.time_ns(),'sourceSha256':pins,'hostFreeBytes':free,'commands':[],
        'claim':'offline source review and constructed fixtures; no VM, compiler recording or semantic acceptance'}
    commands = [('python-vm',['python3','-B','lab/observer/test_vm.py']),
        ('python-syncwitness',['python3','-B','lab/observer/test_syncwitness.py']),
        ('python-round10',['python3','-B','lab/observer/test_round10.py']),
        ('python-round11',['python3','-B','lab/observer/test_round11.py']),
        ('node-engine',['node','--test','lab/observer/test_engine.mjs'])]
    for round in (9,10):
        program=f'import sys,unittest;from pathlib import Path;sys.path.insert(0,"lab/verify/CX-VOBS7");import review_round{round} as r;r.OUT=Path("lab/verify/CX-VOBS7/round11/prior-round{round}");unittest.main(module=r,verbosity=2)'
        commands.append((f'review-round{round}',['python3','-B','-c',program]))
    commands.append(('review-round11',['node','--test','lab/verify/CX-VOBS7/review_round11.mjs']))
    for name,argv in commands:
        child=subprocess.run(argv,cwd=ROOT,capture_output=True,timeout=300,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
        (OUT/(name+'.stdout')).write_bytes(child.stdout);(OUT/(name+'.stderr')).write_bytes(child.stderr)
        result['commands'].append({'name':name,'argv':argv,'exit':child.returncode,
            'stdoutSha256':sha(child.stdout),'stderrSha256':sha(child.stderr)})
        print(name,child.returncode,flush=True)
    # [CX-VOBS7-R11] Why: bind every result to the measured source bytes, not a moving branch label. Rejected: adopting another attempt's output.
    result['sourceUnchanged']=all(sha((ROOT/p).read_bytes())==h for p,h in pins.items())
    result['finishedNs']=time.time_ns()
    (OUT/'RUN.json').write_text(json.dumps(result,sort_keys=True,indent=2)+'\n')
    (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(OUT))+'\n'
        for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))
    if not result['sourceUnchanged']:
        raise RuntimeError('source drift')


if __name__=='__main__':
    main()

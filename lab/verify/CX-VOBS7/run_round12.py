#!/usr/bin/env python3
"""One source-bound offline attempt; negative assertion failures are retained, not adopted as successes."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'round12'
PATHS=['lab/bin/clock-proof.mjs','lab/bin/btf-helpers.mjs','lab/bin/sync-witness.mjs',
 'lab/observer/btf_fixture.mjs','lab/observer/dump_fixture.mjs','lab/observer/vm_syncwitness.bt',
 'lab/observer/vm_normalizer.py','lab/observer/vm_syncwitness.py','lab/observer/vm_clockcheck.py',
 'lab/observer/vm_fixture.py','lab/observer/vm_planted_writer.py','lab/observer/test_vm.py',
 'lab/observer/test_syncwitness.py','lab/observer/test_round10.py','lab/observer/test_round11.py',
 'lab/observer/test_engine.mjs','lab/observer/test_round12.mjs',
 'lab/verify/CX-VOBS7/review_round9.py','lab/verify/CX-VOBS7/review_round10.py',
 'lab/verify/CX-VOBS7/review_round11.mjs','lab/verify/CX-VOBS7/review_round12.mjs',
 'lab/verify/CX-VOBS7/run_round12.py']

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def main():
    free=shutil.disk_usage(ROOT).free
    if free<5*1024**3:
        raise RuntimeError('disk below 5 GiB')
    OUT.mkdir(exist_ok=False)
    pins={p:sha((ROOT/p).read_bytes()) for p in PATHS}
    original=(HERE/'review_round11.mjs').read_text()
    old="path.join(import.meta.dirname,'round11','independent')"
    new="path.join(import.meta.dirname,'round12','prior-round11')"
    if original.count(old)!=1:
        raise RuntimeError('unexpected round11 output path')
    replay=HERE/'replay_round11_for_round12.mjs'
    replay.write_text(original.replace(old,new))
    result={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
     'startedNs':time.time_ns(),'sourceSha256':pins,'hostFreeBytes':free,'commands':[],
     'round11Replay':{'path':str(replay.relative_to(ROOT)),'sha256':sha(replay.read_bytes()),'onlyReplacement':{'from':old,'to':new}},
     'claim':'offline source review and constructed fixtures only; no VM, real compiler output or semantic acceptance'}
    commands=[('python-vm',['python3','-B','lab/observer/test_vm.py']),
     ('python-syncwitness',['python3','-B','lab/observer/test_syncwitness.py']),
     ('python-round10',['python3','-B','lab/observer/test_round10.py']),
     ('python-round11',['python3','-B','lab/observer/test_round11.py']),
     ('node-engine',['node','--test','lab/observer/test_engine.mjs']),
     ('node-round12',['node','--test','lab/observer/test_round12.mjs'])]
    for rnd in (9,10):
        program=f'import sys,unittest;from pathlib import Path;sys.path.insert(0,"lab/verify/CX-VOBS7");import review_round{rnd} as r;r.OUT=Path("lab/verify/CX-VOBS7/round12/prior-round{rnd}");unittest.main(module=r,verbosity=2)'
        commands.append((f'review-round{rnd}',['python3','-B','-c',program]))
    commands.extend([('review-round11',['node','--test',str(replay.relative_to(ROOT))]),
      ('review-round12',['node','--test','lab/verify/CX-VOBS7/review_round12.mjs'])])
    for name,argv in commands:
        child=subprocess.run(argv,cwd=ROOT,capture_output=True,timeout=300,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
        (OUT/(name+'.stdout')).write_bytes(child.stdout)
        (OUT/(name+'.stderr')).write_bytes(child.stderr)
        result['commands'].append({'name':name,'argv':argv,'exit':child.returncode,
         'stdoutSha256':sha(child.stdout),'stderrSha256':sha(child.stderr)})
        print(name,child.returncode,flush=True)
    # [CX-VOBS7-R12] Why: bind results to unchanged bytes and preserve failed assertions. Rejected: accepting historical output or inferring acceptance from runner exit zero.
    result['sourceUnchanged']=all(sha((ROOT/p).read_bytes())==h for p,h in pins.items())
    result['finishedNs']=time.time_ns()
    (OUT/'RUN.json').write_text(json.dumps(result,sort_keys=True,indent=2)+'\n')
    (OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(OUT))+'\n'
     for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))
    if not result['sourceUnchanged']:
        raise RuntimeError('source drift')

if __name__=='__main__':
    main()

#!/usr/bin/env python3
"""Retained frozen-source OBS01-R6 offline gate; invoke through heavy.mjs."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
ROOT=Path(__file__).resolve().parents[2]
def sha(raw):return hashlib.sha256(raw).hexdigest()
def main():
    if shutil.disk_usage(ROOT).free<5*1024**3:raise RuntimeError('host disk below 5 GiB')
    out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=False)
    paths=['lab/experiments/EXP-OBS01/round8/probe_round8.py','lab/bin/engine.mjs','lab/bin/vm-observer.mjs','lab/bin/sync-witness.mjs','lab/bin/clock-proof.mjs','lab/bin/btf-helpers.mjs','lab/observer/btf_fixture.mjs','lab/observer/dump_fixture.mjs','lab/observer/test_round12.mjs','lab/observer/vm_syncwitness.bt','lab/observer/vm_syncwitness.py','lab/observer/vm_planted_writer.py','lab/observer/vm_w3_load.py','lab/observer/test_syncwitness.py','lab/observer/test_engine.mjs','lab/observer/test_round10.py','lab/observer/test_round11.py','lab/observer/vm_clockcheck.py','lab/observer/vm_clockprobe.bt','lab/observer/bpftrace-image/Dockerfile','lab/experiments/EXP-OBS01/round9/probe_round9.py','lab/observer/vm_normalizer.py','lab/observer/vm_watch.py','lab/observer/vm_fixture.py','lab/observer/vm_verify.py','lab/observer/test_vm.py','lab/observer/run_vm_offline.py','lab/observer/collector.py','lab/observer/capture.py','lab/observer/verify_seal.py']
    pins={p:sha((ROOT/p).read_bytes()) for p in paths}
    for path in paths:
        target=out/'source'/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/path).read_bytes())
    result={'format':'obs01-r6-offline-gate/1','status':'FAILED','sourceSha256':pins,'startedAtUnixMs':time.time_ns()//1000000,'claim':'offline synthetic gates only; no VM overhead/NS acceptance'}
    try:
        for name,argv in [('python',['python3','-B','lab/observer/test_vm.py']),('syncwitness',['python3','-B','lab/observer/test_syncwitness.py']),('round10',['python3','-B','lab/observer/test_round10.py']),('round11',['python3','-B','lab/observer/test_round11.py']),('engine',['node','--test','lab/observer/test_engine.mjs']),('round12',['node','--test','lab/observer/test_round12.mjs'])]:
            process=subprocess.run(argv,cwd=ROOT,capture_output=True,timeout=300,env={**os.environ,'VM_TEST_EVIDENCE_DIR':str(out)})
            (out/(name+'.stdout')).write_bytes(process.stdout);(out/(name+'.stderr')).write_bytes(process.stderr)
            print(name,process.returncode,flush=True)
            if process.returncode:raise RuntimeError(name+' gate failed')
        if any(sha((ROOT/p).read_bytes())!=v for p,v in pins.items()):raise RuntimeError('source drift')
        result['status']='PASS'
    finally:
        result['finishedAtUnixMs']=time.time_ns()//1000000
        (out/'RESULT.json').write_text(json.dumps(result,sort_keys=True)+'\n')
        (out/'SHA256SUMS').write_text('\n'.join(sha(p.read_bytes())+'  '+str(p.relative_to(out)) for p in sorted(out.rglob('*')) if p.is_file())+'\n')
if __name__=='__main__':main()

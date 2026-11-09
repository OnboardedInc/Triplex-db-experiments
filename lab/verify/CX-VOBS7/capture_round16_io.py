#!/usr/bin/env python3
"""Capture the isolated actual-harness WAL-copy fault fixture with fresh source/input hashes."""
import hashlib
import json
from pathlib import Path
import subprocess
import time
ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'round16'
def sha(b):return hashlib.sha256(b).hexdigest()
paths=['lab/bin/sync-witness.mjs','lab/observer/vm_w4_judge.py','lab/observer/vm_normalizer.py','lab/observer/vm_fixture.py','lab/observer/test_w4.py',
    'lab/verify/CX-VOBS7/review_round16_w4_io.mjs','lab/verify/CX-VOBS7/capture_round16_io.py']
pins={p:sha((ROOT/p).read_bytes()) for p in paths}
argv=['node','--test',str(HERE/'review_round16_w4_io.mjs')]
r={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'startedNs':time.time_ns(),'sourceSha256':pins,'argv':argv}
c=subprocess.run(argv,cwd=ROOT,capture_output=True,timeout=120)
(OUT/'w4-io.stdout').write_bytes(c.stdout);(OUT/'w4-io.stderr').write_bytes(c.stderr)
r.update({'exit':c.returncode,'stdoutSha256':sha(c.stdout),'stderrSha256':sha(c.stderr),'finishedNs':time.time_ns(),
    'sourceUnchanged':all(sha((ROOT/p).read_bytes())==v for p,v in pins.items())})
(OUT/'W4-IO-RUN.json').write_text(json.dumps(r,indent=2,sort_keys=True)+'\n')
assert r['sourceUnchanged']
(OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(OUT))+'\n' for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))
print('actual-harness I/O refusal fixture exit:',c.returncode)

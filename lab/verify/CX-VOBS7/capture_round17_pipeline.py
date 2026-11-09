#!/usr/bin/env python3
"""Capture the final two pipeline reproductions and verify earlier sources/evidence remained unchanged."""
import hashlib
import json
from pathlib import Path
import subprocess
import time
ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
OUT=HERE/'round17'
def sha(b):return hashlib.sha256(b).hexdigest()
original=json.loads((OUT/'RUN.json').read_text())
pins=original['sourceSha256']
for p,h in pins.items():assert sha((ROOT/p).read_bytes())==h,p
for p in [Path(__file__),HERE/'test_round17_pipeline.py']:pins[str(p.relative_to(ROOT))]=sha(p.read_bytes())
argv=['python3','-B',str(HERE/'test_round17_pipeline.py')]
result={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'startedNs':time.time_ns(),'argv':argv,'sourceSha256':pins}
c=subprocess.run(argv,cwd=ROOT,capture_output=True,timeout=120)
(OUT/'pipeline.stdout').write_bytes(c.stdout);(OUT/'pipeline.stderr').write_bytes(c.stderr)
result.update({'exit':c.returncode,'stdoutSha256':sha(c.stdout),'stderrSha256':sha(c.stderr),'finishedNs':time.time_ns(),
    'sourceUnchanged':all(sha((ROOT/p).read_bytes())==h for p,h in pins.items())})
assert result['sourceUnchanged']
(OUT/'PIPELINE-RUN.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
(OUT/'SHA256SUMS').write_text(''.join(sha(p.read_bytes())+'  '+str(p.relative_to(OUT))+'\n' for p in sorted(OUT.rglob('*')) if p.is_file() and p.name!='SHA256SUMS'))
print('pipeline refusal assertions exit:',c.returncode)

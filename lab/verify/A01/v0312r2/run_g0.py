"""Fresh source-bound offline G0 execution; retain the exact new receipt and objects."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
HERE = Path(__file__).resolve().parent
ROOT = HERE/'scratch'
assert shutil.disk_usage(ROOT).free >= 5*1024**3
assert not (HERE/'G0-execution.json').exists()
before=set((ROOT/'lab/runs/G0').glob('*.json'))
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
argv=['node','lab/bin/gate.mjs','G0','--lane','xtdb','--exp','CX-VA01-0312R2','--previous','G0-xtdb-20261109T003626Z-7069fe','--note','Independent contract rounds 2-3 delta; fresh offline G0; seven exact live skips audited separately']
env=dict(os.environ)
for key in ('XTDB_INTEGRATION','QLEVER_INTEGRATION','TRIPLEX_COMMIT_ENCODING'):env.pop(key,None)
env['PATH']=str(ROOT/'lab/experiments/EXP-X02-xtql-parity/round2/bin')+os.pathsep+env['PATH']
start=time.time()
with (HERE/'G0.log').open('xb') as out:
 r=subprocess.run(argv,cwd=ROOT,env=env,stdout=out,stderr=subprocess.STDOUT)
end=time.time()
new=set((ROOT/'lab/runs/G0').glob('*.json'))-before
assert len(new)==1,new
path=new.pop();receipt=json.loads(path.read_bytes())
# [CX-VA01-0312R2] Why: a zero exit is insufficient; require fresh exact-source full-scope counts and rehash every retained object. Rejected: adopting the builder's historical PASS receipt.
assert r.returncode==0 and receipt['verdict']=='PASS' and receipt['scope']=='full',receipt.get('reasons')
assert receipt['counts']=={'executed':1168,'pass':1168,'fail':0,'skip':137,'expectedSkip':137,'unexpectedSkip':0},receipt['counts']
(HERE/'G0-receipt.json').write_bytes(path.read_bytes())
shutil.copytree(ROOT/'runs/G0'/receipt['runId'],HERE/'G0-raw')
(HERE/'G0-execution.json').write_text(json.dumps({'head':head,'argv':argv,'exit':r.returncode,'start':start,'end':end,'receipt':str(path.relative_to(ROOT)),'runId':receipt['runId'],'unsetFlags':['XTDB_INTEGRATION','QLEVER_INTEGRATION','TRIPLEX_COMMIT_ENCODING'],'shim':'unchanged lab/experiments/EXP-X02-xtql-parity/round2/bin/pnpm'},indent=2)+'\n')
print('G0 raw results retained; independent receipt/object audit still required',flush=True)

"""Preserve Datomic's current built bytes, then capture XTDB immediately after one justified rerun."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
HERE=Path(__file__).resolve().parent;S=json.loads((HERE/'source.json').read_bytes());R=HERE/'scratch';RAW=Path(S['raw'])
def capture(tag):
 manifest=json.loads((RAW/(tag+'-raw')/'build-manifest.json').read_bytes())
 dest=RAW/(tag+'-built');dest.mkdir()
 for package in manifest['packages'].values():
  for item in package['list']:
   data=(R/item['path']).read_bytes()
   assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256'],item['path']
   out=dest/item['path'];out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
# [CX-VA01-0313] Why: later builds overwrite declaration outputs, so retain the actual bytes against each attempt's own manifest. Rejected: claiming the first attempt's .d.ts bytes were independently rehashed after replacement.
capture('G0-datomic')
assert shutil.disk_usage(R).free>=5*1024**3
before=set((R/'lab/runs/G0').glob('*.json'))
previous=json.loads((RAW/'G0-xtdb-receipt.json').read_bytes())['runId']
env=dict(os.environ)
for k in ('DATOMIC_INTEGRATION','XTDB_INTEGRATION','QLEVER_INTEGRATION','TRIPLEX_COMMIT_ENCODING'):env.pop(k,None)
env['PATH']=str(R/'lab/experiments/EXP-A01-acceptance-contract/bin')+os.pathsep+env['PATH']
argv=['node','lab/bin/heavy.mjs','--label','CX-VA01-0313-G0-xtdb-recapture','--','node','lab/bin/gate.mjs','G0','--lane','xtdb','--exp','CX-VA01-0313','--previous',previous,'--note','Evidence capture rerun: prior XTDB PASS declaration outputs were overwritten by subsequent Datomic build; no source or expectation changed']
start=time.time()
with (RAW/'G0-xtdb-recapture.log').open('xb') as out:r=subprocess.run(argv,cwd=R,env=env,stdout=out,stderr=subprocess.STDOUT)
end=time.time();paths=set((R/'lab/runs/G0').glob('*.json'))-before
(RAW/'G0-xtdb-recapture-execution.json').write_text(json.dumps({'argv':argv,'start':start,'end':end,'exit':r.returncode,'head':S['candidate'],'newReceipts':[str(p.relative_to(R)) for p in paths]},indent=2)+'\n')
assert len(paths)==1
p=paths.pop();g=json.loads(p.read_bytes());(RAW/'G0-xtdb-recapture-receipt.json').write_bytes(p.read_bytes())
shutil.copytree(R/'runs/G0'/g['runId'],RAW/'G0-xtdb-recapture-raw')
out=RAW/'G0-xtdb-recapture-objects';out.mkdir()
for item in g['objects']:
 data=(R/'runs/objects'/item['sha256']).read_bytes();assert hashlib.sha256(data).hexdigest()==item['sha256'] and len(data)==item['bytes']
 if not (out/item['sha256']).exists():(out/item['sha256']).write_bytes(data)
if r.returncode:raise SystemExit(r.returncode)
capture('G0-xtdb-recapture')
print('XTDB current-attempt receipt and complete build bytes captured',g['runId'],flush=True)

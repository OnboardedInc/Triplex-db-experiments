"""Run offline XTDB then Datomic G0, each directly inside its own heavy admission."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
HERE=Path(__file__).resolve().parent
SOURCE=json.loads((HERE/'source.json').read_bytes())
ROOT=HERE/'scratch';RAW=Path(SOURCE['raw'])
for lane,previous in [('xtdb','G0-xtdb-20261109T031500Z-f3d20d'),('datomic','G0-datomic-20261109T031658Z-e9eea9')]:
 assert shutil.disk_usage(ROOT).free>=5*1024**3
 before=set((ROOT/'lab/runs/G0').glob('*.json'))
 env=dict(os.environ)
 for key in ('DATOMIC_INTEGRATION','XTDB_INTEGRATION','QLEVER_INTEGRATION','TRIPLEX_COMMIT_ENCODING'):env.pop(key,None)
 env['PATH']=str(ROOT/'lab/experiments/EXP-A01-acceptance-contract/bin')+os.pathsep+env['PATH']
 # [CX-VA01-0313] Why: gate.mjs must be the direct child of its grant holder for inherited admission; preserve exact current raw objects before reusable lock paths change. Rejected: nesting a second grant inside a Python-held heavy slot.
 argv=['node','lab/bin/heavy.mjs','--label','CX-VA01-0313-G0-'+lane,'--','node','lab/bin/gate.mjs','G0','--lane',lane,'--exp','CX-VA01-0313','--previous',previous,'--note','Independent candidate 6b8d218 offline review; current-main merge blocked separately']
 start=time.time()
 with (RAW/('G0-'+lane+'.log')).open('xb') as out:r=subprocess.run(argv,cwd=ROOT,env=env,stdout=out,stderr=subprocess.STDOUT)
 end=time.time()
 paths=set((ROOT/'lab/runs/G0').glob('*.json'))-before
 record={'argv':argv,'start':start,'end':end,'exit':r.returncode,'head':SOURCE['candidate'],'newReceipts':[str(p.relative_to(ROOT)) for p in paths]}
 (RAW/('G0-'+lane+'-execution.json')).write_text(json.dumps(record,indent=2)+'\n')
 assert len(paths)==1,record
 path=paths.pop();receipt=json.loads(path.read_bytes())
 (RAW/('G0-'+lane+'-receipt.json')).write_bytes(path.read_bytes())
 shutil.copytree(ROOT/'runs/G0'/receipt['runId'],RAW/('G0-'+lane+'-raw'))
 objects=RAW/('G0-'+lane+'-objects');objects.mkdir()
 for item in receipt['objects']:
  data=(ROOT/'runs/objects'/item['sha256']).read_bytes()
  assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256'],item
  dest=objects/item['sha256']
  if not dest.exists():dest.write_bytes(data)
 print(lane,'exit',r.returncode,'raw receipt',receipt['runId'],flush=True)
 if r.returncode:raise SystemExit(r.returncode)

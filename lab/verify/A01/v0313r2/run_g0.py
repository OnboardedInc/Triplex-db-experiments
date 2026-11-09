"""Run offline XTDB then Datomic G0, each directly inside its own heavy admission."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import subprocess
import time
HERE=Path(__file__).resolve().parent
SOURCE=json.loads((HERE/'source.json').read_bytes())
ROOT=HERE/'scratch';RAW=Path(SOURCE['raw'])
assert sys.argv[1:] in ([],['datomic'])
for lane,previous in [('xtdb','G0-xtdb-20261109T041735Z-a76820'),('datomic','G0-datomic-20261109T042314Z-f3030c')]:
 if sys.argv[1:] and lane!=sys.argv[1]:continue
 assert shutil.disk_usage(ROOT).free>=5*1024**3
 assert subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'],cwd=ROOT,text=True).strip()=='/Users/sam/projects/triplex-db-2/.git'
 before=set((ROOT/'lab/runs/G0').glob('*.json'))
 env=dict(os.environ)
 for key in ('DATOMIC_INTEGRATION','XTDB_INTEGRATION','QLEVER_INTEGRATION','TRIPLEX_COMMIT_ENCODING'):env.pop(key,None)
 env['TX2_CONFIG_DIR']=str(ROOT)
 env['PATH']=str(ROOT/'lab/experiments/EXP-A01-acceptance-contract/bin')+os.pathsep+env['PATH']
 # [CX-VA01-0313-R2] Why: gate.mjs must be the direct child of its grant holder for inherited admission; preserve exact current raw objects before reusable lock paths change. Rejected: nesting a second grant inside a Python-held heavy slot.
 argv=['node','lab/bin/heavy.mjs','--label','CX-VA01-0313-R2-G0-'+lane,'--','node','lab/bin/gate.mjs','G0','--lane',lane,'--exp','CX-VA01-0313-R2','--previous',previous,'--note','Independent merged-tree round 2 offline G0; linked worktree corrects prior clone-local store/lock derivation; exact source unchanged']
 if lane=='datomic':argv[-1]='One full unchanged Datomic rerun after inherited round3 retired-store test exceeded its unchanged 5000ms timeout; first failure retained; no assertions, skips or deadlines changed'
 start=time.time()
 with (RAW/('G0-'+lane+'.log')).open('xb') as out:r=subprocess.run(argv,cwd=ROOT,env=env,stdout=out,stderr=subprocess.STDOUT)
 end=time.time()
 paths=set((ROOT/'lab/runs/G0').glob('*.json'))-before
 record={'argv':argv,'start':start,'end':end,'exit':r.returncode,'head':SOURCE['testHead'],'newReceipts':[str(p.relative_to(ROOT)) for p in paths]}
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
 built=RAW/('G0-'+lane+'-built');built.mkdir()
 build=json.loads((RAW/('G0-'+lane+'-raw')/'build-manifest.json').read_bytes())
 for info in build['packages'].values():
  for item in info['list']:
   data=(ROOT/item['path']).read_bytes();assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256']
   dest=built/item['path'];dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
 print(lane,'exit',r.returncode,'raw receipt',receipt['runId'],flush=True)
 if r.returncode:raise SystemExit(r.returncode)

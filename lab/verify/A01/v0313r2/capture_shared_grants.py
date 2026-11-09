"""Retain observed shared-pool owner bytes while this attempt's G0 children run."""
import hashlib,json,re,time
from pathlib import Path
H=Path(__file__).resolve().parent;S=json.loads((H/'source.json').read_bytes());RAW=Path(S['raw']);DEST=RAW/'shared-grants';DEST.mkdir(exist_ok=True)
# [CX-VA01-0313-R2] Why: shared pool owner paths are reusable, so copy the actual current bytes during the matching run instead of auditing a later occupant. Rejected: treating the failed clone's private pool as lab admission.
end=time.time()+1800
while time.time()<end:
 runids=[]
 for lane in ['xtdb','datomic']:
  p=RAW/('G0-'+lane+'.log')
  if p.exists():runids+=re.findall(r'\[lab\] (G0-[^: ]+): raw output',p.read_text())
 for p in Path('/Users/sam/projects/triplex-db-2/lab/locks/heavy').glob('*/owner.json'):
  try:data=p.read_bytes();owner=json.loads(data)
  except (FileNotFoundError,json.JSONDecodeError):continue
  label=owner.get('label','')
  if not (label.startswith('CX-VA01-0313-R2-G0-') or any(label.startswith(r+' ') for r in runids)):continue
  digest=hashlib.sha256(data).hexdigest();dest=DEST/(digest+'.json')
  if not dest.exists():
   dest.write_bytes(data)
   (DEST/(digest+'-observation.json')).write_text(json.dumps({'observedAt':time.time(),'path':str(p),'sha256':digest,'sourceHead':S['testHead'],'owner':owner},indent=2)+'\n')
 if (RAW/'G0-datomic-execution.json').exists():break
 time.sleep(1)
else:raise SystemExit('shared grant observation deadline; no qualification inferred')
print('Retained current-attempt shared admission bytes')

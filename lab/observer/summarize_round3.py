#!/usr/bin/env python3
# [EXP-OBS01] Why: separate source/cleanup evidence from semantic and guard verdict denominators.
# Rejected: counting a successful helper process as a passed observation protocol.
import hashlib
import json
from pathlib import Path
base=Path(__file__).resolve().parents[1]/'experiments/EXP-OBS01/round3';source=Path('/Users/sam/projects/triplex-db-2/runs/engines/observers')
rows=json.loads((base/'cli-results-final.json').read_bytes());runs=[]
for root in sorted(source.glob('obs01-r3-*')):
 if not root.is_dir():continue
 before=root/'resident-before.json';after=root/'resident-after.json'
 row={'runId':root.name,'sealed':(root/'output/bundle/seal.json').exists(),'retainedContext':(root/'retention.json').exists(),'afterReceipt':after.exists()}
 if before.exists() and after.exists():
  a=json.loads(before.read_bytes());b=json.loads(after.read_bytes())
  def select(x):return {'id':x['Id'],'config':x['Config'],'hostConfig':x['HostConfig'],'mounts':sorted(x['Mounts'],key=lambda m:m['Destination']),'startedAt':x['State']['StartedAt']}
  row['residentUnchanged']=select(a)==select(b);row['residentId']=a['Id']
 else:row['precollectionRefusal']=True
 runs.append(row)
selected=[r for r in rows if r['mode']=='selected'];negative=[r for r in rows if r['mode']!='selected']
result={'qualification':'screening-only; incomplete positive protocol coverage','protocols':selected,'selectedCounts':{v:sum(r['verdict']==v for r in selected) for v in ('PASS','FAIL','REFUSED')},'guardNegatives':len(negative),'guardRefusals':sum(r['verdict']=='REFUSED' and r['exit']==2 for r in negative),'attempts':runs,'noExclusiveSlots':True,'noVolumesCreated':True}
(base/'summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ('protocols','attempts')}))

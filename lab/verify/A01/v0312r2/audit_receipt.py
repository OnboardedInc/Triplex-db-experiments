"""Independently validate fresh G0 content, attempt times, source and object bindings."""
from datetime import datetime
import hashlib
import json
from pathlib import Path
import subprocess
HERE=Path(__file__).resolve().parent
ROOT=HERE/'scratch'
e=json.loads((HERE/'G0-execution.json').read_bytes())
r=json.loads((HERE/'G0-receipt.json').read_bytes())
source=json.loads((HERE/'source.json').read_bytes())
assert e['exit']==0 and r['verdict']=='PASS' and r['scope']=='full'
assert r['counts']=={'executed':1168,'pass':1168,'fail':0,'skip':137,'expectedSkip':137,'unexpectedSkip':0}
assert r['git']['head']==e['head']==source['merge']
assert r['git']['diffBytes']==0 and not r['git']['modifiedFiles'] and not r['git']['untrackedFiles']
assert r['slot'] is None and r['lane']=='xtdb' and r['gate']=='G0' and r['experiment']=='CX-VA01-0312R2'
assert r['runId']==e['runId'] and r['runId']!='G0-xtdb-20261109T003626Z-7069fe'
assert e['start']-1<=datetime.fromisoformat(r['startedAt'].replace('Z','+00:00')).timestamp()<=e['end']
assert e['start']<=datetime.fromisoformat(r['endedAt'].replace('Z','+00:00')).timestamp()<=e['end']+1
assert not r['reasons'] and all(s['code']==0 and not s['timedOut'] for s in r['steps'])
objects=[]
for obj in r['objects']:
 data=(ROOT/obj['path']).read_bytes()
 assert len(data)==obj['bytes'] and hashlib.sha256(data).hexdigest()==obj['sha256'],obj['path']
 if obj['path'].startswith('runs/G0/'+r['runId']+'/'):
  assert data==(HERE/'G0-raw'/Path(obj['path']).name).read_bytes()
 objects.append({'path':obj['path'],'bytes':len(data),'sha256':obj['sha256']})
# [CX-VA01-0312R2] Why: prove the seven new expected skips are actual gated test cases, not invented inventory. Rejected: counting manifest strings without test outcomes.
audit=json.loads((HERE/'delta-audit.json').read_bytes())
statuses={}
for package in ('core','testkit','xtdb','qualification'):
 report=json.loads((HERE/'G0-raw'/('vitest-'+package+'.json')).read_bytes())
 for suite in report['testResults']:
  path=str(Path(suite['name']).relative_to(ROOT))
  for test in suite.get('assertionResults',[]):statuses[path+' :: '+test['fullName']]=test['status']
for items in audit['skipAdditions'].values():
 for name in items:assert statuses[name] in ('pending','skipped','disabled'),(name,statuses.get(name))
manifest=json.loads((HERE/'G0-raw/build-manifest.json').read_bytes())
for pkg,info in manifest['packages'].items():
 for item in info['list']:
  data=(ROOT/item['path']).read_bytes()
  assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256']
(HERE/'G0-object-audit.json').write_text(json.dumps({'runId':r['runId'],'source':r['git'],'execution':e,'objects':objects,'newExpectedSkips':{n:statuses[n] for v in audit['skipAdditions'].values() for n in v},'buildManifestObjectsVerified':sum(len(x['list']) for x in manifest['packages'].values()),'contentFreshnessBindingChecked':True},indent=2)+'\n')
print('G0 content/freshness/binding: exact counts, current attempt interval/source/offline slot, all object and built-file hashes, seven actual live-test skips')

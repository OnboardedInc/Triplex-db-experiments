"""Re-judge current-attempt bytes and binding; never grant the conflicted merge a PASS."""
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
HERE=Path(__file__).resolve().parent;S=json.loads((HERE/'source.json').read_bytes());R=HERE/'scratch';RAW=Path(S['raw'])
def sha(b):return hashlib.sha256(b).hexdigest()
def epoch(s):return datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()==S['candidate']
commands=[]
for mode in ('contract','evaluator','mutations','install','final'):
 rows=json.loads((RAW/(mode+'-results.json')).read_bytes());assert rows
 for x in rows:
  assert x['exit']==0 and x['head']==S['candidate'] and S['started']<=x['start']<=x['end']<=time.time()
  assert sha((RAW/(x['label']+'.log')).read_bytes())==x['logSha256']
 commands+=rows
log=(RAW/'evaluator-candidate.log').read_text()
counts={k:int(re.search(r'^# '+k+r' (\d+)$',log,re.M)[1]) for k in ('tests','pass','fail','skipped','cancelled','todo')}
assert counts=={'tests':108,'pass':108,'fail':0,'skipped':0,'cancelled':0,'todo':0}
assert len(re.findall(r'^ok \d+ - ',log,re.M))==108
for label,count in [('contract',18),('payload',5)]:
 log=(RAW/(label+'.log')).read_text();assert re.search(r'Ran '+str(count)+r' tests?\b',log) and re.search(r'^OK$',log,re.M)
log=(RAW/'js-policy.log').read_text();assert all('# '+k+' '+str(v) in log for k,v in {'tests':3,'pass':3,'fail':0,'skipped':0}.items())
for label in ('verify-before','verify-final'):
 log=(RAW/(label+'.log')).read_text()
 assert 'second regeneration byte-identical' in log
 for name in ('oracle-contract.json','obligations.json','load-contract.json','budgets.json','capability-matrix.md','ACCEPTANCE.md'):
  assert 'verify '+name+': '+sha((R/'lab/acceptance'/name).read_bytes()) in log
assert 'Q47d external test: PASS' in (RAW/'q47d.log').read_text()
mutation=json.loads((RAW/'mutations.json').read_bytes());assert mutation['run']==494 and mutation['catalog']==582 and len(mutation['retired'])==88
for x in mutation['records']:
 text=(x['stdout']+x['stderr']).strip();assert x['exit']!=0 and text.startswith('CONTRACT INVALID:') and 'Traceback (most recent call last)' not in text,x['name']
gates=[]
for lane,passed,skipped in [('xtdb',1218,137),('datomic',1253,66)]:
 tag='G0-xtdb-recapture' if lane=='xtdb' else 'G0-datomic'
 e=json.loads((RAW/(tag+'-execution.json')).read_bytes());g=json.loads((RAW/(tag+'-receipt.json')).read_bytes())
 assert e['exit']==0 and e['head']==S['candidate'] and g['git']['head']==S['candidate']
 assert S['started']<=e['start']<=epoch(g['startedAt'])<=epoch(g['endedAt'])<=e['end']+1
 assert g['gate']=='G0' and g['lane']==lane and g['slot'] is None and g['experiment']=='CX-VA01-0313'
 assert g['scope']=='full' and g['verdict']=='PASS' and not g['reasons']
 assert g['counts']=={'executed':passed,'pass':passed,'fail':0,'skip':skipped,'expectedSkip':skipped,'unexpectedSkip':0}
 assert g['git']['diffBytes']==0 and not g['git']['modifiedFiles'] and not g['git']['untrackedFiles']
 assert all(s['code']==0 and not s['timedOut'] for s in g['steps'])
 objects=[]
 for obj in g['objects']:
  data=(RAW/(tag+'-objects')/obj['sha256']).read_bytes()
  assert len(data)==obj['bytes'] and sha(data)==obj['sha256']
  if obj['role']=='heavy-parent-grant':assert json.loads(data)['label']=='CX-VA01-0313-'+tag
  objects.append({'path':obj['path'],'role':obj['role'],'bytes':obj['bytes'],'sha256':obj['sha256']})
 build=json.loads((RAW/(tag+'-raw')/'build-manifest.json').read_bytes())
 for info in build['packages'].values():
  for item in info['list']:
   data=(RAW/(tag+'-built')/item['path']).read_bytes();assert len(data)==item['bytes'] and sha(data)==item['sha256']
 gates.append({'lane':lane,'runId':g['runId'],'counts':g['counts'],'source':g['git'],'artifactTag':tag,'objects':objects,'builtFiles':sum(len(v['list']) for v in build['packages'].values())})
paths=['lab/acceptance/build_contract.py','lab/acceptance/RULINGS.md','lab/acceptance/RULINGS-PENDING.md','lab/acceptance/obligations.json','lab/config/slots.json','packages/testkit/src/index.ts','lab/bin/gate.mjs','lab/bin/claim.mjs','lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs','pnpm-lock.yaml']
hashes={}
for p in paths:
 data=(R/p).read_bytes();assert data==subprocess.check_output(['git','show',S['candidate']+':'+p],cwd=R);hashes[p]=sha(data)
# [CX-VA01-0313] Why: standalone success cannot certify a different, unresolved current-main merge. Rejected: reporting candidate 108/108 as the required merged-tree result.
assert S['mergeExit']==1 and S['conflicts']==['lab/bin/gate.mjs']
(HERE/'result-audit.json').write_text(json.dumps({'candidate':S['candidate'],'main':S['main'],'candidateEvaluator':counts,'currentMainMergeEvaluator':'NOT RUN: real merge conflicts in lab/bin/gate.mjs','commands':commands,'g0':gates,'sourceHashes':hashes,'mutations':494,'verdict':'FIX-FIRST: merged-tree Q87 gate blocked'},indent=2)+'\n')
print('Fresh standalone results content/source/attempt verified; merged-tree Q87 remains blocked, not certified')

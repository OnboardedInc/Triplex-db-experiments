"""Audit fresh merged-tree content, freshness and exact source/lane/input bindings."""
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
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()==S['testHead']
commands=[]
for mode in ('contract','evaluator','evaluator-linked','mutations','install','final','boundary-recheck'):
 rows=json.loads((RAW/(mode+'-results.json')).read_bytes());assert rows
 for x in rows:
  assert x['exit']==(1 if x['label']=='boundaries' else 0) and x['head']==S['testHead'] and S['started']<=x['start']<=x['end']<=time.time()
  assert sha((RAW/(x['label']+'.log')).read_bytes())==x['logSha256']
 commands+=rows
log=(RAW/'evaluator-linked.log').read_text()
counts={k:int(re.search(r'^# '+k+r' (\d+)$',log,re.M)[1]) for k in ('tests','pass','fail','skipped','cancelled','todo')}
assert counts=={'tests':108,'pass':108,'fail':0,'skipped':0,'cancelled':0,'todo':0}
assert len(re.findall(r'^ok \d+ - ',log,re.M))==108
for label,count in [('contract',18),('payload',5)]:
 log=(RAW/(label+'.log')).read_text();assert re.search(r'Ran '+str(count)+r' tests?\b',log) and re.search(r'^OK$',log,re.M)
log=(RAW/'js-policy.log').read_text();assert all('# '+k+' '+str(v) in log for k,v in {'tests':7,'pass':7,'fail':0,'skipped':0}.items())
first=(RAW/'boundaries.log').read_text();assert '# pass 4' in first and '# fail 1' in first and 'XTDB_SOURCE_PLAN' in first
log=(RAW/'boundaries-recheck.log').read_text();assert all('# '+k+' '+str(v) in log for k,v in {'tests':5,'pass':5,'fail':0,'skipped':0}.items())
for label in ('verify-before','verify-final'):
 log=(RAW/(label+'.log')).read_text()
 assert 'second regeneration byte-identical' in log
 for name in ('oracle-contract.json','obligations.json','load-contract.json','budgets.json','capability-matrix.md','ACCEPTANCE.md'):
  assert 'verify '+name+': '+sha((R/'lab/acceptance'/name).read_bytes()) in log
assert 'Q47d external test: PASS' in (RAW/'q47d.log').read_text()
mutation=json.loads((RAW/'mutations.json').read_bytes());assert mutation['run']==494 and mutation['catalog']==582 and len(mutation['retired'])==88
for x in mutation['records']:
 text=(x['stdout']+x['stderr']).strip();assert x['exit']!=0 and text.startswith('CONTRACT INVALID:') and 'Traceback (most recent call last)' not in text,x['name']
first=json.loads((RAW/'G0-xtdb-first-receipt.json').read_bytes())
firstExec=json.loads((RAW/'G0-xtdb-first-execution.json').read_bytes())
assert first['verdict']=='FAIL' and firstExec['exit']==1 and first['git']['head']==S['testHead']
assert first['counts']['fail']==1 and 'Unexpected store' in (RAW/'G0-xtdb-first-raw/build.stderr.txt').read_text()
assert 'Cannot find module' in (RAW/'G0-xtdb-first-raw/vitest-qualification.json').read_text()
for obj in first['objects']:
 data=(RAW/'G0-xtdb-first-objects'/obj['sha256']).read_bytes();assert len(data)==obj['bytes'] and sha(data)==obj['sha256']
dFirst=json.loads((RAW/'G0-datomic-first-receipt.json').read_bytes())
assert dFirst['verdict']=='FAIL' and dFirst['counts']=={'executed':1253,'pass':1252,'fail':1,'skip':66,'expectedSkip':66,'unexpectedSkip':0}
failed=[]
for p in (RAW/'G0-datomic-first-raw').glob('vitest-*.json'):
 for suite in json.loads(p.read_bytes())['testResults']:
  failed.extend(test for test in suite['assertionResults'] if test['status']=='failed')
assert len(failed)==1 and failed[0]['fullName']=='round3: retired stores cannot omit policies/cuts or silently decline purge execution'
assert 'Test timed out in 5000ms.' in '\n'.join(failed[0]['failureMessages'])
p='packages/testkit/test/route-equivalence-round3.test.ts'
assert (R/p).read_bytes()==subprocess.check_output(['git','show','6b8d218:'+p],cwd=R)
for obj in dFirst['objects']:
 data=(RAW/'G0-datomic-first-objects'/obj['sha256']).read_bytes();assert len(data)==obj['bytes'] and sha(data)==obj['sha256']
for info in json.loads((RAW/'G0-datomic-first-raw/build-manifest.json').read_bytes())['packages'].values():
 for item in info['list']:
  data=(RAW/'G0-datomic-first-built'/item['path']).read_bytes();assert len(data)==item['bytes'] and sha(data)==item['sha256']
shared=[]
for p in (RAW/'shared-grants').glob('*-observation.json'):
 obs=json.loads(p.read_bytes());data=(p.parent/(obs['sha256']+'.json')).read_bytes()
 assert sha(data)==obs['sha256'] and json.loads(data)==obs['owner'] and obs['sourceHead']==S['testHead']
 assert Path(obs['path']).parent.parent==Path('/Users/sam/projects/triplex-db-2/lab/locks/heavy')
 shared.append(obs)
gates=[]
for lane,passed,skipped in [('xtdb',1218,137),('datomic',1253,66)]:
 tag='G0-'+lane
 e=json.loads((RAW/(tag+'-execution.json')).read_bytes());g=json.loads((RAW/(tag+'-receipt.json')).read_bytes())
 if lane=='datomic':assert g['previous']==dFirst['runId'] and g['git']['sourceTreeId']==dFirst['git']['sourceTreeId']
 if lane=='xtdb':assert g['previous']==first['runId'] and g['git']['sourceTreeId']==first['git']['sourceTreeId']
 assert any(o['owner']['label']=='CX-VA01-0313-R2-G0-'+lane and e['start']<=o['observedAt']<=e['end'] and e['start']<=epoch(o['owner']['at'])<=e['end'] for o in shared)
 assert g['toolchain']['pnpm']=='10.11.0'
 assert e['exit']==0 and e['head']==S['testHead'] and g['git']['head']==S['testHead']
 assert S['started']<=e['start']<=epoch(g['startedAt'])<=epoch(g['endedAt'])<=e['end']+1
 assert g['gate']=='G0' and g['lane']==lane and g['slot'] is None and g['experiment']=='CX-VA01-0313-R2'
 assert g['scope']=='full' and g['verdict']=='PASS' and not g['reasons'] and not g['firstFailures']
 assert g['counts']=={'executed':passed,'pass':passed,'fail':0,'skip':skipped,'expectedSkip':skipped,'unexpectedSkip':0}
 assert g['git']['diffBytes']==0 and not g['git']['modifiedFiles'] and not g['git']['untrackedFiles']
 assert all(s['code']==0 and not s['timedOut'] for s in g['steps'])
 raw=RAW/(tag+'-raw')
 expected=json.loads((R/'lab/config/g0-expected-skips.json').read_bytes())['skips']
 semanticPass=0;semanticSkip=0;observed={}
 for pkg in ['core','testkit',lane,'qualification']:
  report=json.loads((raw/('vitest-'+pkg+'.json')).read_bytes());assert report['success'] is True
  assert e['start']<=report['startTime']/1000<=e['end']
  pcount=0;skips=[]
  for suite in report['testResults']:
   assert suite['status']!='failed'
   rel=str(Path(suite['name']).relative_to(R))
   for test in suite['assertionResults']:
    if test['status']=='passed':pcount+=1
    else:
     assert test['status'] in ('pending','skipped','todo'),test
     key=rel+' :: '+test['fullName'];assert key in expected[pkg],key;skips.append(key)
  assert report['numPassedTests']==pcount and report['numFailedTests']==0 and report['numPendingTests']==len(skips)
  assert report['numTotalTests']==pcount+len(skips)
  semanticPass+=pcount;semanticSkip+=len(skips);observed[pkg]=skips
 assert json.loads((raw/'observed-skips.json').read_bytes())==observed
 for name in ['node-test-qualification','node-test-engine-cases','node-test-ns-bench']:
  text=(raw/(name+'.stdout.txt')).read_text()
  fields={key:int(re.search(r'^# '+key+r' (\d+)$',text,re.M)[1]) for key in ['tests','pass','fail','cancelled','skipped','todo']}
  assert fields['tests']==fields['pass'] and all(fields[key]==0 for key in ['fail','cancelled','skipped','todo'])
  assert len(re.findall(r'^ok \d+ - ',text,re.M))==fields['pass']
  semanticPass+=fields['pass']
 packet=json.loads((raw/'oracle-validate-workloads.stdout.txt').read_bytes())
 assert packet['result']=='PASS' and packet['checked_cases']==71 and not packet['unchecked_case_ids'];semanticPass+=71
 text=(raw/'oracle-unittest.stderr.txt').read_text();assert re.search(r'^OK$',text,re.M)
 semanticPass+=int(re.search(r'^Ran (\d+) tests?',text,re.M)[1])
 assert semanticPass==passed and semanticSkip==skipped
 objects=[]
 for obj in g['objects']:
  data=(RAW/(tag+'-objects')/obj['sha256']).read_bytes()
  assert len(data)==obj['bytes'] and sha(data)==obj['sha256']
  prefix='runs/G0/'+g['runId']+'/'
  if obj['path'].startswith(prefix):assert (raw/obj['path'][len(prefix):]).read_bytes()==data
  if obj['role']=='heavy-parent-grant':assert json.loads(data)['label']=='CX-VA01-0313-R2-'+tag
  objects.append({'path':obj['path'],'role':obj['role'],'bytes':obj['bytes'],'sha256':obj['sha256']})
 build=json.loads((RAW/(tag+'-raw')/'build-manifest.json').read_bytes())
 for info in build['packages'].values():
  for item in info['list']:
   data=(RAW/(tag+'-built')/item['path']).read_bytes();assert len(data)==item['bytes'] and sha(data)==item['sha256']
 gates.append({'lane':lane,'runId':g['runId'],'counts':g['counts'],'source':g['git'],'artifactTag':tag,'objects':objects,'rawSemanticCounts':{'pass':semanticPass,'expectedSkip':semanticSkip},'builtFiles':sum(len(v['list']) for v in build['packages'].values())})
paths=['lab/acceptance/build_contract.py','lab/acceptance/RULINGS.md','lab/acceptance/RULINGS-PENDING.md','lab/acceptance/obligations.json','lab/config/slots.json','packages/testkit/src/index.ts','lab/bin/gate.mjs','lab/bin/claim.mjs','lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs','pnpm-lock.yaml']
hashes={}
for p in paths:
 data=(R/p).read_bytes();assert data==subprocess.check_output(['git','show',S['testHead']+':'+p],cwd=R);hashes[p]=sha(data)
# [CX-VA01-0313-R2] Why: only the actually executed, clean current-main merge can close Q87; exact parent code is separately audited. Rejected: importing the builder's historical 108/108 as this review's result.
for ownerPath in Path('/Users/sam/projects/triplex-db-2/lab/locks/heavy').glob('*/owner.json'):
 try:owner=json.loads(ownerPath.read_bytes())
 except FileNotFoundError:continue
 assert not owner.get('label','').startswith('CX-VA01-0313-R2-G0-'),owner
assert S['mergeExit']==0 and S['testVsCandidate']==['lab/NOTEBOOK.md','lab/STATE.md']
assert json.loads((HERE/'merge-audit.json').read_bytes())['testHead']==S['testHead']
assert json.loads((HERE/'mutation-summary.json').read_bytes())['caughtAtIntendedGuard']==494
(HERE/'result-audit.json').write_text(json.dumps({'candidate':S['candidate'],'testHead':S['testHead'],'main':S['main'],'mergedTreeEvaluator':counts,'commands':commands,'g0':gates,'sourceHashes':hashes,'mutations':494,'retainedG0Failures':[first['runId'],dFirst['runId']],'sharedAdmissionObservations':shared,'verdict':'ACCEPT'},indent=2)+'\n')
print('Fresh merged-tree results content/source/attempt verified: ACCEPT')

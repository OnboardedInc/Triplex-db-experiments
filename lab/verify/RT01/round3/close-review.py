# [CX-VRT01-R3] Why: publish a bounded verdict only after checking fresh content, source, runners and retained bytes. Rejected: adopting exit codes, a builder verdict or stale receipts as semantic acceptance.
import json,pathlib,hashlib,subprocess,re,datetime
B=pathlib.Path(__file__).resolve().parent;R=B.parents[3]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads(p.read_text())
adopted=['packages','reproductions','comparisons/attempt2','actual-property/attempt4','model-property/attempt2','journal-clock/attempt3','property-oracle'];records={}
for folder in adopted:
 p=B/folder/'execution.json';v=load(p)
 assert v['stable'] and v['exit']==0 and v['slot']=='offline-no-engine',folder
 assert v['before']==v['after'] and v['runnerBefore']==v['runnerAfter'],folder
 assert v['head']=='c801942f4394f2a2a854ef4ae1eb5bdac7b1576b' and v['product']=='4b305bc8886d4bcdd73f36be65b53fda3e1846cd'
 assert v['started'].startswith('2026-11-09') and v['attempt']
 for p,h in {**v['after'],**v['runnerAfter']}.items():assert sha(R/p)==h,p
 for p,h in v['outputs'].items():assert sha(B/folder/p)==h,(folder,p)
 records[folder]={'attempt':v['attempt'],'receiptSha256':sha(B/folder/'execution.json')}
assert not subprocess.check_output(['git','diff','--name-only','4b305bc8','HEAD','--','packages','pnpm-lock.yaml']).strip()
assert not subprocess.check_output(['git','diff','--name-only','59e07af','HEAD','--','lab/acceptance','lab/oracles/replay']).strip()
phases=load(B/'packages/phases.json');assert len(phases['results'])==14 and all(v['status']==0 for v in phases['results'])
expected={'core':(863,0),'testkit':(96,0),'xtdb':(77,91),'qlever':(38,25)}
for pkg,(passed,skipped)in expected.items():
 text=(B/'packages'/f'{pkg}-tests.txt').read_text();assert re.search(r'Tests\s+'+str(passed)+r' passed',text)
 if skipped:assert str(skipped)+' skipped' in text
# [CX-VRT01-R3] Why: bind emitted builds to unchanged source maps and to the first comparison inventory before the concurrent property attempt. Rejected: calling an untracked dist directory source evidence.
builds=load(B/'comparison-attempt1/bindings.json')['finalBuildHashes'];maps=0
for p,h in builds.items():assert sha(R/p)==h,p
for pkg in expected:
 for p in (R/'packages'/pkg/'dist').rglob('*.js.map'):
  m=load(p)
  for s,c in zip(m['sources'],m['sourcesContent'],strict=True):
   if c is not None:assert (p.parent/s).read_text()==c,(p,s);maps+=1
helpers=load(B/'reproductions/commands.json');assert len(helpers['commands'])==6 and all(c['exit']==0 for c in helpers['commands'])
for p,h in helpers['before'].items():assert sha(B/(p+'.ts'))==h,p
for p in (B/'actual-property/attempt4').glob('*-observed.json'):assert load(p)['transportSource']==sha(B/'sql-transport.ts')
for p in (B/'journal-clock/attempt3').glob('*-observed.json'):assert load(p)['transportSource']==sha(B/'sql-transport.ts')
for d,n in [('matrix',510),('pending',80)]:assert load(B/d/'summary.json')=={'scenarios':n,'observations':n,'matches':n,'mismatches':[]}
assert len(load(B/'pending-proof/summary.json'))==4
for r in load(B/'pending-proof/summary.json'):assert r['before']['error']=={'tag':'BasisNotAvailable','axis':'recordedAt'} and r['afterRows']==1 and r['elapsed']>=1900
for r in load(B/'oracle-comparisons.json')['results']:
 assert r['receiptConsistency']['status']==r['nestedReceiptConsistency']['status']=='PASS'
 assert all(r[k]for k in ['validDefaultMatches','journalMatches','hydratedTransactionsMatch','nestedJournalMatches','nestedHydratedMatches']) and all(r['negativeControls'].values())
for r in load(B/'route-comparisons.json')['results']:assert r['matches'] and r['oracleExit']==0
assert len(load(B/'route-comparisons.json')['results'])==32
for r in load(B/'pending-comparisons.json')['results']:assert r['beforeMatches'] and r['afterMatches'] and r['receiptConsistency']['status']=='PASS'
assert load(B/'journal-single-comparison.json')['matches']
model=load(B/'model-property/attempt2/results.json');assert len(model['results'])==128
assert all(not v['violations'] and v['pairs']>0 for v in model['results']);assert any(v['rule']=='HE-5'for v in model['negativeControl']['violations'])
prop=load(B/'property-comparisons.json');assert len(prop['actual'])==4 and sum(v['cuts']for v in prop['actual'])==52
assert all(all(v['matches']for v in r['comparisons'])for r in prop['actual'])
assert len(prop['journals'])==2 and all(r['matches']=={'before':True,'after':False,'restored':True}for r in prop['journals'])
oracle=load(B/'oracle/commands.json');assert all(r['exit']==0 for r in oracle['results'])
for p,h in oracle['hashes'].items():assert sha(B.parent/'oracle-050'/p)==h
assert 'Ran 403 tests' in (B/'oracle/tests.stderr').read_text() and (B/'oracle/tests.stderr').read_text().rstrip().endswith('OK')
fixtures=load(B/'oracle/fixtures.stdout');assert fixtures['status']=='PASS' and len(fixtures['fixtures'])==14
builder=R/'lab/experiments/EXP-RT01';manifestChecks=0
for p,base in [(builder/'SHA256SUMS',builder),(builder/'round3/SHA256SUMS',builder/'round3'),(builder/'round3/DURABLE-SHA256SUMS',pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round3'))]:
 for line in p.read_text().splitlines():
  h,name=line.split('  ',1);assert sha(base/name)==h,(base,name);manifestChecks+=1
integrity=load(B/'integrity.json');assert not integrity['manifestMismatches'] and not integrity['sourceMismatches'] and not integrity['acceptanceDiff'];assert len(integrity['pinDrift'])==3
assert {r['path']for r in integrity['pinDrift']}=={'packages/testkit/src/index.ts'}
assert all(r['expected']=='6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988' and r['actual']=='995bc1ace5ebb9654a74e238b8860cb7e8f012a979c7c4cf86d03388efd935c7'for r in integrity['pinDrift'])
result={'at':datetime.datetime.now(datetime.UTC).isoformat(),'verdict':'FIX-FIRST','finding':'F7: fixed-position entity journal depends on current valid-time clock','records':records,'packageTests':1074,'skippedTests':116,'packagePhases':14,'oracleTests':403,'oracleFixtures':14,'sourceMapsChecked':maps,'builderManifestFilesChecked':manifestChecks,'matrix':510,'pending':80,'model':{k:sum(v[k]for v in model['results'])for k in ['reads','pairs','refusals']},'actualPairChecks':sum(r['pairChecks']for r in prop['actual']),'actualOracleCuts':52,'liveQualified':False,'existingPinPathsMoved':['packages/testkit/src/index.ts']}
(B/'RESULT.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

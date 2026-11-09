# [CX-VRT01-R4] Why: issue a bounded offline verdict only after checking actual content, fresh attempts and source/build/input bindings. Rejected: turning a pack failure or an earlier build's successful output into qualification.
from binding import BASE as B,ROOT as R,sha,require_binding
import pathlib,json,re,subprocess,datetime
load=lambda p:json.loads(p.read_text());binding=require_binding()
records={}
for name in ['packages','reproductions','journal','cloudflare-retest','data-audit','comparisons','journal-oracle','integrity']:
 p=B/name/'execution.json';v=load(p);assert v['stable'] and v['exit']==(1 if name=='packages'else 0)
 assert v['before']==v['after'] and v['runnerBefore']==v['runnerAfter']
 for path,h in {**v['after'],**v['runnerAfter']}.items():assert sha(R/path)==h,path
 for path,h in v['outputs'].items():assert sha(B/name/path)==h,(name,path)
 assert v['head']=='8ba84f30b0b359174505270136150665f2b943af' and v['product']=='472c2c2439922b52e33206510b6cecb0812206ed' and v['slot']=='offline-no-engine' and v['started'].startswith('2026-11-09')
 records[name]={'attempt':v['attempt'],'receiptSha256':sha(p),'exit':v['exit']}
for pkg,n in [('core',864),('testkit',96),('xtdb',79),('qlever',39),('sqlite',6),('postgres',2)]:assert re.search(r'Tests\s+'+str(n)+r' passed',(B/'packages'/f'{pkg}-tests.txt').read_text())
assert 'Could not locate the bindings file' in (B/'packages/cloudflare-tests.txt').read_text()
assert '10 passed (10)' in (B/'cloudflare-retest/stdout').read_text()
for folder,n in [('matrix',510),('pending',80)]:assert load(B/folder/'summary.json')=={'scenarios':n,'observations':n,'matches':n,'mismatches':[]}
assert len(load(B/'pending-proof/summary.json'))==4
for r in load(B/'pending-proof/summary.json'):assert r['before']['error']=={'tag':'BasisNotAvailable','axis':'recordedAt'} and r['afterRows']==1 and r['elapsed']>=1900
for r in load(B/'oracle-comparisons.json')['results']:
 assert r['receiptConsistency']['status']==r['nestedReceiptConsistency']['status']=='PASS'
 assert all(r[k]for k in ['validDefaultMatches','journalMatches','hydratedTransactionsMatch','nestedJournalMatches','nestedHydratedMatches'])and all(r['negativeControls'].values())
assert len(load(B/'route-comparisons.json')['results'])==32 and all(r['matches']for r in load(B/'route-comparisons.json')['results'])
assert all(r['beforeMatches']and r['afterMatches']for r in load(B/'pending-comparisons.json')['results'])and load(B/'journal-single-comparison.json')['matches']
journals=load(B/'journal-comparisons.json')['results'];assert len(journals)==5 and all(r['matches']and r['receiptStatus']=='PASS' and r['explicitValidTimeCuts']==11 and r['journalClockSamples']==8 for r in journals)
for p in (B/'journal').glob('*-observed.json'):assert load(p)['transportSource']==sha(B/'sql-transport.ts')
data=load(B/'data-audit/inventory.json');assert data['stable']and data['filesSearched']==800
for p,h in data['hashes'].items():assert sha(R/p)==h,p
pack=load(B/'pack/execution.json');assert not pack['passed']and not pack['content']and pack['fullBuildSucceeded']==False and pack['sourceStable']and pack['buildStable']and not pack['stopReason']and pack['peakGrowthBytes']<pack['budgetBytes']
for p,h in pack['after'].items():assert sha(R/p)==h,p
for p,h in pack['buildsAfter'].items():assert sha(R/p)==h,p
for phase in pack['phases']:
 for key,ext in [('stdoutSha256','stdout'),('stderrSha256','stderr')]:assert sha(B/'pack'/(phase['name']+'.'+ext))==phase[key]
assert 'triplex-build-triplex-duckdb-0.0.0.tgz is missing package/dist/index.d.ts' in (B/'pack/pack-check.stderr').read_text()
assert 'NodeInspectSymbol' in (B/'pack-attempt5/build-duckdb.stdout').read_text()
assert not subprocess.check_output(['git','diff','--name-only','59e07af','HEAD','--','packages/duckdb','pnpm-lock.yaml']).strip()
assert not subprocess.check_output(['git','diff','--name-only','59e07af','HEAD','--','lab/acceptance','lab/oracles/replay']).strip()
# [CX-VRT01-R4] Why: check the builder's disclosed inventory drift instead of silently adopting its global stable flag. Rejected: treating a newly created unused script as unchanged bytes.
builder=R/'lab/experiments/EXP-RT01';durable=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round4');v=load(durable/'attempt1/execution.json');delta=[p for p in set(v['before'])|set(v['after'])if v['before'].get(p)!=v['after'].get(p)];assert delta==['lab/experiments/EXP-RT01/round4/run-pack.mjs'] and delta[0]not in v['before']
manifestFiles=0
for p,root in [(builder/'SHA256SUMS',builder),(builder/'round4/SHA256SUMS',builder/'round4'),(builder/'round4/DURABLE-SHA256SUMS',durable)]:
 for line in p.read_text().splitlines():
  h,name=line.split('  ',1);assert sha(root/name)==h,(root,name);manifestFiles+=1
integrity=load(B/'integrity.json');assert not integrity['manifestMismatches']and not integrity['sourceMismatches']and not integrity['acceptanceDiff'];assert len(integrity['pinDrift'])==3 and {p['path']for p in integrity['pinDrift']}=={'packages/testkit/src/index.ts'}
node=R/'node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3/build/Release/better_sqlite3.node';assert node.is_file()
result={'at':datetime.datetime.now(datetime.UTC).isoformat(),'verdict':'ACCEPT-OFFLINE','scope':'RT01 round A F7 repair and F1-F6 nonregression; packaging and live engines not qualified','binding':binding,'records':records,'packageTestsEventuallyPassed':1096,'initialPackageOuterExit':1,'cloudflareRetest':10,'engineTestsSkipped':116,'journalClockSamples':40,'explicitValidTimeCuts':55,'matrix':510,'pending':80,'journalComparisons':journals,'builderManifestFilesVerified':manifestFiles,'builderDrift':delta,'packQualified':False,'packFailure':'DuckDB declaration build TS4023 and missing dist/index.d.ts in tarball','packPeakGrowthBytes':pack['peakGrowthBytes'],'betterSqliteBinarySha256':sha(node),'liveG2G6Qualified':False,'blockingRT01Findings':[],'nonblockingFindings':['N1 malformed builder explicit-validAt control','N2 inherited DuckDB pack prerequisite failure']}
(B/'RESULT.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items()if k not in ['records','journalComparisons','binding']},indent=2))

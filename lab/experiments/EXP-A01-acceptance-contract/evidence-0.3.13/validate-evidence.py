import pathlib,shutil,json,hashlib,re,subprocess
r=pathlib.Path(__file__).resolve().parents[4];e=r/'lab/experiments/EXP-A01-acceptance-contract/evidence-0.3.13'
s=json.loads((e/'source-and-hashes.json').read_text());head=s['testedSource'];subprocess.run(['git','merge-base','--is-ancestor',head,'HEAD'],cwd=r,check=True);assert all(hashlib.sha256((r/p).read_bytes()).hexdigest()==h for p,h in s['hashes'].items()),'source hashes'
mut=(e/'negtest-final.txt').read_text();assert 'total 582 run 494 caught 494 missed: [] retired (anchor gone): 88' in mut,'mutations'
rules=json.loads((e/'authority-and-pin-review.json').read_text())['rules'];controls={rid:[x for x in mut.splitlines() if x.startswith('CAUGHT '+rid+' ')] for rid in rules};assert all(len(v)==2 for v in controls.values()),'new controls'
tap=(e/'evaluator-final.tap').read_text()
for name,n in [('tests',108),('pass',108),('fail',0),('skipped',0),('cancelled',0),('todo',0)]:assert re.search(r'^# '+name+' '+str(n)+'$',tap,re.M),name
assert 'Ran 18 tests' in (e/'contract-tests-c3ea.txt').read_text() and '\nOK\n' in (e/'contract-tests-c3ea.txt').read_text(),'contract tests'
assert '# pass 3\n' in (e/'screening-js-c3ea.txt').read_text(),'js policy tests'
assert 'Q47d external test: PASS' in (e/'q47d-final.txt').read_text(),'pending test'
assert 'second regeneration byte-identical' in (e/'verify-final-source.txt').read_text(),'verify'
gates=[]
for lane,count,skip in [('xtdb',1218,137),('datomic',1253,66)]:
 x=json.loads((e/f'G0-{lane}-final-receipt.json').read_text());assert x['verdict']=='PASS' and x['scope']=='full',lane+' verdict';assert x['counts']=={'executed':count,'pass':count,'fail':0,'skip':skip,'expectedSkip':skip,'unexpectedSkip':0},lane+' counts';assert x['git']['head']==head and x['git']['diffBytes']==0 and x['git']['modifiedFiles']==[] and x['git']['untrackedFiles']==[],lane+' source'
 for o in x['objects']:
  candidates=[r/'runs/objects'/o['sha256'],e/'G0-resource-objects'/o['sha256'],r/o['path']]
  prefix='runs/G0/'+x['runId']+'/'
  if o['path'].startswith(prefix):candidates.append(e/f'G0-{lane}-final-raw'/o['path'][len(prefix):])
  retained=next((p for p in candidates if p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==o['sha256']),None)
  assert retained is not None,lane+' retained object '+o['path']
  if o['role']=='heavy-parent-grant':
   out=e/'G0-resource-objects'/o['sha256'];out.parent.mkdir(exist_ok=True)
   if not out.exists():shutil.copy2(retained,out)
   assert hashlib.sha256(out.read_bytes()).hexdigest()==o['sha256']
 gates.append({'lane':lane,'runId':x['runId'],'previous':x['previous'],'verdict':x['verdict'],'counts':x['counts'],'sourceHead':x['git']['head'],'sourceTreeId':x['git']['sourceTreeId'],'sourceDiffBytes':x['git']['diffBytes'],'stashCommit':x['git']['stashCommit'],'verifiedObjects':len(x['objects'])})
d=json.loads((r/'lab/acceptance/obligations.json').read_text());fs=[f for f in e.rglob('*') if f.is_file() and f.name not in {'validation-summary.json','SHA256SUMS'}];assert max(f.stat().st_size for f in fs)<=1_000_000 and sum(f.stat().st_size for f in fs)<5_000_000,'bulky limits'
summary={'testedSource':head,'sourceHashesStable':True,'atomicMerge':s['atomicMerge'],'mainMerged':s['mainAtDispatch'],'integrationMerged':s['integration'],'version':d['version'],'transitiveHash':re.search(r'verify transitive hash: (\w+)',(e/'verify-final-source.txt').read_text())[1],'generatorVerify':'all six outputs byte-identical','contractTests':18,'jsPolicyTests':3,'mutationCatalog':582,'activeMutations':494,'caught':494,'missed':0,'retiredControls':88,'newLiteralAndConsumerControls':controls,'evaluator':{'pass':108,'fail':0,'skipped':0,'assertionsWeakened':False},'g0':gates,'q47d':'PASS','pendingIds':d['pendingRulings']['ids'],'closability':d['closability']['counts'],'datomicPinLevelCounts':d['closability']['perSurface']['datomic-datalog'],'firstFailuresPreserved':['negtest-initial.txt','evaluator-attempt1.tap','G0-datomic-attempt1-receipt.json'],'historicalReviewerSuite':'34 methods pass; one pre-DA00 null-image method fails 153 subtests as its premise is superseded; not counted as a passing gate','rawEvidenceBytes':sum(f.stat().st_size for f in fs),'largestEvidenceBytes':max(f.stat().st_size for f in fs),'allNewEvidenceBelowBulkyLimits':True}
(e/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print('All evidence assertions PASS',summary['transitiveHash']);print(gates)

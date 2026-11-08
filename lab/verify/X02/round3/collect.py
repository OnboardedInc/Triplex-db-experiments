# [CX-VX02-3] Why: retain explicit denominators and byte identities independent of command exits.
# Rejected: changing failed exploratory expectations in place or adopting builder PASS outputs.
from pathlib import Path
import json,hashlib,subprocess,datetime
r=Path(__file__).resolve().parent;t=r/'target'
load=lambda n:json.loads((r/n).read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
g=load('G0-receipt.json');old=load('subquery-regression.json');new=load('union-regression.json')
v=load('variations.json');dl=load('delta-live.json');do=load('delta-offline.json');off=load('offline-source.json')
assert g['verdict']=='PASS' and g['counts']['pass']==960 and not g['git']['dirty']
assert g['git']['head']=='200d6697bd8e78375f17660c9277bccb00f9dece'
resolved=lambda x:x['target']['accepted'] and x['publicExit'].startswith('Success(') and x['rawRows']==[{'v':'x'}] and not x['isDefect']
assert len(old['controls'])==6 and all(resolved(x) for x in old['controls'])
assert len(new['controls'])==6 and all(x['confirmedRegression'] for x in new['controls'])
assert all(x['pass'] for x in v['controls'] if x['kind']=='unsafe')
summ={'target':g['git']['head'],'verdict':'FIX-FIRST','G0':{'runId':g['runId'],'counts':g['counts'],'git':g['git']},
'originalSubqueries':{'total':len(old['controls']),'resolved':sum(resolved(x) for x in old['controls'])},
'unionRegression':{'total':len(new['controls']),'confirmed':sum(x['confirmedRegression'] for x in new['controls'])},
'addedVariations':{'total':len(v['controls']),'matchedExploratoryExpectation':sum(x['pass'] for x in v['controls']),
 'unsafeTypedRefusals':sum(x['kind']=='unsafe' and x['pass'] for x in v['controls']),
 'supportedFalseRefusals':[x['name'] for x in v['controls'] if x['kind']=='safe' and x['engineSupported'] and not x['guard']['accepted']],
 'engineErrorControls':[{'name':x['name'],'rawError':x['rawError']} for x in v['controls'] if x.get('rawError')]},
'earlierDeltaLive':{'total':len(dl['controls']),'expectationMatches':sum(x['pass'] for x in dl['controls']),'knownEngineSyntaxErrors':[x['name'] for x in dl['controls'] if not x['pass']]},
'earlierDeltaOffline':{'overflow':len(do['overflow']),'exact':len(do['exact']),'defaults':len(do['defaults']),'ordinaryDefault':do['ordinaryDefault']},
'earlierOffline':{'sourceMaps':len(off['maps']),'inventory':off['inventory'],'unsetLanguage':off['unsetLanguage']},
'earlierHazards':load('source-hazards.json')['probes']}
for name in ['source-sums','delta-sums']:
 d=load(name+'.json')['controls'];assert all(x['pass'] for x in d)
 summ[name]={'total':len(d),'pass':sum(x['pass'] for x in d)}
(r/'summary.json').write_text(json.dumps(summ,indent=2)+'\n')
extra={'G0':{'status':0,'sessionId':89824},'priorAndVariationRunner':{'status':1,'sessionId':45273,'note':'variations retained 15 expectation mismatches, individually classified'},
'unionFirstAttempt':{'status':1,'log':'union-regression.log','note':'wrong cwd prevented tool creation; module resolution failed before queries'},
'unionCorrectedAttempt':{'status':0,'log':'union-regression-r2.log','semanticFinding':'six confirmed false refusals'}}
(r/'additional-exec-outcomes.json').write_text(json.dumps(extra,indent=2)+'\n')
product_diff=subprocess.check_output(['git','-C',str(t),'diff','200d669','--','packages','pnpm-lock.yaml'],text=True)
assert not product_diff
files=[p for p in r.rglob('*') if p.is_file() and 'target' not in p.relative_to(r).parts and p.name not in ['manifest.json','collection.log']]
manifest={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'target':g['git']['head'],'productDiff':product_diff,
'files':[{'path':str(p.relative_to(r)),'bytes':p.stat().st_size,'sha256':sha(p)}for p in sorted(files)],
'sourceAndBuildFiles':[{'path':str(p.relative_to(t)),'bytes':p.stat().st_size,'sha256':sha(p)}for base in ['packages/core/src','packages/core/dist','packages/xtdb/src','packages/xtdb/dist','packages/qualification/src','packages/qualification/dist','packages/testkit/dist']for p in sorted((t/base).rglob('*'))if p.is_file()],
'lockfileSha256':sha(t/'pnpm-lock.yaml'),'retainedDetachedWorktree':'target/',
'baselineGuard':{'commit':'bf1ad4d','sha256':sha(r/'baseline-ReadOnlySql.ts')},'round2Guard':{'commit':'6cd68dc','sha256':sha(r/'round2-ReadOnlySql.ts')},
'pnpmShim':{'path':'target/lab/experiments/EXP-X02-xtql-parity/round2/bin/pnpm','sha256':sha(t/'lab/experiments/EXP-X02-xtql-parity/round2/bin/pnpm')},
'report':{'path':'../VERIFY-round3.md','sha256':sha(r.parent/'VERIFY-round3.md')}}
(r/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({k:v for k,v in summ.items() if k not in ['G0','earlierHazards','earlierOffline']},indent=2))

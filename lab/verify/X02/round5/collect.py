# [CX-VX02-5] Why: independently check semantic denominators, keep oracle resource gaps and bind all evidence bytes.
# Rejected: wrapper exits as acceptance, treating OOM as a lexer disagreement, or deleting failed attempts.
from pathlib import Path
import hashlib,json,subprocess,datetime
r=Path(__file__).resolve().parent;t=r/'target'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda n:json.loads((r/n).read_text())
g=load('G0-receipt.json');assert g['verdict']=='PASS' and g['counts']['pass']==g['counts']['executed']==968 and not g['git']['dirty']
assert g['git']['head']=='7b11af08b847fecf0667842a6e0b31139729373b'
assert all(x['matches']for x in load('author-manifest-audit.json'))
assert load('oracle-execution.json')['sourceSha256']==sha(r/'lexer-oracle.clj')
assert load('oracle-fresh-execution.json')['sourceSha256']==sha(r/'lexer-oracle-fresh.clj')
lex=load('lexer-comparison-final.json');gen=load('lexer-generation.json')
assert len(lex['controls'])==5387 and lex['counts']=={'exact':4546,'refusedValid':32,'refusedInvalid':797,'acceptedMismatch':0,'instrumentationMismatch':0,'inconclusive':12}
expected=set(gen['rules'])-set(gen['fragments']);assert expected==set(lex['referenceTokenClasses']) and len(expected)==363
assert all(x['instrumentationMatches']for x in lex['controls'])
d=load('grammar-review.json');summary={'verdict':'ACCEPT','target':g['git']['head'],'G0':{'runId':g['runId'],'counts':g['counts'],'git':g['git']},'grammar':{},'lexer':{'cases':5387,'tokenClassesCovered':len(expected),'tokenClassesExpected':len(expected),'counts':lex['counts'],'oracleGaps':[{'id':x['id'],'bytes':len(x['sql'].encode()),'errors':x['errors']}for x in lex['controls']if x['disposition']=='oracle-inconclusive']},'earlier':{}}
for origin in sorted({x['origin']for x in d['safe']}):
 rows=[x for x in d['safe']if x['origin']==origin];summary['grammar'][origin]={'total':len(rows),'matches':sum(x['match']for x in rows),'mismatches':[x['name']for x in rows if not x['match']]}
 if origin!='boundary-control':assert all(x['match']for x in rows)
assert len(d['unsafe'])==2362 and all(x['pass']for x in d['unsafe']);summary['grammar']['unsafe']={'total':2362,'typedPredispatchRefusals':2362}
for n in ['source-sums','delta-sums']:
 rows=load(n+'.json')['controls'];assert all(x['pass']for x in rows);summary['earlier'][n]={'total':len(rows),'pass':len(rows)}
o=load('delta-offline.json');summary['earlier']['delta-offline']={k:len(o[k])for k in ['overflow','exact','defaults']}
for k in ['overflow','exact','defaults']:assert all(x['pass']for x in o[k])
o=load('offline-source.json');assert len(o['maps'])==13 and all(x['matches']for x in o['maps']);summary['earlier']['sourceMapChecks']=13
for name in ['check-offline','boundary-confirmation']:
 dd=load(name+'.json');rows=dd.get('controls',dd.get('unsafe',[]));assert all(not x['accepted']and not x['answerDispatched']for x in rows);summary['earlier'][name]={'unsafeRefusals':len(rows)}
assert all(x['pass']for x in load('boundary-confirmation.json')['safe'])
rows=load('subquery-regression.json')['controls'];assert len(rows)==6 and all(x['target']['accepted']and x['publicExit'].startswith('Success(')and x['rawRows']==[{'v':'x'}]for x in rows)
rows=load('delta-live.json')['controls'];summary['earlier']['deltaLive']={'total':len(rows),'unchangedExpectationMatches':sum(x['pass']for x in rows),'knownInvalidQuantifierSpellings':[x['name']for x in rows if not x['pass']]}
assert set(x['name']for x in rows if not x['pass'])=={'parenthesized-any-operand','parenthesized-some-operand'}
summary['earlier']['sourceHazardRecords']=len(load('source-hazards.json')['probes']);assert summary['earlier']['sourceHazardRecords']==13
(r/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
assert subprocess.check_output(['git','-C',str(t),'diff','7b11af0','--','packages','pnpm-lock.yaml'],text=True)==''
files=[p for p in r.rglob('*')if p.is_file()and 'target'not in p.relative_to(r).parts and p.name not in ['manifest.json','collection.log']]
manifest={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'target':g['git']['head'],'productDiff':'','files':[{'path':str(p.relative_to(r)),'bytes':p.stat().st_size,'sha256':sha(p)}for p in sorted(files)],
 'sourceAndBuildFiles':[{'path':str(p.relative_to(t)),'bytes':p.stat().st_size,'sha256':sha(p)}for base in ['packages/core/src','packages/core/dist','packages/xtdb/src','packages/xtdb/dist','packages/qualification/src','packages/qualification/dist','packages/testkit/dist']for p in sorted((t/base).rglob('*'))if p.is_file()],
 'externalRetainedRegressionInputs':[{'path':str(p.relative_to(r.parent)),'sha256':sha(p)}for p in [r.parent/'round3/union-regression.json',r.parent/'round3/subquery-regression.json']],
 'fixtureSha256':sha(t/'packages/xtdb/test/fixtures/SqlLexer-v2.2.0.g4'),'lockfileSha256':sha(t/'pnpm-lock.yaml'),'pnpmShimSha256':sha(t/'lab/experiments/EXP-X02-xtql-parity/round2/bin/pnpm'),
 'oracleClass':load('oracle-class-binding.json'),'oracleContainer':load('oracle-container-binding.json'),'report':{'path':'../VERIFY-round5.md','sha256':sha(r.parent/'VERIFY-round5.md')},'retainedTarget':'target/'}
(r/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items()if k!='G0'},indent=2))

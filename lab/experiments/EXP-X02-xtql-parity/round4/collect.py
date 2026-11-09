# [EXP-X02-R4] Why: check semantic records separately from wrapper exits and bind retained bytes.
# Rejected: exit-zero-only acceptance or substituting old reviewer results.
from pathlib import Path
import hashlib, json, subprocess
d=Path(__file__).resolve().parent
root=d.parents[3]
read=lambda n:json.loads((d/n).read_text())
assert all(r['status']==0 and r['signal'] is None for r in read('exec-outcomes.json'))
counts={}
for n,total in [('grammar-live',1818),('subquery-regression',6),('delta-live',22),('source-sums',20),('delta-sums',30)]:
 rows=read(n+'.json')['controls']
 assert len(rows)==total and all(r['pass'] for r in rows),n
 counts[n]={'pass':total,'total':total}
grammar=read('grammar-live.json')
assert len(grammar['unsafe'])==1818 and all(r['pass'] for r in grammar['unsafe'])
assert len(grammar['reviewer'])==6 and all(r['pass'] for r in grammar['reviewer'])
assert len({(r['formIndex'],r['depth'],r['comments'],r['quantifier']) for r in grammar['controls']})==1818
counts['grammar-unsafe']={'pass':1818,'total':1818}
counts['reviewer-union']={'pass':6,'total':6}
lexical=read('lexer-live.json')
for key,total in [('safe',3153),('unsafe',915),('spot',21)]:
 assert len(lexical[key])==total and all(r['pass'] for r in lexical[key]),key
 counts['lexer-'+key]={'pass':total,'total':total}
assert all(not r['answerDispatched'] for r in lexical['unsafe'])
assert all(not r['answerDispatched'] for r in grammar['unsafe'])
for name in ['SqlTokens','SqlLexerPatterns']:
 source=(root/f'packages/xtdb/src/native/{name}.ts').read_text()
 build=root/f'packages/xtdb/dist/native/{name}.js.map'
 assert source in json.loads(build.read_text())['sourcesContent']
offline=read('offline-source.json')
assert len(offline['maps'])==13 and all(r['matches'] for r in offline['maps'])
delta=read('delta-offline.json')
for key,total in [('overflow',10),('exact',120),('defaults',213)]:
 assert len(delta[key])==total and all(r['pass'] for r in delta[key]),key
 counts[key]={'pass':total,'total':total}
hazards=read('source-hazards.json')['probes']
assert len(hazards)==13
for r in hazards:
 if r['name'].endswith('-envelope'): assert not r['accepted']
 elif r['name'].startswith(('any-','some-')): assert 'Fail(ReadError' in r['error'] and 'non-subquery operand' in r['error']
 elif r['name'].startswith('compiler-'): assert r['tag']=='DatalogValidationError'
 else:
  expected='1000000000000000000' if r['name']=='decimal-bigint' else '1000000000000000004'
  assert r['result']==[{'v':expected}],r
counts['source-hazards']={'expected-records':13,'total':13}
receipt=read('G0-receipt.json')
assert receipt['counts']['fail']==0
assert receipt['counts']['executed']==receipt['counts']['pass']==968
assert receipt['counts']['unexpectedSkip']==0
for entry in receipt['git']['modifiedFiles'] + receipt['git']['untrackedFiles']:
 assert hashlib.sha256((root/entry['path']).read_bytes()).hexdigest()==entry['sha256']
summary={'counts':counts,'G0':receipt['counts'],'sourceMaps':13,'grammarForms':101,'grammarDepths':[1,2,3],'reviewerBaseline':'7873fea',
 'syntaxExpectationAdaptation':['parenthesized-any-operand','parenthesized-some-operand']}
(d/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
tools={}
for name in ['subquery-regression.ts','baseline-ReadOnlySql.ts','delta-live.ts','delta-offline.ts','delta-sums.ts','offline-source.ts','probe-source.ts','probe-sums.ts']:
 data=subprocess.check_output(['git','show','7873fea:lab/verify/X02/round2/'+name],cwd=root)
 tools[name]={'originalGit':'7873fea:lab/verify/X02/round2/'+name,'originalSha256':hashlib.sha256(data).hexdigest(),'adaptedSha256':hashlib.sha256((d/name).read_bytes()).hexdigest()}
reviewer=Path('/Users/sam/projects/triplex-db-2/.claude/worktrees/agent-ae7172e0630603522')
original=reviewer/'lab/verify/X02/round4'
assert (root/'packages/xtdb/test/fixtures/SqlLexer-v2.2.0.g4').read_bytes()==(original/'SqlLexer.g4').read_bytes()
assert (d/'reviewer-report.md').read_bytes()==(reviewer/'lab/verify/X02/VERIFY-round4.md').read_bytes()
origin={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=reviewer,text=True).strip(),
 'files':{name:hashlib.sha256((original/name).read_bytes()).hexdigest() for name in ['grammar-review.json','spot.json','SqlLexer.g4','Sql.g4']}}
(d/'reviewer-origin.json').write_text(json.dumps(origin,indent=2)+'\n')
files={str(p.relative_to(root)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(d.rglob('*')) if p.is_file() and p.name != 'manifest.json' and not p.name.startswith('collection')}
for name in ['lab/experiments/EXP-X02-xtql-parity/REPORT-round4.md','scripts/generate-xtdb-lexer.mjs','packages/xtdb/test/fixtures/SqlLexer-v2.2.0.g4','packages/xtdb/src/native/SqlTokens.ts','packages/xtdb/src/native/SqlLexerPatterns.ts','packages/xtdb/src/native/ReadOnlySql.ts','packages/xtdb/test/native-query.test.ts','packages/xtdb/test/query-expression-corpus.ts','packages/xtdb/dist/native/ReadOnlySql.js','lab/experiments/EXP-X02-xtql-parity/round2/bin/pnpm']:
 p=root/name
 files[name]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
(d/'manifest.json').write_text(json.dumps({'tools':tools,'files':files},indent=2)+'\n')
print(json.dumps(summary,indent=2))

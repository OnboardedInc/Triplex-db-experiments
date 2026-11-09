# [CX-VRT01-R2] Why: check the full retained outcome denominator and exact source before the review verdict. Rejected: promoting a green package run while route comparisons fail.
from binding import require_binding,BASE
import subprocess,os,json,hashlib,pathlib
binding=require_binding()
r=subprocess.run(['python3',str(BASE/'integrity.py')],env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1'),capture_output=True);(BASE/'integrity.stdout').write_bytes(r.stdout);(BASE/'integrity.stderr').write_bytes(r.stderr);assert r.returncode==0,r.stderr.decode()
load=lambda p:json.loads((BASE/p).read_text())
oracle=load('oracle/commands.json');assert all(v['exit']==0 for v in oracle['results'])
assert load('oracle/selfcheck.stdout')['status']=='PASS'
fixtures=load('oracle/fixtures.stdout');assert fixtures['status']=='PASS' and len(fixtures['fixtures'])==14
assert all(v['verdict']==v['wanted']for v in fixtures['fixtures'])
assert 'Ran 403 tests' in (BASE/'oracle/tests.stderr').read_text() and '\nOK\n' in (BASE/'oracle/tests.stderr').read_text()
for pkg,count in [('core',859),('testkit',93),('xtdb',74),('qlever',37)]:assert f'{count} passed' in (BASE/'packages'/(pkg+'-tests.txt')).read_text()
phase_lines=[v for v in (BASE/'packages/stdout').read_text().splitlines() if v.strip()]
assert len(phase_lines)==14 and all(v.endswith(' 0')for v in phase_lines)
for folder in ['matrix','pending']:
 assert all('harnessFailure' not in v for v in load(folder+'/observations.json'))
i=load('integrity.json');assert not i['manifestMismatches'] and not i['sourceMismatches'] and not i['acceptanceDiff'];assert len(i['pinDrift'])==3 and {r['path']for r in i['pinDrift']}=={'packages/testkit/src/index.ts'}
o=load('oracle-comparisons.json');assert len(o['results'])==4
for v in o['results']:
 assert v['receiptConsistency']['status']=='PASS' and v['nestedReceiptConsistency']['status']=='PASS'
 assert all(v[k]for k in ['validDefaultMatches','journalMatches','hydratedTransactionsMatch','nestedJournalMatches','nestedHydratedMatches'])
assert load('journal-single-comparison.json')['matches']
assert all(r['matches']for r in load('route-comparisons.json')['results'])
for v in load('pending-comparisons.json')['results']:assert v['receiptConsistency']['status']=='PASS' and not v['beforeMatches'] and v['afterMatches']
m=load('matrix/summary.json');p=load('pending/summary.json');assert (m['scenarios'],m['matches'])==(510,500);assert (p['scenarios'],p['matches'])==(80,50)
assert {r['route']for r in m['mismatches']}=={'Triples.transactionsForEntity'}
s=load('scan/execution.json');assert s['stable'] and s['exit']==0
scan=json.loads((BASE/'scan/stdout').read_text());assert not scan['engineIO'] and len(scan['measurements'])==8
for v in scan['measurements']:
 assert len(v['pairs'])==6 and v['rt01RowVisitsPerGuard']==2*v['storedScopeVersions'] and v['baselineRowVisitsPerGuard']==v['storedScopeVersions']
result={'binding':binding,'verdict':'FIX-FIRST','originalReproductions':'32/32 fixed','normalMatrix':{'cases':510,'matched':500},'pendingMatrix':{'cases':80,'matched':50},'pendingOracleCases':4,'liveG2':False,'liveG6':False,'rawOwnedBytes':sum(p.stat().st_size for p in BASE.rglob('*')if p.is_file())}
(BASE/'RESULT.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

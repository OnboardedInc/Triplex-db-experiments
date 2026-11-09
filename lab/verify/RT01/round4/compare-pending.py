# [CX-VRT01-R2] Why: distinguish valid receipts from an immutable-read violation in observed output. Rejected: taking O-REPLAY exit zero as agreement with the early answer.
from binding import BASE,require_binding,sha
import json,subprocess,os
binding=require_binding();rows=[]
for p in sorted((BASE/'pending-proof').glob('*.case.json')):
 r=subprocess.run(['python3','-m','lab.oracles.replay',str(p)],cwd=BASE.parent/'oracle-050',env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1'),capture_output=True)
 (p.parent/(p.stem+'.oracle.json')).write_bytes(r.stdout);(p.parent/(p.stem+'.oracle.stderr')).write_bytes(r.stderr)
 x=json.loads(r.stdout);v=json.loads((p.parent/(p.name.replace('.case.json','-observed.json'))).read_text());queries={q['id']:q for q in x['queries']}
 expected=queries['before']['error'];expectedAfter=queries['after']['result']['snapshot'];before=v['before']
 rows.append({'case':p.name,'caseSha256':sha(p),'oracleExit':r.returncode,'receiptConsistency':x['receiptConsistency'],'expectedBefore':expected,'observedBefore':before,'beforeMatches':before.get('error',{}).get('tag')==expected['_tag'],'expectedAfterIds':[r['id']for r in expectedAfter],'observedAfterIds':[r['id']for r in v['after']],'afterMatches':[r['id']for r in expectedAfter]==[r['id']for r in v['after']]})
(BASE/'pending-comparisons.json').write_text(json.dumps({'binding':binding,'results':rows},indent=2)+'\n');print([(v['case'],v['beforeMatches'],v['afterMatches'])for v in rows])

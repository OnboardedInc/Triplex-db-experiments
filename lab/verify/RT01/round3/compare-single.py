# [CX-VRT01] Why: isolate the journal violation with actual assertion identities and one physical commit. Rejected: inferring it solely from the serializer branch.
import pathlib,json,subprocess,os
from binding import require_binding
binding=require_binding()
b=pathlib.Path('lab/verify/RT01/round3').resolve();p=b/'reproductions/journal-single.case.json'
r=subprocess.run(['python3','-m','lab.oracles.replay',str(p)],cwd=b.parent/'oracle-050',env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1'),capture_output=True)
(b/'journal-single.oracle.json').write_bytes(r.stdout);(b/'journal-single.oracle.stderr').write_bytes(r.stderr)
x=json.loads(r.stdout);observed=json.loads((b/'reproductions/journal-single-observed.json').read_text());expected=[v['value']['value'] for v in x['queries'][0]['result']['facts'] if v['attribute']==':_tx/change'];actual=[{k:v for k,v in json.loads(row['value_json']).items() if k!='v'} for row in observed['rows'] if row['attribute']==':_tx/change']
result=dict(binding=binding,oracleExit=r.returncode,receiptConsistency=x['receiptConsistency'],expected=expected,observed=actual,matches=actual==expected)
(b/'journal-single-comparison.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

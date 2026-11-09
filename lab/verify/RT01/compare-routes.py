# [CX-VRT01] Why: oracle R-CUT-6 defines the answer; the route must expose its tag itself. Rejected: counting a nested cause or an empty successful answer as typed refusal.
import pathlib,json,subprocess,os,hashlib,datetime
from binding import require_binding
binding=require_binding()
b=pathlib.Path('lab/verify/RT01').resolve();a=b/'attempt2';r=[]
for v in json.loads((a/'route-probes.json').read_text())+json.loads((b/'public-routes.json').read_text()):
 observed=v['observed'];lane=v['lane'];source=json.loads((a/(lane+'-a0.case.json')).read_text());T=v.get('T',v.get('basis',{}).get('recordedAt'))
 case={**source,'caseId':'CX-VRT01/'+lane+'/'+v['route'],'commands':source['commands'][:1],'receipts':source['receipts'][:1],'queries':[{'id':'future','kind':'entityTriples','entityId':'subject:one','readStart':1,'cut':{'recordedAt':T,'validAt':1000}}]}
 path=b/('route-'+lane+'-'+v['route']+'.case.json');path.write_text(json.dumps(case,indent=2)+'\n')
 run=subprocess.run(['python3','-m','lab.oracles.replay',str(path)],cwd=b/'oracle-050',env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1'),capture_output=True)
 output=b/('route-'+lane+'-'+v['route']+'.oracle.json');output.write_bytes(run.stdout)
 expected=json.loads(run.stdout)['queries'][0]['error']
 r.append(dict(lane=lane,route=v['route'],caseSha256=hashlib.sha256(path.read_bytes()).hexdigest(),oracleExit=run.returncode,expected=expected,observed=observed,matches=observed.get('tag')==expected['_tag'] and observed.get('axis')==expected['axis']))
(b/'route-comparisons.json').write_text(json.dumps(dict(binding=binding,at=datetime.datetime.now(datetime.UTC).isoformat(),results=r),indent=2)+'\n')
print('matched',sum(x['matches'] for x in r),'/',len(r));print('mismatches',[(x['lane'],x['route'])for x in r if not x['matches']])

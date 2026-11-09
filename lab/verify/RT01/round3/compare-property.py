# [CX-VRT01-R3] Why: independently judge actual concurrent receipts and snapshots and the clock-sensitive journal. Rejected: treating a consistent receipt as proof of every returned row.
from binding import BASE,require_binding,sha
import json,subprocess,os
binding=require_binding();root=BASE.parent/'oracle-050';out=BASE/'property-oracle';out.mkdir(exist_ok=True)
def run(p):
 r=subprocess.run(['python3','-m','lab.oracles.replay',str(p.resolve())],cwd=root,env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1'),capture_output=True)
 (out/(p.stem+'.oracle.json')).write_bytes(r.stdout);(out/(p.stem+'.stderr')).write_bytes(r.stderr)
 assert r.returncode==0,(p,r.stderr.decode(),r.stdout.decode()[:1000]);v=json.loads(r.stdout);assert v['receiptConsistency']['status']=='PASS',(p,v['receiptConsistency']);return v

def opt(v):return v.get('value') if isinstance(v,dict)and v.get('_tag')=='Some' else None if isinstance(v,dict)and v.get('_tag')=='None' else v

def normal(row):return {k:opt(v) for k,v in row.items() if k not in ['recordedPosition','retractedPosition']}
results=[]
for p in sorted((BASE/'actual-property/attempt4').glob('*.case.json')):
 v=run(p);observed=json.loads(p.with_name(p.name.replace('.case.json','-observed.json')).read_text());comparisons=[]
 for actual,expected in zip(observed['queried'],v['queries'],strict=True):
  a=[normal(r)for r in actual['rows']];e=[normal(r)for r in expected['result']['snapshot']];comparisons.append({'T':actual['T'],'matches':a==e,'actual':a,'expected':e})
 assert all(x['matches']for x in comparisons)
 assert not observed['violations'] and all(r['pairs']>0 for r in observed['routeStats'].values())
 results.append({'case':p.name,'inputSha256':sha(p),'receiptConsistency':v['receiptConsistency'],'cuts':len(comparisons),'comparisons':comparisons,'pairChecks':sum(r['pairs']for r in observed['routeStats'].values())})
journals=[]
for p in sorted((BASE/'journal-clock/attempt3').glob('*-observed.json')):
 observed=json.loads(p.read_text());r=observed['receipt'];case={'format':'triplex-db-2/o-replay-case/1','caseId':'CX-VRT01-R3/journal-clock/'+p.name,'defaultScope':'journal-clock-review','adapter':{'recordTime':'decided','clockDriven':True,'schemaVersion':1},'commands':[{'clock':1000,'operations':[{'op':'assert','entityId':'subject','attribute':':value','value':{'type':'string','value':'value'}}]}],'receipts':[{'command':0,'outcome':'committed','txId':r['txId'],'position':r['position'],'instant':r['instant'],'stagedAt':r['stagedAt'],'assertionIds':[r['triples'][0]['id']]}],'queries':[{'id':'journal','kind':'transactionsForEntity','entityId':'subject','snapshotPosition':r['position']}]}
 path=out/(p.stem+'.case.json');path.write_text(json.dumps(case,indent=2)+'\n');v=run(path);expected=v['queries'][0]['result'];expected={**expected,'transactions':[{k:v for k,v in t.items()if k!='changedEntities'}for t in expected['transactions']]}
 matches={k:observed[k]==expected for k in ['before','after','restored']}
 assert matches=={'before':True,'after':False,'restored':True},(matches,expected,observed)
 journals.append({'encoding':p.name,'observedSha256':sha(p),'expected':expected,'matches':matches,'receiptConsistency':v['receiptConsistency']})
(BASE/'property-comparisons.json').write_text(json.dumps({'binding':binding,'actual':results,'journals':journals},indent=2)+'\n')
print(json.dumps({'actualCases':len(results),'actualCuts':sum(r['cuts']for r in results),'actualPairChecks':sum(r['pairChecks']for r in results),'journalMatches':[r['matches']for r in journals]}))

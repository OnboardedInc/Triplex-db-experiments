# [CX-VRT01-R4] Why: compare every journal method's actual bytes with the independent oracle, and the explicit valid-time controls with its snapshots. Rejected: two implementations agreeing only on receipt counts.
from binding import BASE,require_binding,sha
import json,subprocess,os
binding=require_binding();out=BASE/'journal-oracle';out.mkdir(exist_ok=True);results=[]
for p in sorted((BASE/'journal').glob('*-observed.json')):
 v=json.loads(p.read_text());receipts=[dict(command=i,outcome='committed',txId=r['txId'],position=r['position'],instant=r['instant'],stagedAt=r['stagedAt'],assertionIds=[r['triples'][0]['id']])for i,r in enumerate([v['first'],v['ahead']])]
 queries=[{'id':'feed','kind':'transactions'},{'id':'old','kind':'transactionsForEntity','entityId':'subject','snapshotPosition':1},{'id':'top','kind':'transactionsForEntity','entityId':'subject','snapshotPosition':2,'limit':1},{'id':'next','kind':'transactionsForEntity','entityId':'subject','snapshotPosition':2,'beforePosition':2,'limit':1}]+[{'id':'valid-'+str(i),'kind':'entityTriples','entityId':'subject','cut':{'recordedAt':v['ahead']['instant'],'validAt':r['validAt']}}for i,r in enumerate(v['normal'])]
 case={'format':'triplex-db-2/o-replay-case/1','caseId':'CX-VRT01-R4/'+p.name,'defaultScope':v['scope'],'adapter':{'recordTime':'staged'if v['lane']=='kv'else'decided','clockDriven':True,'schemaVersion':1},'commands':[{'clock':clock,'meta':{'commandId':name},'operations':[{'op':'assert','entityId':'subject','attribute':':value','value':{'type':'string','value':name},'validFrom':clock,'validTo':to}]}for clock,name,to in [(1000,'first',2000),(5000,'ahead',6000)]],'receipts':receipts,'queries':queries}
 path=out/(p.stem+'.case.json');path.write_text(json.dumps(case,indent=2)+'\n');r=subprocess.run(['python3','-m','lab.oracles.replay',str(path.resolve())],cwd=BASE.parent/'oracle-050',env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1'),capture_output=True);(out/(p.stem+'.oracle.json')).write_bytes(r.stdout);(out/(p.stem+'.stderr')).write_bytes(r.stderr);assert r.returncode==0,(p,r.stderr,r.stdout[:800])
 x=json.loads(r.stdout);assert x['receiptConsistency']['status']=='PASS',x['receiptConsistency'];q={r['id']:r['result']for r in x['queries']}
 def page(expected):return {**expected,'transactions':[{k:v for k,v in r.items()if k!='changedEntities'}for r in expected['transactions']]}
 feed=page(q['feed']);records=feed['transactions'];assert [v['original'],v['latest']]==records
 for r in v['samples']:
  assert r['record']==r['command']==records[0];assert r['feed']['transactions']==records[:1]
  if r.get('page')is not None:assert r['page']==page(q['old'])
 for r in v['after']:
  assert r['record']==r['command']==records[1];assert r['feed']==feed;assert r['tail']['transactions']==records[1:]
  if r.get('page')is not None:assert r['page']==page(q['top']) and r['next']==page(q['next']) and r['old']==page(q['old'])
 for i,r in enumerate(v['normal']):assert [r['value']['value']for r in q['valid-'+str(i)]['snapshot']]==r['expected']
 results.append({'case':p.name,'caseSha256':sha(path),'observedSha256':sha(p),'receiptStatus':x['receiptConsistency']['status'],'journalClockSamples':len(v['samples'])+len(v['after']),'explicitValidTimeCuts':len(v['normal']),'fullEntityPages':v['lane']!='qlever','matches':True})
(BASE/'journal-comparisons.json').write_text(json.dumps({'binding':binding,'results':results},indent=2)+'\n');print(results)

from pathlib import Path
import json,math,os
run=Path(os.environ['TD_WRITER_RUN']);kinds=['count','grouped_count','projection']
def near(a,b):assert math.isclose(a,b,rel_tol=1e-9,abs_tol=1e-6),(a,b)
def load(role):
 raw=json.loads((run/role/'result.json').read_text());assert raw['status']=='passed'
 assert len(raw['stages'])==1;stage=raw['stages'][0];assert stage['status']=='passed' and len(stage['cells'])==10
 fixed={};mixed=None
 for c in stage['cells']:
  assert c['status']=='passed' and c['errors']==[] and c['writeAcknowledgementErrors']==[]
  n=c['readerCount'];assert c['pool']['after']==dict(capacity=n,available=n,active=0,waiting=0)
  xs=sorted(s['elapsedMs'] for s in c['samples']);assert xs
  q=lambda f:xs[max(0,math.ceil(f*len(xs))-1)]
  near(q(.5),c['latencyMs']['p50']);near(q(.99),c['latencyMs']['p99'])
  near(len(xs)*1000/c['wallMs'],c['throughputQueriesPerSecond'])
  for s in [c['firstReadAfterOpen'],*c['samples']]:
   assert s and s['route']=='sql' and s['reason'].startswith('owned_')
   assert s['rows']==dict(count=1,grouped_count=8,projection=256)[s['kind']]
   assert 39087<=int(s['position'])<=39087+len(c['writes'])
   if not c['mixedIngestion']or s['cut']=='fixed':assert int(s['position'])==39087
  if c['mixedIngestion']:assert mixed is None;mixed=c
  else:
   assert len(xs)==5*n and c['kind'] in kinds
   assert (n,c['kind'])not in fixed;fixed[n,c['kind']]=c
 assert len(fixed)==9 and mixed and mixed['readerCount']==16
 m=mixed;assert m['finalReadVerified'] and m['reopenVerified'] and not m['writeLimitReached']
 assert {s['kind']for s in m['samples']}==set(kinds) and any(s['cut']=='fixed'for s in m['samples'])
 assert {s['reader']for s in m['samples']}==set(range(16))
 w=m['writes'];assert w and len({v['commandId']for v in w})==len(w)
 assert all(int(v['position'])==39088+i and not v['reconciled']for i,v in enumerate(w))
 span=w[-1]['startOffsetMs']+w[-1]['elapsedMs']-w[0]['startOffsetMs'];near(span,m['writeBurstDurationMs'])
 full=math.floor(m['wallMs']/10000)
 for i in range(full):assert any(i*10000<=v['startOffsetMs']+v['elapsedMs']<(i+1)*10000 for v in w)
 return fixed,m,len(w)*1000/span
b,bm,bw=load('sdk_control');a,am,aw=load('cpp_candidate');g=[]
def gate(name,actual,limit,minimum=False):g.append(dict(name=name,actual=actual,limit=limit,passed=actual>=limit if minimum else actual<=limit))
for n in [1,4,16]:
 for kind in kinds:gate(f'fixed_{kind}_{n}_p50_relative',a[n,kind]['latencyMs']['p50'],1.15*b[n,kind]['latencyMs']['p50'])
for n in [4,16]:
 for kind in kinds:gate(f'fixed_{kind}_{n}_p99_relative',a[n,kind]['latencyMs']['p99'],1.20*b[n,kind]['latencyMs']['p99'])
for n,limit in [(1,19),(16,115)]:gate(f'projection_{n}_p50_absolute',a[n,'projection']['latencyMs']['p50'],limit)
gate('projection_16_p99_absolute',a[16,'projection']['latencyMs']['p99'],185)
gate('mixed_qps_relative',am['throughputQueriesPerSecond'],.90*bm['throughputQueriesPerSecond'],True)
gate('mixed_qps_absolute',am['throughputQueriesPerSecond'],4.8,True)
for key,limit in [('p50',3200),('p99',6500)]:
 gate('mixed_'+key+'_relative',am['latencyMs'][key],1.15*bm['latencyMs'][key]);gate('mixed_'+key+'_absolute',am['latencyMs'][key],limit)
gate('ack_rate_relative',aw,.90*bw,True);gate('ack_count_absolute',len(am['writes']),40,True)
gate('mixed_rss_absolute',am['resources']['maxSampledRssBytes'],3500000000)
assert len(g)==27
control_absolute=dict(projection_1_p50=b[1,'projection']['latencyMs']['p50']<=19,
 projection_16_p50=b[16,'projection']['latencyMs']['p50']<=115,projection_16_p99=b[16,'projection']['latencyMs']['p99']<=185,
 mixed_qps=bm['throughputQueriesPerSecond']>=4.8,mixed_p50=bm['latencyMs']['p50']<=3200,
 mixed_p99=bm['latencyMs']['p99']<=6500,ack_count=len(bm['writes'])>=40,mixed_rss=bm['resources']['maxSampledRssBytes']<=3500000000)
summary=dict(schema='td.native-writer-broad-mechanism/1',status='passed'if all(x['passed']for x in g)else'failed_budget',
 roles=['sdk_control_v2_18contexts','cpp_candidate_v2_18contexts'],gates=g,passed=sum(x['passed']for x in g),
 controlAbsolute=control_absolute,controlAbsoluteMisses=[name for name,passed in control_absolute.items()if not passed],
 mixedRssRatio=am['resources']['maxSampledRssBytes']/bm['resources']['maxSampledRssBytes'],
 maxFixedRss=dict(control=max(c['resources']['maxSampledRssBytes']for c in b.values()),candidate=max(c['resources']['maxSampledRssBytes']for c in a.values())),
 control=dict(qps=bm['throughputQueriesPerSecond'],p50=bm['latencyMs']['p50'],p99=bm['latencyMs']['p99'],acks=len(bm['writes']),ackRate=bw,rss=bm['resources']['maxSampledRssBytes']),
 candidate=dict(qps=am['throughputQueriesPerSecond'],p50=am['latencyMs']['p50'],p99=am['latencyMs']['p99'],acks=len(am['writes']),ackRate=aw,rss=am['resources']['maxSampledRssBytes']))
with(run/'summary-first.json').open('x')as f:json.dump(summary,f,indent=2);f.write('\n')

# [DX-B6] Why: publish summaries derived from retained raw observations, preserving sample denominators.
# Rejected: summing percentiles as if they were one observed commit.
import json,pathlib,statistics,sys
root=pathlib.Path(sys.argv[1]);out={}
for p in root.glob('*/driver/lone-commit.json'):
 d=json.loads(p.read_text()); phases={}
 for phase in d['samples']:
  rows=phase['rows']; accounted=[]; sockets=[]; optimistic=[]
  for r in rows:
   diag=r.get('diagnostic'); hs=[h for h in r['http'] if h['path'].endswith('/transact')]
   if not diag or not hs:continue
   h=hs[-1];a=diag['attempts'][-1]
   parts=([diag['started']-r['offeredAt']] if 'offeredAt' in r else [])+[a['ready']-diag['started'],a['released']-a['ready'],h['written']-a['released'],h['headers']-h['written'],diag['returned']-h['headers']]
   accounted.append(sum(parts)/r['ms']);sockets.append(h['reusedSocket']);optimistic.append(a['optimistic'])
  service=sorted((r['returnedAt']-r['started']) if 'returnedAt' in r else r['ms'] for r in rows)
  phases[phase['name']]={**d['phases'][phase['name']], 'serviceLatency':{'n':len(service),'p50':service[int(len(service)*.5)],'p99':service[int(len(service)*.99)]}, 'accountedWallMedian':statistics.median(accounted),'accountedWallMinimum':min(accounted),'socketReuseFraction':sum(sockets)/len(sockets),'optimisticFraction':sum(optimistic)/len(optimistic)}
 out[str(p)]={'scope':d['scope'],'phases':phases}
pathlib.Path(sys.argv[2]).write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))

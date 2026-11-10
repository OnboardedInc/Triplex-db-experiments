# [DX-B8] Why: attribute sampled leaf costs to their actual first gateway caller within exact phase boundaries.
# Rejected: assigning Datomic internals to a suspected caller without its captured stack.
import collections,datetime,json,pathlib,sys
recording=pathlib.Path(sys.argv[1]);events=json.loads(recording.read_text())['recording']['events']
def stamp(s):return datetime.datetime.fromisoformat(s.replace('Z','+00:00'))
def frame(f):
 m=f['method'];return m['type']['name']+'.'+m['name']
phases={}
for name in sys.argv[2:]:
 p=pathlib.Path(name)
 if p.exists():
  for k,v in json.loads(p.read_text())['phases'].items():
   if 'startedAt' in v:phases[k]=(stamp(v['startedAt']),stamp(v['finishedAt']))
result={}
for name,bounds in {'all':None,**phases}.items():
 counts=collections.Counter();total=0;missing=0;truncated=0
 for event in events:
  if event['type']!='jdk.ExecutionSample':continue
  v=event['values']
  if bounds and not bounds[0]<=stamp(v['startTime'])<=bounds[1]:continue
  trace=v.get('stackTrace') or {};frames=list(map(frame,trace.get('frames',[])))
  if not frames:continue
  total+=1;truncated+=bool(trace.get('truncated'))
  caller=next((f for f in frames if f.startswith(('triplex/gateway/','triplex.gateway.'))),None)
  if caller is None:missing+=1
  counts[(frames[0],caller or '<no gateway frame captured>')]+=1
 result[name]={'samples':total,'withoutGatewayCaller':missing,'truncatedStacks':truncated,'gatewayTop15':[{'leaf':k[0],'gatewayCaller':k[1],'samples':n} for k,n in counts.most_common() if k[1]!='<no gateway frame captured>'][:15],'top15':[{'leaf':k[0],'gatewayCaller':k[1],'samples':n} for k,n in counts.most_common(15)]}
print(json.dumps(result,indent=2))

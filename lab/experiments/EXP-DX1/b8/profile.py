# [DX-B8] Why: attribute sampled leaf costs to their actual first gateway caller within exact phase boundaries.
# Rejected: assigning Datomic internals to a suspected caller without its captured stack.
import collections,datetime,json,pathlib,sys
# [DX-B8] Why: multi-hundred-MB recordings must not expand into a host-sized Python object graph.
# Rejected: json.loads of the complete recording (large allocations contaminate a shared measurement host).
def event_stream(path):
 decoder=json.JSONDecoder()
 with path.open() as stream:
  buffer='';done=False
  def more():
   nonlocal buffer,done
   chunk=stream.read(1024*1024)
   if not chunk:done=True
   buffer+=chunk
  while '"events"' not in buffer:
   more()
   if done:raise ValueError('missing events')
  prefix,buffer=buffer.split('"events"',1)
  if prefix.strip()!='{ "recording": {' and ''.join(prefix.split())!='{"recording":{':raise ValueError('unexpected recording envelope')
  while '[' not in buffer:
   more()
   if done:raise ValueError('missing event array')
  before,buffer=buffer.split('[',1)
  if before.strip()!=':':raise ValueError('unexpected event array')
  first=True
  while True:
   buffer=buffer.lstrip()
   if not buffer and not done:more();continue
   if buffer.startswith(']'):
    buffer=buffer[1:]
    while not done:more()
    if ''.join(buffer.split())!='}}':raise ValueError('truncated recording envelope')
    return
   if not first:
    if not buffer.startswith(','):raise ValueError('missing event separator')
    buffer=buffer[1:].lstrip()
   while True:
    try:event,end=decoder.raw_decode(buffer);break
    except json.JSONDecodeError:
     if done:raise
     more()
   buffer=buffer[end:];first=False
   yield event
recording=pathlib.Path(sys.argv[1])
def stamp(s):return datetime.datetime.fromisoformat(s.replace('Z','+00:00'))
def frame(f):
 m=f['method'];return m['type']['name']+'.'+m['name']
phases={}
for name in sys.argv[2:]:
 p=pathlib.Path(name)
 if p.exists():
  for k,v in json.loads(p.read_text())['phases'].items():
   if 'startedAt' in v:phases[k]=(stamp(v['startedAt']),stamp(v['finishedAt']))
acc={name:{'counts':collections.Counter(),'total':0,'missing':0,'truncated':0,'bounds':bounds} for name,bounds in {'all':None,**phases}.items()}
for event in event_stream(recording):
 if event['type']!='jdk.ExecutionSample':continue
 v=event['values'];trace=v.get('stackTrace') or {};frames=list(map(frame,trace.get('frames',[])))
 if not frames:continue
 caller=next((f for f in frames if f.startswith(('triplex/gateway/','triplex.gateway.'))),None)
 when=stamp(v['startTime'])
 for a in acc.values():
  bounds=a['bounds']
  if bounds and not bounds[0]<=when<=bounds[1]:continue
  a['total']+=1;a['truncated']+=bool(trace.get('truncated'));a['missing']+=caller is None
  a['counts'][(frames[0],caller or '<no gateway frame captured>')]+=1
result={}
for name,a in acc.items():
 counts=a['counts']
 result[name]={'samples':a['total'],'withoutGatewayCaller':a['missing'],'truncatedStacks':a['truncated'],'gatewayTop15':[{'leaf':k[0],'gatewayCaller':k[1],'samples':n} for k,n in counts.most_common() if k[1]!='<no gateway frame captured>'][:15],'top15':[{'leaf':k[0],'gatewayCaller':k[1],'samples':n} for k,n in counts.most_common(15)]}
print(json.dumps(result,indent=2))

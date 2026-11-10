import sys,json,gzip,pathlib,statistics,datetime,re,math,bisect,collections
# [DX-M1] Why: select each attempt's actual frozen burst and join successful positions to SDK diagnostics. Rejected: counting every diagnostic in a wall-clock range (includes seed/probe work).
def read(p):
 if p.exists():return p.read_text()
 return gzip.open(str(p)+'.gz','rt').read()
def lines(p):return [json.loads(l) for l in read(p).splitlines() if l]
def stats(xs):
 xs=sorted(xs)
 return dict(n=len(xs),total=sum(xs),max=max(xs,default=0))
def utc(ms):return datetime.datetime.fromtimestamp(ms/1000,datetime.timezone.utc).isoformat(timespec='milliseconds')
def analyze(root):
 report=json.loads(read(root/'driver/ns-report.json')); start=report['traceStartAbsMs']+120000; end=start+60000
 ws=[w for w in lines(root/'driver/ns-writes.jsonl') if w['burst'] and 'transactReturnedAt' in w]
 assert len(ws)==3350, f'expected frozen burst 3350, observed {len(ws)}'
 ms=sorted(w['transactReturnedAt']-w['transactCalledAt'] for w in ws)
 result=dict(run=root.name,burst=[utc(start),utc(end)],commits=len(ws),call=dict(p50=statistics.median(ms),p99=ms[math.ceil(.99*len(ms))-1],max=max(ms),over100=sum(x>100 for x in ms)))
 for role in ['gw-w','tx']:
  pauses=[]; safes=[]; alltimes=[]
  files=sorted(root.glob('gc-'+role+'.log*'))
  assert files, 'missing GC log'
  for f in files:
   text=gzip.open(f,'rt').read() if f.suffix=='.gz' else f.read_text()
   for l in text.splitlines():
    m=re.match(r'\[([^]]+)\]',l)
    if not m:continue
    at=datetime.datetime.fromisoformat(m[1]).timestamp()*1000;alltimes.append(at)
    # [DX-M1] Why: count duration-bearing top-level STW summaries, not their start/detail rows. Include a pause if its interval overlaps the burst.
    m=re.search(r'GC\(\d+\) (?:[A-Za-z]+:? )?Pause .*?([0-9.]+)ms$',l)
    if m:
     duration=float(m[1])
     if at>=start and at-duration<end:pauses.append(duration)
    m=re.search(r'Safepoint .*Total: (\d+) ns',l)
    if m:
     duration=int(m[1])/1e6
     if at>=start and at-duration<end:safes.append(duration)
  assert min(alltimes)<start and max(alltimes)>=end, f'incomplete {role} log coverage'
  assert pauses and safes, f'no recognized pauses/safepoints in {role}; inspect collector format'
  result[role]=dict(pauses=stats(pauses),safepoints=stats(safes))
 diag=lines(root/'driver/commit-phases.jsonl'); requests=lines(root/'driver/http-errors.jsonl')
 bypos={}
 for d in diag:
  for a in d['attempts']:
   for r in a['requests']:
    if r['path'].endswith('/transact') and r['status']==200 and 'position' in r:bypos.setdefault(r['position'],[]).append(d)
 retried=[];unbound=[]; reasons=collections.Counter(); conflicts=0; duplicates=0
 for w in ws:
  if w['resend']:
   assert w['outcome']=='duplicate-returned-original'
   duplicates+=1;continue
  ds=[d for d in bypos.get(w.get('position'),[]) if abs(d['epochOrigin']+d['returned']-w['transactReturnedAt'])<10]
  if len(ds)!=1:unbound.append(w.get('position'));continue
  d=ds[0]
  bad=[r for a in d['attempts'] for r in a['requests'] if r['status']==409]
  if bad:
   retried.append(w['seq']);conflicts+=len(bad)
   errors=[r for r in requests if r.get('operationId')==d['operationId'] and r['status']==409]
   assert len(errors)==len(bad), 'missing operation-bound 409 reason'
   for e in errors:reasons[(e.get('code'),e.get('message'))]+=1
 # [DX-M1] Why: Effect's shared scheduler can inherit another fiber's AsyncLocalStorage context. Rejected: treating that optional context as transaction identity; bind successful positions, operation IDs and return times instead.
 result['retry409']=dict(commits=len(retried),responses=conflicts,duplicates=duplicates,unbound=len(unbound),reasons=[dict(code=k[0],message=k[1],count=v) for k,v in reasons.items()])
 assert not unbound, f'unbound new commits: {unbound[:10]}'
 result['all409DuringBurstIncludingProbesReplays']=dict(collections.Counter(r.get('code') for r in requests if r.get('status')==409 and start<=r['at']<end))
 counters=lines(root/'driver/counters.jsonl');times=[c['epochMs'] for c in counters]; name=root.name+'-gw-w'
 def value(t):
  i=bisect.bisect_right(times,t);assert 0<i<len(times)
  lo,hi=counters[i-1],counters[i]
  vals=[int(re.search(r'usage_usec (\d+)',r['containers'][name]['cpu.stat'])[1]) for r in [lo,hi]]
  return vals[0]+(vals[1]-vals[0])*(t-times[i-1])/(times[i]-times[i-1])
 containers=json.loads(read(root/'containers.json'))
 result['actualConfiguration']=[dict(name=c['Name'],cpu=c['HostConfig']['CpusetCpus'],java=[e for e in c['Config']['Env'] if e.startswith(('DATOMIC_JAVA_OPTS=','JAVA_OPTS=','TX2_ENTITY_CACHE_BYTES=','TX2_REACH_SESSION_ENTRIES='))]) for c in containers]
 result['gwCpuSecondsInterpolated']=(value(end)-value(start))/1e6
 result['hostBefore']=lines(root/'host-before.jsonl')[-1]
 print(json.dumps(result,indent=2))
for path in sys.argv[1:]:analyze(pathlib.Path(path))

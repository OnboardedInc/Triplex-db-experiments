import sys,json,gzip,pathlib,statistics,datetime,re
root=pathlib.Path(sys.argv[1]); med=lambda a:round(statistics.median(a),4) if a else None

def read(p):
 if p.exists(): return p.read_text()
 return gzip.open(str(p)+'.gz','rt').read()

report=json.loads(read(root/'driver/ns-report.json'))
rows=[json.loads(l) for l in read(root/'driver/ns-writes.jsonl').splitlines() if l]
t0=report['traceStartAbsMs']
print('TRACE',datetime.datetime.fromtimestamp(t0/1000,datetime.timezone.utc).isoformat())
for name,pred in [('steady',lambda r:not r['burst']),('burst',lambda r:r['burst'])]:
 a=[r for r in rows if pred(r) and 'transactReturnedAt' in r]; ms=sorted(r['transactReturnedAt']-r['transactCalledAt'] for r in a)
 print(name,len(a),'call-to-return p50/p99/max',med(ms),ms[int(len(ms)*.99)] if ms else None,max(ms,default=0))
slow=sorted([r for r in rows if 'transactReturnedAt' in r],key=lambda r:r['transactReturnedAt']-r['transactCalledAt'],reverse=True)
for r in slow[:15]:print('SLOW',datetime.datetime.fromtimestamp(r['transactCalledAt']/1000,datetime.timezone.utc).isoformat(),round(r['transactReturnedAt']-r['transactCalledAt'],3),'offset',round((r['transactCalledAt']-t0)/1000,3),'wait',r['waitMs'])
if (root/'driver/lone-commit.json').exists():
 q=json.loads(read(root/'driver/lone-commit.json'))
 for phase in q['samples']:
  vals={}; n=phase['name']; times=[]
  def put(k,v): vals.setdefault(k,[]).append(v)
  for r in phase['rows']:
   d=r['diagnostic'];a=d['attempts'][-1];h=[h for h in r['http'] if h['path'].endswith('/transact') and h['status']==200][-1];t=h['gatewayTimeline']
   put('total',r['ms']);put('transactCallToReturn',r['returnedAt']-r.get('transactCalledAt',r['started']));put('offerToAdapter',d['started']-r['offeredAt']);put('callToAdapter',d['started']-r.get('transactCalledAt',r['started']));put('adapterReturnToTriplesReturn',r['returnedAt']-d['returned']);put('stage',a['ready']-d['started']);put('queue',a['released']-a['ready']);put('encodeAndSocketFinish',h['written']-a['released']);put('socketFinishToHeaders',h['headers']-h['written']);put('headersToParsed',h['finished']-h['headers']);put('parsedToReturn',d['returned']-h['finished']);put('gatewayParse',h['parseMicros']/1000);put('gatewayPrepare',t['payloadPrepared']/1000);put('gatewayPredecessor',(t['predecessorReady']-t['payloadPrepared'])/1000);put('gatewaySubmission',(t['submitted']-t['predecessorReady'])/1000);put('nativeFuture',(t['completed']-t['submitted'])/1000);put('gatewayFinish',(t['responsePrepared']-t['completed'])/1000);put('httpTotal',h['finished']-h['started']);times.append(r['epochOrigin']+r['started'])
  print('Q3',n,len(times),datetime.datetime.fromtimestamp(min(times)/1000,datetime.timezone.utc).isoformat(),datetime.datetime.fromtimestamp(max(times)/1000,datetime.timezone.utc).isoformat(),{k:med(v) for k,v in vals.items()})
  # [DX-M1] Why: correlate PostgreSQL duration lines to this phase's actual commit intervals. Rejected: pooling seed and phase statements.
  groups={};insert=[]
  for line in read(root/'pg.log').splitlines():
   m=re.search(r'(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+) UTC.*duration: ([\d.]+) ms\s+(.*)',line)
   if not m:continue
   at=datetime.datetime.fromisoformat(m[1]).replace(tzinfo=datetime.timezone.utc).timestamp()*1000
   if min(times)<=at<=max(r['epochOrigin']+r['returnedAt'] for r in phase['rows']):
    sql=m[3]
    if re.search(r'^execute .*?\binsert\b',sql,re.I):insert.append(float(m[2]))
    key=re.sub(r'(?:\$\d+|\b\d+\b)','?',sql)[:180]
    groups.setdefault(key,[]).append(float(m[2]))
  print('PG_INSERT_EXECUTE',n,'count',len(insert),'medianMs',med(insert))
  txApply=[];txProcess=[]
  for line in read(root/'tx-internal/2026-11-10.log').splitlines():
   m=re.match(r'(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+)',line)
   if not m or ':event :tx/process' not in line:continue
   at=datetime.datetime.fromisoformat(m[1]).replace(tzinfo=datetime.timezone.utc).timestamp()*1000
   if min(times)<=at<=max(r['epochOrigin']+r['returnedAt'] for r in phase['rows']):
    a=re.search(r':apply-msec ([\d.]+)',line);b=re.search(r':msec ([\d.]+)',line)
    if a:txApply.append(float(a[1]))
    if b:txProcess.append(float(b[1]))
  print('TX_PROCESS',n,'count',len(txApply),'applyMedianMs',med(txApply),'processMedianMs',med(txProcess))

  for k,v in sorted(groups.items(),key=lambda kv:-len(kv[1]))[:15]:print('PG',n,len(v),med(v),k)


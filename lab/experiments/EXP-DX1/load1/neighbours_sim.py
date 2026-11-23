"""[DX-LOAD2] Trace-driven replay of the rolling 6 fair-import cell, used to compare importer policies.

Usage: python3 -I neighbours_sim.py SUMMARY_DIR RAW_DIR 'JSON list of cases'
Each case names a policy ("fair" or "yield") and optional knobs (width, limit, slow_ms, small, pause_ms,
fmodel "count"|"time", stall_on, cache). Service times are drawn from the measured cell: save apply by
time since the last index adoption, frame apply by frames since the adoption (or by time), measured
client/gateway overheads before and after the writer, and the observed 100 ms+ writer stalls replayed
at their observed times. The writer applies one transaction at a time; log appends are pipelined.
It under-predicts the measured fair cell (225 against 286 ms second-half busy p99), so read its
numbers as ratios between policies, not as forecasts. Standard library only.
"""
import json,sys,heapq,random,bisect,statistics as st,collections,glob,os
SUMMARY,RAW=sys.argv[1],sys.argv[2]
T=glob.glob(os.path.join(RAW,'result/engines/*/trace/raw'))[0]+'/'
OFF=next(json.loads(l)['clock']['offsetMs'] for l in open(T+'tx.jsonl') if '"clock"' in l)
MODE='rolling6'
d=json.load(open(os.path.join(RAW,f'result/{MODE}-import-raw.json')))
START=json.load(open(os.path.join(SUMMARY,f'result/{MODE}-import.json')))['start']
nat={}
for line in open(T+'prep1-native.ndjson'):
  e=json.loads(line)
  if 'members' not in e: continue
  for m in e['members']:
    nat[int(m['t'])]=dict(read=m['read-at']/1e6+OFF,start=m['started-at']/1e6+OFF,applied=m['applied-at']/1e6+OFF,ls=e['start']/1e6+OFF,le=e['end']/1e6+OFF)
AD=sorted(json.loads(l)['end']-START for l in open(T+'tx.jsonl') if '"index-adoption"' in l)
def since(t):
  i=bisect.bisect_right(AD,t)-1; return t-AD[i] if i>=0 else 1e9
STALL=100.0
# stall intervals (writer blocked) from observed long applies/log appends of saves
stalls=[]
for s in d['saves']:
  n=nat[int(s['receipt']['t'])]
  a=n['applied']-n['start']; lg=n['le']-n['ls']
  if a>=STALL: stalls.append((n['start']-START,a))
  if lg>=STALL: stalls.append((n['ls']-START,lg))
stalls=sorted(set((round(a,1),round(b,1)) for a,b in stalls))
# empirical distributions
SB=[0,1000,2000,4000,8000,15000,1e12]
def sb(t): return bisect.bisect_right(SB,t)-1
save_apply=collections.defaultdict(list); save_pre=[]; save_post=[]
for s in d['saves']:
  n=nat[int(s['receipt']['t'])]; a=n['applied']-n['start']
  if a>=STALL: continue
  save_apply[sb(since(n['start']-START))].append(a)
  save_pre.append(n['read']-s['dispatched']); save_post.append(s['end']-n['applied'])
# frames by frames-since-adoption
FB=[0,1,5,20,50,100,200,500,1e12]
def fb(k): return bisect.bisect_right(FB,k)-1
fr_apply=collections.defaultdict(list); fr_apply_t=collections.defaultdict(list); fr_pre=[]; fr_post=[]
cnt=0; last=-1
for f in sorted(d['imported'],key=lambda f:f['at']):
  n=nat[int(f['receipt']['t'])]
  i=bisect.bisect_right(AD,n['start']-START)-1
  if i!=last: cnt=0; last=i
  a=n['applied']-n['start']
  if a<STALL or cnt<3: fr_apply[fb(cnt)].append(a); fr_apply_t[sb(since(n['start']-START))].append(a)
  cnt+=1
  fr_pre.append(n['read']-f['at']); fr_post.append(f['at']+f['holdMs']-n['applied'])
arr=sorted((s['due']-START,s['account']) for s in d['saves'])
def run(policy,seed=1,limit=1,width=32,frame_scale=1.0,save_scale=1.0,post_scale=1.0,stall_on=True,cost_share=None,verbose=False,fmodel='count',slow_ms=None,small=8,fixed=0.8,pause_ms=0,cache=False):
  rnd=random.Random(seed)
  pick=lambda L: L[rnd.randrange(len(L))]
  NACC=10; IMP=10; CREDITS=6
  queues=[collections.deque() for _ in range(NACC)]
  served=[0]*(NACC+1); recent=collections.deque()
  active={} ; neighbours=0; imp_active=0; imp_due=0.0; imp_next_ok=0.0
  ev=[]; seq=0
  def push(t,kind,data):
    nonlocal seq; seq+=1; heapq.heappush(ev,(t,seq,kind,data))
  for t,a in arr: push(t,'arrive',a)
  if stall_on:
    for t,dur in stalls: push(t,'stall',dur)
  # writer
  wq=collections.deque(); wbusy_until=0.0; wbusy=False
  frames_since=[0]; cur_ad=[-1]; cur_w=[width]; facts=[]
  lat=[]; imp_done=[]
  def frame_apply(t):
    i=bisect.bisect_right(AD,t)-1
    if i!=cur_ad[0]: cur_ad[0]=i; frames_since[0]=0
    k=frames_since[0]; frames_since[0]+=1
    base=pick(fr_apply[fb(k)]) if fmodel=='count' else pick(fr_apply_t[sb(since(t))])
    w=cur_w[0]
    return (min(fixed,base)+max(0.0,base-fixed)*w/32)*frame_scale
  def writer_start(t):
    nonlocal wbusy
    if wbusy or not wq: return
    item=wq.popleft(); wbusy=True
    if item[0]=='stall': dur=item[1]
    elif item[0]=='save':
      dur=pick(save_apply[sb(since(t))])*save_scale
      if cache and since(t)>=4000: dur=min(dur,pick(save_apply[sb(since(t))]))*0.5
    else: dur=frame_apply(t)
    push(t+dur,'applied',item)
  def ready_list(t):
    L=[]
    for a in range(NACC):
      if queues[a]: L.append((a,queues[a][0][0]))
    live_waiting=any(queues[a] for a in range(NACC))
    imp_ok = t<300000 and imp_active<limit and t>=imp_next_ok
    if policy in ('yield','yield-cost') and live_waiting: imp_ok=False
    if imp_ok: L.append((IMP,imp_due))
    return L
  def dispatch(t):
    nonlocal neighbours,imp_active,imp_due
    while len(active)<CREDITS:
      nxt=None
      for a,due in ready_list(t):
        if a==0: nxt=(a,due); break
        if neighbours>=CREDITS-1: continue
        if nxt is None or served[a]<served[nxt[0]] or (served[a]==served[nxt[0]] and due<nxt[1]): nxt=(a,due)
      if nxt is None: return
      a=nxt[0]; tk=object(); active[tk]=a
      if a!=0: neighbours+=1
      recent.append(a); served[a]+=1
      if len(recent)>NACC+1: served[recent.popleft()]-=1
      if a==IMP:
        imp_active+=1; imp_due=t
        push(t+pick(fr_pre),'atwriter',('frame',tk,t,cur_w[0]))
      else:
        due=queues[a].popleft()[0]
        push(t+pick(save_pre),'atwriter',('save',tk,due,a))
  while ev:
    t,_,kind,data=heapq.heappop(ev)
    if kind=='arrive':
      queues[data].append((t,)); dispatch(t)
    elif kind=='stall':
      wq.appendleft(('stall',data)) ; writer_start(t)
    elif kind=='atwriter':
      wq.append(data); writer_start(t)
    elif kind=='applied':
      wbusy=False
      if data[0]=='save': push(t+pick(save_post)*post_scale,'done',data)
      elif data[0]=='frame': push(t+pick(fr_post)*post_scale,'done',data)
      writer_start(t)
    elif kind=='done':
      tk=data[1]; a=active.pop(tk)
      if a!=0: neighbours-=1
      if data[0]=='save': lat.append((data[2],a,t-data[2]))
      else:
        imp_active-=1; imp_done.append((t,t-data[2],data[3]))
        hold=t-data[2]
        if slow_ms is not None:
          cur_w[0]=small if hold>slow_ms else width
        if pause_ms and hold>slow_ms:
          imp_next_ok=t+pause_ms; push(imp_next_ok,'tick',None)
        if policy=='yield-cost' and cost_share:
          imp_next_ok=t+max(0.0,hold-10.0)*(1/cost_share-1)
          push(imp_next_ok,'tick',None)
      dispatch(t)
    elif kind=='tick':
      dispatch(t)
  def p99(v):
    v=sorted(v); return v[max(0,int(len(v)*0.99+0.999999)-1)] if v else float('nan')
  out={}
  for nm,(a,b) in {'whole':(0,300000),'H1':(0,150000),'H2':(150000,300000)}.items():
    out[nm+'_busy']=p99([l for due,acc,l in lat if acc!=0 and a<=due<b])
    out[nm+'_quiet']=p99([l for due,acc,l in lat if acc==0 and a<=due<b])
    out[nm+'_fps']=sum(w for t,h,w in imp_done if a<=t<b)/((b-a)/1000)
  return out
if __name__=='__main__':
  import itertools
  cases=json.loads(sys.argv[3])
  for c in cases:
    pol=c.pop('policy')
    rs=[run(pol,seed=sd,**c) for sd in (1,2,3,4,5)]
    print(pol,c,{k:round(st.mean(r[k] for r in rs),1) for k in rs[0] if not k.startswith('H1')})

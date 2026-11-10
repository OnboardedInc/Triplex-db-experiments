#!/usr/bin/env python3
# [XN-S2-LIVE] Why: derive every diagnostic bar comparison from a fresh source/content/binding-checked collection, retaining missing cells. Rejected: hand-copying selected fast quantiles or calling an incomplete matrix met.
import json,pathlib,subprocess,sys
BASE=pathlib.Path(__file__).resolve().parent
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/live')
subprocess.run([sys.executable,str(BASE/'collect.py')],check=True,capture_output=True)
x=json.loads((ROOT/'collected.json').read_text());assert not x['invalid'];rows=x['rows']
def fmt(v):return 'unmeasured' if v is None else f'{v:,.2f}'
def choose(test):
 a=[r for r in rows if test(r)];assert len(a)<=1,('ambiguous repeated observations',[r['path'] for r in a]);return a[0] if a else None
def opened(stage,on,rate,n):return choose(lambda r:r['window'].startswith(stage+'-') and r['name'].startswith('open-') and r['keepAwake']==on and r['rate']==rate and r['readerCount']==n)
def pair(r):return f"{fmt(r['latency']['p50'])} / {fmt(r['latency']['p99'])}" if r else 'unmeasured'
def status(ok):return 'met' if ok else 'missed'
q1=[opened('q1',on,rate,n) for on in [False,True] for rate in [15,55] for n in [0,16,64,256]]
lag=[opened('lag',on,rate,n) for on in [False,True] for rate in [15,55] for n in [0,256]]
reads=[r for r in rows if r['window'].startswith('reads-') and r['name'].startswith('read-')]
wait=choose(lambda r:r['name']=='wait-mechanism')
ratios=[]
for on in [False,True]:
 for rate in [15,55]:
  a,b=opened('q1',on,rate,0),opened('q1',on,rate,256)
  if a and b:ratios.append(b['latency']['p99']/a['latency']['p99'])
head=[]
if all(q1):
 head.append(f"Q1 worst 256/0 p99 {max(ratios):.2f}× ({status(max(ratios)<=1.25)}); worst p50/p99 {max(r['latency']['p50'] for r in q1):.2f}/{max(r['latency']['p99'] for r in q1):.2f} ms ({status(all(r['latency']['p50']<=10 and r['latency']['p99']<=50 for r in q1))})")
else:
 observed=[r for r in q1 if r]
 head.append(f"Q1 {len(observed)}/16 cases; measured worst p50/p99 {max(r['latency']['p50'] for r in observed):.2f}/{max(r['latency']['p99'] for r in observed):.2f} ms (P2 {status(all(r['latency']['p50']<=10 and r['latency']['p99']<=50 for r in observed))} in measured cases), 256/0 ratio unmeasured" if observed else 'Q1 unmeasured')
if len(reads)==12:
 peak=max(r['latency']['p99'] for r in reads if r['clients']==256)
 p4=min(r['pullsPerSecond']/4 for r in reads if r['clients']==256)
 good=all(choose(lambda r:r in reads and r['requestedKind']==kind and r['clients']==256)['pullsPerSecond']>=choose(lambda r:r in reads and r['requestedKind']==kind and r['clients']==64)['pullsPerSecond'] for kind in ['a','c','e','f'])
 head.append(f"Q2 worst 256-reader p99 {peak:.2f} ms ({status(peak<=100)}), 64→256 goodput {status(good)}, worst {p4:.2f} pulls/s/allocated core ({status(p4>=1100)})")
else:head.append(f'Q2 {len(reads)}/12 cases; full bars unmeasured')
head.append(f"Q3 worst visibility p99 {max(r['lag']['p99'] for r in lag):.2f} ms ({status(all(r['lag']['p99']<=250 for r in lag))})" if all(lag) else f"Q3 {sum(r is not None for r in lag)}/8 cases; lag bar unmeasured")
head.append(f"Q4 await+pull p99 {wait['latency']['p99']:.2f} ms, exact-basis values verified" if wait else 'Q4 exact-basis mechanism verified; cost unmeasured')
loaded=[r for r in q1 if r]
head.append(f"Q5 Kafka {max(r['cpuSeconds']['tx2-xns2-kafka']/(r['elapsedMs']/1000) for r in loaded):.3f} cores / {max(r['memory']['tx2-xns2-kafka']['current']/1048576 for r in loaded):.1f} MiB in measured cases; no separate cost bar" if loaded else 'Q5 loaded component cost unmeasured')
out=['## Same-day single-node controls','', 'All timing pairs below are p50 / p99 milliseconds. These controls use the AWS image and a Local log/storage, not the earlier standalone image.','', '| Keeper | Offered/s | Same-node readers | AWS Local p50 / p99 | Historical S1 p50 / p99 |','| --- | ---: | ---: | ---: | ---: |']
for on in [False,True]:
 for rate,n in [(15,0),(55,0),(55,16)]:
  r=opened('control-commits',on,rate,n);old={(15,0):'16.47 / 90.25',(55,0):'7.88 / 38.95',(55,16):'16.08 / 90.70'}[(rate,n)]
  out.append(f"| {'on' if on else 'off'} | {rate} | {n} | {pair(r)} | {old} (no keeper) |")
out+=['','Closed-loop 1,000-command AWS controls (keeper on):','', '| Shape / history | p50 / p99 | n |','| --- | ---: | ---: |']
for r in rows:
 if r['name'].startswith('closed-'):out.append(f"| {r['name']} | {pair(r)} | {r['n']} |")
out+=['','## Q1: writer latency and isolation','', '| Keeper | Offered/s | Read-node readers | p50 / p99 | p99 / same-arm zero-reader | P2 ≤10/50 ms |','| --- | ---: | ---: | ---: | ---: | --- |']
for on in [False,True]:
 for rate in [15,55]:
  base=opened('q1',on,rate,0)
  for n in [0,16,64,256]:
   r=opened('q1',on,rate,n);ratio=r['latency']['p99']/base['latency']['p99'] if r and base else None
   out.append(f"| {'on' if on else 'off'} | {rate} | {n} | {pair(r)} | {fmt(ratio)} | {status(r['latency']['p50']<=10 and r['latency']['p99']<=50) if r else 'unmeasured'} |")
out+=['','The 256/0 ratio bar is ≤1.25; compare within the same rate and keeper arm. A ratio met against a slow baseline does not satisfy the absolute latency bar. Historical S1 reached 2.33× at only 16 readers (55/s); it did not measure 256. These are single windows, not repeated-run confidence bounds.','', '## Q3: ACK-to-observed follower visibility','', '| Keeper | Offered/s | Application readers | ACK count | Visible p50 / p99 | ≤250 ms p99 |','| --- | ---: | ---: | ---: | ---: | --- |']
for on in [False,True]:
 for rate in [15,55]:
  for n in [0,256]:
   r=opened('lag',on,rate,n)
   out.append(f"| {'on' if on else 'off'} | {rate} | {n} | {r['n'] if r else 'unmeasured'} | {fmt(r['lag']['p50'])+' / '+fmt(r['lag']['p99']) if r else 'unmeasured'} | {status(r['lag']['p99']<=250) if r else 'unmeasured'} |")
out+=['','Visibility is the first read-node response containing all three exact expected payloads. The upper bound includes polling, RPC and a pool of 16 observer connections in addition to 0/256 application readers. It is not isolated ingestion latency, an ordered feed, or a change-feed resumption test. S1 has no separate-node comparator.','', '## Q2: pull latency and throughput','', '| Pull | Read-node clients | p50 / p99 ms | pulls/s | pulls/s / four engine cores | 256 p99 / goodput / P4 bars |','| --- | ---: | ---: | ---: | ---: | --- |']
labels={'a':'1,500 B current','c':'135,000 B current','e':'1,500 B past per pull','f':'135,000 B past per pull'}
for kind in ['a','c','e','f']:
 for n in [16,64,256]:
  r=choose(lambda r:r in reads and r['requestedKind']==kind and r['clients']==n)
  baseline=choose(lambda r:r in reads and r['requestedKind']==kind and r['clients']==64)
  bar='unmeasured' if not r else 'at 256 only' if n!=256 else f"{status(r['latency']['p99']<=100)} / {status(r['pullsPerSecond']>=baseline['pullsPerSecond']) if baseline else 'unmeasured'} / {status(r['pullsPerSecond']/4>=1100)}"
  out.append(f"| {labels[kind]} | {n} | {pair(r)} | {fmt(r['pullsPerSecond'] if r else None)} | {fmt(r['pullsPerSecond']/4 if r else None)} | {bar} |")
out+=['','Each live Q2 case offers 55 guarded atomic commits/s while pulling 20,000 documents. Writer offered/ACK counts and queue-inclusive latency remain in the raw results. Past reads use a new per-query SETTING with the completed seed snapshot token and clock. The seed documents are immutable; the separate topology and Q4 probes verify changing values at distinct bases. This does not sample a distribution of many historical ages.','', '| AWS Local control pull | Clients | p50 / p99 | pulls/s |','| --- | ---: | ---: | ---: |']
for r in rows:
 if r['window'].startswith('control-reads-') and r['name'].startswith('read-'):out.append(f"| {r['requestedKind']} | {r['clients']} | {pair(r)} | {fmt(r['pullsPerSecond'])} |")
out+=['','Control kinds: a small; b 95 small documents (one pull); c large; d small past-basis transaction; e small inline past basis. Historical S1 at 16 clients: small 3.32/14.91 ms and 3,946.29 pulls/s; large 5.19/13.26 ms and 2,790.71 pulls/s; small past transaction 4.37/12.63 ms and 3,275.42 pulls/s. S1 had no keeper or 256-reader case.','', '## Q5: loaded component cost','', '| Keeper / offered/s / readers | Component | Mean CPU cores in window | Memory current / lifetime peak MiB |','| --- | --- | ---: | ---: |']
for r in q1:
 if not r:continue
 for name,seconds in r['cpuSeconds'].items():
  m=r['memory'][name]
  out.append(f"| {'on' if r['keepAwake'] else 'off'} / {r['rate']} / {r['readerCount']} | {name} | {seconds/(r['elapsedMs']/1000):.3f} | {m['current']/1048576:.1f} / {m['peak']/1048576:.1f} |")
out+=['','CPU is cgroup CPU-seconds / case elapsed-seconds; memory is cgroup resident/accounted current and container-lifetime peak, not Java heap alone. Sum all four components for the engine; allocation remains four cores. Keeper and client CPU are outside these engine cgroups. Keeper-on uses eight SCHED_IDLE VM workers, explicitly excluded from component CPU totals. Historical broker-only idle floor was 0.040 cores and 290–295 MiB, not a loaded comparison.','', '| Keeper / offered/s | Two-node minus matched Local p50 / p99 ms (zero readers) |','| --- | ---: |']
for on in [False,True]:
 for rate in [15,55]:
  a,b=opened('q1',on,rate,0),opened('control-commits',on,rate,0)
  out.append(f"| {'on' if on else 'off'} / {rate} | {fmt(a['latency']['p50']-b['latency']['p50'])+' / '+fmt(a['latency']['p99']-b['latency']['p99']) if a and b else 'unmeasured'} |")
out+=['','The difference includes Kafka, S3, remote topology and the extra node; it does not isolate a Kafka-only causal latency increment. There is no provisional standalone Kafka CPU/memory bar.','', '## Q4: exact basis and waiting for a transaction','', 'The writer exposes `SHOW LATEST_SUBMITTED_TX` with `await_token`. On the reader, `BEGIN READ ONLY WITH (AWAIT_TOKEN=…, SNAPSHOT_TOKEN=…, CLOCK_TIME=TIMESTAMP …)` waits, pins the basis, then executes the point read and COMMIT. `SETTING SNAPSHOT_TOKEN=…, CLOCK_TIME=… SELECT …` pins one query without a separate transaction. Token acceptance alone is insufficient: the probes check the changing value at both bases.','', '| Mechanism | n | p50 / p99 ms | Historical S1 |','| --- | ---: | ---: | --- |',f"| fresh await + pinned point read + COMMIT | {wait['n'] if wait else 'unmeasured'} | {pair(wait)} | no cross-node wait measurement |"]
if wait:
 raw=json.loads((ROOT/wait['path']).read_text());out.append(f"| ACK to verified response, including three metadata RPCs | {wait['n']} | {fmt(raw['ackToObserved']['p50'])} / {fmt(raw['ackToObserved']['p99'])} | unmeasured |")
out+=['','The await+pull timer starts after obtaining token/snapshot/clock; ACK-to-observed includes those three writer metadata calls. The probe performs 500 sequential updates and fresh pinned reads, checking every value, and checks the previous exact value every 50 updates. It does not isolate the internal wait component. The Q2 current/past rows above measure the per-pull pinned query cost under load.','']
out.append((BASE/'report-notes.md').read_text())
report=BASE.parent/'REPORT.md';text=report.read_text();start=text.index('<!-- CURRENT-TABLES -->');end=text.index('## Blockers found on the way',start)
text=text[:start]+'<!-- CURRENT-TABLES -->\n\n'+'\n'.join(out)+'\n'+text[end:]
text='; '.join(head)+'.\n'+text[text.index('\n'):]
report.write_text(text)
print(json.dumps({'rows':len(rows),'q1':sum(r is not None for r in q1),'q3':sum(r is not None for r in lag),'q2':len(reads),'q4':bool(wait)}))

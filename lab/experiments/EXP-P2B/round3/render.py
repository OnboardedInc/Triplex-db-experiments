"""[EXP-P2B-R3] Why: publish all bound repeats, stage costs and host-tail joins.
Rejected: a hand-picked favorable quantile or a stale analysis joined to new matrix pointers.
"""
import pathlib,json,statistics,hashlib,re
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round3');EXP=pathlib.Path('lab/experiments/EXP-P2B')
a=json.loads((ROOT/'analysis.json').read_text());assert not a['partial'] and not a['missing'] and len(a['results'])==81
assert all(hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest for name,digest in a['inputs'].items())
rows=a['results'];selected=json.loads((ROOT/'selected-workers.json').read_text())['selected'];assert selected in [4,8]
label={'baseline':'Baseline, main feed','feed':'Feed worker','source':'Local source worker','pool':'H1 pool','pool-zero':'H1 pool zero','maintenance-sync':'Sync maintenance','maintenance-async':'Async maintenance','fullsync':'Full-sync default'}
full=[r for r in rows if r['profile']=='fullsync'];assert len(full)==9
final256=[r for r in full if r['readers']==256]
fmt=lambda x:f'{x:.2f}' if x is not None else 'n/a'
lat=lambda r,b:f"{r['bands'][b]['stages']['offerToAck']['p50']:.2f}/{r['bands'][b]['stages']['offerToAck']['p99']:.2f}"
checks=sum(r['reads'] for r in rows)
result=f'''**Implementation complete; {len(rows):,} matched cells accounted for {len(rows)*3000:,} commits, {checks:,} concurrent content checks and {len(rows)*3000:,} post-load pin checks.** Every valid comparison cell completed 1,000 samples per facts band with unchanged source/build inputs and no recorded semantic/timeline errors. The sweep selected **{selected} workers**.\n\nThe final 256-reader 10-fact p50/p99 results were **{', '.join(lat(r,0)+' ms' for r in final256)}** across the three repeats. Twenty-fact results were **{', '.join(lat(r,1)+' ms' for r in final256)}**. These are the complete repeated observations; no favorable rerun replaces them. '''
met=all(r['bands'][b]['stages']['offerToAck']['p50']<=10 and r['bands'][b]['stages']['offerToAck']['p99']<=50 for r in final256 for b in [0,1])
result+=('All final repeated small-band diagnostic quantiles meet the provisional 10/50 ms bars.' if met else '**The repeated final small-band diagnostic does not consistently meet the provisional 10/50 ms bars.**')
result+='\n\nReader placement, indexed worker-local source reads and asynchronous main-thread RPCs are delivered. Host/device tail variability remains visible in the separate full-sync and non-commit intervals below. No source-durability tradeoff was adopted.'
lines=['## Complete matched observations','','Every row has 1,000 samples **per** facts band. Entries are p50/p99 milliseconds. The COMMIT column is the **unique source-frame** envelope p99, avoiding double counting grouped members.','', '| Profile | Repeat | Readers | Workers | 10 facts | 20 facts | 40 facts | COMMIT/full p99 |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
for r in rows:lines.append('| '+' | '.join([label[r['profile']],str(r['repeat']),str(r['readers']),str(r['workers']),*[lat(r,b) for b in [0,1,2]],fmt(r['commitFrameEnvelopeMs']['p99'])])+' |')
lines+=['','### Pool selection','','Mean goodput and range of per-run read p99 over three repeats. Pooled latency is a 0.1 ms histogram upper bound.','', '| Workers | Readers | Mean checked reads/s | Read p99 range ms |','| --- | ---: | ---: | ---: |']
for w in [1,2,4,8]:
 for readers in [64,256]:
  group=[r for r in rows if r['profile']=='pool' and r['workers']==w and r['readers']==readers];assert len(group)==3
  tails=[r['readLatencyMs']['p99'] for r in group]
  lines.append(f"| {w} | {readers} | {statistics.mean(r['readGoodput'] for r in group):.0f} | {min(tails):.1f}–{max(tails):.1f} |")
lines+=['','The chosen pool is ranked by the declared read-goodput rule. Its zero-reader controls run after the sweep; their host windows are not contemporaneous with the sweep cells. Writer inflation ratios are diagnostics on the same offered trace, not a qualified fair-cohort P1 result.','', '### Writer inflation and checked read goodput','','Ten-fact writer p99 ratio is 256 readers / zero readers for the same repeat and code level.','', '| Level | Repeat | 64-reader goodput | 256-reader goodput | 256-reader read p99 ms | Writer p99 ratio |','| --- | ---: | ---: | ---: | ---: | ---: |']
for profile in ['baseline','feed','source','pool','maintenance-sync','maintenance-async','fullsync']:
 for repeat in [1,2,3]:
  group=[r for r in rows if r['profile']==profile and r['repeat']==repeat and (profile!='pool' or r['workers']==selected)]
  zero=[r for r in rows if r['profile']==('pool-zero' if profile=='pool' else profile) and r['repeat']==repeat and r['readers']==0][0]
  lo=next(r for r in group if r['readers']==64);hi=next(r for r in group if r['readers']==256)
  ratio=hi['bands'][0]['stages']['offerToAck']['p99']/zero['bands'][0]['stages']['offerToAck']['p99']
  lines.append(f"| {label[profile]} | {repeat} | {lo['readGoodput']:.0f} | {hi['readGoodput']:.0f} | {hi['readLatencyMs']['p99']:.2f} | {ratio:.2f}x |")
lines+=['','### Ten-fact stage comparison at 256 readers','','Median of the three per-run stage p99s, milliseconds. These quantiles do not add; every raw sample is checked for an exact main-stage sum. The complete distributions remain in the child reports.','', '| Level | Scheduling | Staging | Queue | Decision | COMMIT/full | Durable-to-host | Publication | ACK return |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
for profile in ['baseline','feed','source','pool','maintenance-sync','maintenance-async','fullsync']:
 g=[r for r in rows if r['profile']==profile and r['readers']==256 and (profile!='pool' or r['workers']==selected)]
 vals=[statistics.median(r['bands'][0]['stages'][k]['p99'] for r in g) for k in ['scheduling','staging','queue','decision','commitFullFsyncEnvelope','durableToHost','publication','ackReturn']]
 lines.append('| '+label[profile]+' | '+' | '.join(map(fmt,vals))+' |')
lines+=['','### CPU, source snapshots, replica progress and feed','','Means over the three 256-reader repeats; CPU values are **seconds per run**: root/process through worker stop and final replica drain, worker counters at their stop replies, all before the post-load pin audit. Apply work after its stop snapshot is outside the worker CPU totals. The offered trace spans approximately 75 seconds; each report retains the measured wall interval. Snapshot/WAL values are maxima.','', '| Level | Root thread CPU s | Reader/replica CPU s | Source snapshot CPU s | Feed CPU s | Max source snapshot ms | Peak source WAL MiB | Replica-visible p99 ms | Feed durable p99 ms |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
for profile in ['baseline','feed','source','pool','maintenance-sync','maintenance-async','fullsync']:
 g=[r for r in rows if r['profile']==profile and r['readers']==256 and (profile!='pool' or r['workers']==selected)]
 vals=[statistics.mean(sum(r['cpu']['brokerThread'].values())/1e6 for r in g),statistics.mean(sum(r['readerThreadCpu'].values())/1e6 for r in g),statistics.mean(r['sourceSnapshotCpuUs']/1e6 for r in g),statistics.mean(r['cpu']['feed']['cpuUs']/1e6 for r in g),max(r['sourceMaxSnapshotMs'] for r in g),max(r['sourceWalPeakBytes'] for r in g)/1024**2,statistics.mean(r['replicaVisibilityLagMs']['p99'] for r in g),statistics.mean(r['feedLagMs']['p99'] for r in g)]
 lines.append('| '+label[profile]+' | '+' | '.join(map(fmt,vals))+' |')
lines+=['','Replica-visible lag runs from the actual source durability-return clock to the guarded replica completion; apply-request timing is retained separately. Feed lag is source-durable-to-durable-consumer, an upper bound on lag after the later publication witness. It is not the different offer-to-ACK interval. The 64 MiB WAL alarm threshold is observational here; no long-run bound or cross-process checkpoint qualification is claimed.','', '| Final repeat | Read scan CPU s | Apply CPU s | Check CPU s | Preparation CPU envelope s | Publication CPU envelope s | SQLite body CPU s | SQLite COMMIT CPU s |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
for r in final256:
 vals=[r['readerCosts'][k]['cpuUs']/1e6 for k in ['scan','apply','check']]+[r['stageCpu'][k]/1e6 for k in ['preparationUs','publicationUs','logBodyUs','logCommitUs']]
 lines.append('| '+str(r['repeat'])+' | '+' | '.join(map(fmt,vals))+' |')
lines+=['','Worker-local profiles report the actual main-thread overlay/source/pull/basis RPC counts. The final cells have '+str([r['mainReadRpcs'] for r in final256])+' such calls. Route mixes, maintenance cycles/latencies and source snapshot CPU are retained per worker in the reports. H1 pool reads intentionally use the source route, rather than claiming XTDB replica service.','', '### Host load beside the final runs','','Host CPU is whole-host p95 busy percent during the actual scheduled-offer-to-last-ACK window; load and disk columns are p95. The first iostat since-boot average is discarded.','', '| Repeat | Readers | Host CPU busy p95 % | Load average p95 | Disk MB/s p95 | Frame COMMIT/full p99 ms | 10-fact ACK p99 ms |','| --- | ---: | ---: | ---: | ---: | ---: | ---: |']
for r in full:lines.append('| '+' | '.join([str(r['repeat']),str(r['readers']),fmt(r['host']['busy']['p95']*100),fmt(r['host']['load1']['p95']),fmt(r['host']['diskMBps']['p95']),fmt(r['commitFrameEnvelopeMs']['p99']),fmt(r['bands'][0]['stages']['offerToAck']['p99'])])+' |')
lines+=['','Specific final 256-reader tails below show the nearest CPU/load sample and nearest one-second disk observation. The precise join distance and heavy-process snapshot are retained in `analysis.json`; proximity establishes coincidence, not that those processes caused the sample. All top-ten tails per band for every run are retained, including large zero-reader tails.','', '| Repeat | Facts | Sequence | ACK ms | COMMIT/full ms | Other stages ms | Nearby host busy % | Nearby disk MB/s |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
for r in final256:
 for band in [0,1,2]:
  for t in [t for t in r['tails'] if t['band']==band][:3]:lines.append('| '+' | '.join([str(r['repeat']),str(t['facts']),str(t['seq']),fmt(t['offerToAckMs']),fmt(t['commitFullEnvelopeMs']),fmt(t['nonCommitMs']),fmt(t['nearHostBusy']*100 if t['nearHostBusy'] is not None else None),fmt(t['nearDiskMBps'])])+' |')
text=(EXP/'REPORT-round3.md').read_text()
for name,value in [('RESULT',result),('TABLES','\n'.join(lines))]:
 marker=f'<!-- R3-{name} -->';block=f'<!-- R3-{name}-START -->\n{value}\n<!-- R3-{name}-END -->'
 if marker in text:text=text.replace(marker,block)
 else:
  text,count=re.subn(f'<!-- R3-{name}-START -->.*?<!-- R3-{name}-END -->',lambda _:block,text,flags=re.S)
  assert count==1

(EXP/'REPORT-round3.md').write_text(text)
summary=[]
for r in rows:
 summary.append({k:r[k] for k in ['profile','attempt','repeat','readers','workers','traceHash','committed','reads','readGoodput','readLatencyMs','commitFrameEnvelopeMs','replicaVisibilityLagMs','feedLagMs','mainReadRpcs','sourceMaxSnapshotMs','sourceWalPeakBytes','fullFsyncProof'] }|{'bands':[{'facts':b['facts'],'offerToAck':b['stages']['offerToAck'],'commitFullFsyncEnvelope':b['stages']['commitFullFsyncEnvelope']} for b in r['bands']],'host':r['host']})
(EXP/'ROUND3-RESULTS.json').write_text(json.dumps(dict(diagnosticOnly=True,analysisSha256=hashlib.sha256((ROOT/'analysis.json').read_bytes()).hexdigest(),inputs=a['inputs'],selectedWorkers=selected,results=summary),indent=2)+'\n')
print(json.dumps(dict(attempts=len(rows),commits=len(rows)*3000,checks=checks,selected=selected,allFinalSmallBandBars=met)))

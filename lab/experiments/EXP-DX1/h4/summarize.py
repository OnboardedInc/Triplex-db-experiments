#!/usr/bin/env python3
"""[DX-H4] Why: render observed report fields without reclassifying bars. Rejected: handwritten verdicts."""
import json,pathlib,sys,re
root=pathlib.Path(sys.argv[1]); r=json.loads((root/'driver/ns-report.json').read_text()); p=r.get('priorities',{})
def j(v):return json.dumps(v,ensure_ascii=False,separators=(',',':')).replace('|','\\|')
def f(v):return 'unavailable' if v is None else (f'{v:.3f}' if isinstance(v,float) else str(v))
def table(head,rows):
 print('| '+' | '.join(head)+' |');print('|'+'|'.join('---' for _ in head)+'|')
 for row in rows:print('| '+' | '.join(f(v).replace('|','\\|').replace('\n',' ') for v in row)+' |')
 print()
print(f'# {root.name}: {r.get("status")}\n\nDiagnostic observations, not acceptance promotion. Source: `driver/ns-report.json`.\n')
print('## Every bar\n')
rows=[]
for name,priority in p.items():
 for b in priority.get('bars',[]):
  delta=''
  m=re.match(r'(<=|>=|=) ([\d.]+)',b['bar'])
  if b['pass'] is False and m and isinstance(b['value'],(float,int)):
   target=float(m[2]);distance=(b['value']-target) if m[1]=='<=' else (target-b['value']) if m[1]=='>=' else abs(b['value']-target)
   delta=(f'{distance:.3f} '+('above' if m[1]=='<=' else 'below' if m[1]=='>=' else 'from')+' threshold') if distance>0 else 'qualification missing; numeric threshold met'
  rows.append([name,b['id'],j(b['value']),b['bar'],'MET' if b['pass'] is True else 'MISS' if b['pass'] is False else 'UNVERIFIED',delta,b.get('note','')])
table(['Priority','Bar','Observed','Required','Driver verdict','Miss amount','Qualification'],rows)
print('## Writer pending at every phase boundary\n')
lines=[line for line in (root/'driver.log').read_text().splitlines() if 'phase ' in line and 'writer pending' in line]
print('```text\n'+'\n'.join(lines)+'\n```\n')
print('## P2 commit latency per size band (ms)\n')
table(['Window','Facts','Count','p50','p99'],[[w,b,h.get('count'),h.get('p50Ms'),h.get('p99Ms')] for w in ['bandsAll','bandsAtL256','bandsSteady','bandsBurst'] for b,h in p.get('P2',{}).get(w,{}).items()])
print('## P1 reader ladder and writer comparison\n')
table(['Phase','Readers','Read p50','Read p99','Correct/s','Commit p50','Commit p99','Matched zero-reader p99','Feed lag p99','Client saturated','Reader thread ELU','Main ELU','Per-container mean CPU %'],[[x['phase'],x['readers'],x['read'].get('p50Ms'),x['read'].get('p99Ms'),x['goodputPerS'],x['writer']['commit'].get('p50Ms'),x['writer']['commit'].get('p99Ms'),(x['writer'].get('matchedZeroReader') or {}).get('p99Ms'),x['feedLag'].get('p99Ms'),x['client']['saturated'],j(x['client']['workerEluMean']),x['client']['mainElu'],j(x['engine']['containers'])] for x in p.get('P1',{}).get('ladder',[])])
print('### Reader correctness and apparatus per level\n')
table(['Phase','Reads','Correct','Violations','Errors','Hot share','Split counters','Maintenance jobs','Main ELU','Max worker ELU'],[[x['phase'],x['reads'],x['correct'],x['violations'],x['errors'],x['hotShare'],j(x['split']),x['maintenanceEvents'],x['client']['mainElu'],x['client']['maxWorkerElu']] for x in p.get('P1',{}).get('ladder',[])])
print('Matched baseline identity: `'+j(r.get('matchedBaseline'))+'`. A requested cap of 256 also caps the nominal L1024 phase; this is not a 1,024-reader measurement.\n')
print('## P4 weighted mix and history\n')
mix=p.get('P4',{}).get('weightedMix') or {}
table(['Group','Latency / bytes summary'],[['weighted',j(mix.get('read'))]]+[[k,j(v)] for k,v in mix.get('buckets',{}).items()])
table(['History / throughput field','Observed'],[[k,j(v)] for k,v in p.get('P4',{}).items() if k not in ['bars','weightedMix']])
print('## Three slowest measured read phases\n')
slow=sorted([ph for ph in r.get('phases',[]) if ph.get('stats') and ph['stats']['read'].get('p99Ms') is not None],key=lambda ph:ph['stats']['read']['p99Ms'],reverse=True)[:3]
table(['Phase','Read p99 ms','Engine CPU mean % by container','Client signals'],[[ph['name'],ph['stats']['read']['p99Ms'],j(ph['stats']['engine']['containers']),j(ph['stats']['client'])] for ph in slow])
print('## Three longest phases by elapsed wall time\n')
longest=sorted([ph for ph in r.get('phases',[]) if ph.get('end')],key=lambda ph:ph['end']-ph['start'],reverse=True)[:3]
longrows=[]
for ph in longest:
 samples=[x for x in r.get('engineSamples',[]) if ph['start']<=x['t']<ph['end']]
 names=sorted({name for x in samples for name in x['containers']})
 means={name:sum(x['containers'][name]['cpuPercent'] for x in samples if name in x['containers'])/sum(name in x['containers'] for x in samples) for name in names}
 longrows.append([ph['name'],(ph['end']-ph['start'])/1000,len(samples),j(means)])
table(['Phase','Elapsed s','Cgroup samples','Per-container mean CPU %'],longrows)
print('CPU describes concurrent measured activity only; no causal attribution is inferred. Raw gateway/transactor logs are retained as `gw-w.log`, `gw-r.log`, `tx.log`.\n')
print('## Counters, feed, fetch-only sweep, oracle and invalidity\n')
for name,value in [('P2 duplicates',p.get('P2',{}).get('duplicates')),('P2 lost ACK',p.get('P2',{}).get('lostAck')),('P2 accounting',p.get('P2',{}).get('accounting')),('P2 read-your-own-write',p.get('P2',{}).get('readYourOwnWrite')),('P2 progress',p.get('P2',{}).get('progress')),('P3',{k:v for k,v in p.get('P3',{}).items() if k!='bars'}),('P5',{k:v for k,v in p.get('P5',{}).items() if k!='bars'}),('correctness',r.get('correctness')),('oracle',r.get('oracle')),('client',r.get('client')),('invalidReasons',r.get('invalidReasons')),('writer',r.get('writer'))]:
 print(f'### {name}\n\n```json\n{json.dumps(value,indent=2)}\n```\n')
print('Additional validity limits: smoke profile; no matched zero-reader run; any development overrides in config; direct-subject affected sets are diagnostic; P5 evaluates/publishes no W0 release; engine bytes read unmeasured. DONE means completed reporting, not all bars met.\n')
print('## Gateway scan counters\n')
scan=root/'driver/scan-stats.jsonl'
if scan.exists():
 rows=[json.loads(s) for s in scan.read_text().splitlines()]
 table(['At','Write peer','Read peer'],[[row['at'],j(row['peers'].get('w')),j(row['peers'].get('r'))] for row in ([rows[0],rows[-1]] if rows else [])])
 print('Every interval is retained in `driver/scan-stats.jsonl`; missing/error samples remain errors.\n')

if scan.exists():
 print('### Last successful gateway counter snapshots\n')
 for role in ['w','r']:
  good=[row for row in rows if row['peers'].get(role,{}).get('status')==200 and row['peers'].get(role,{}).get('body')]
  if not good:
   print(f'{role}: unavailable\n');continue
  last=good[-1];body=json.loads(last['peers'][role]['body'])
  print(f"{role}: last successful sample at {last['at']}; these are not final totals if later probes failed.\n")
  table(['Counter family','Observed'],[[k,j(v)] for k,v in body.items()])
 print('A missing late snapshot is not zero work; begun-call datoms can exceed completed per-pattern totals.\n')

print('## Per-commit driver breakdown (ms)\n')
bd=p.get('P2',{}).get('breakdown',{})
print(bd.get('note',''))
table(['Phase','Segment','Commands','Median ms','p99 ms'],[[phase,segment,h['count'],h['p50Ms'],h['p99Ms']] for phase,parts in {**bd.get('byPhase',{}),'burst':bd.get('burst',{})}.items() for segment,h in parts.items()])
print('## Side worker ELU\n')
for phase in r.get('phases',[]):
 values=[x['elu'] for x in r.get('sideThread',{}).get('elu',[]) if phase['start'] <= x['t'] < phase.get('end',0)]
 if values:print(f"- {phase['name']}: mean {sum(values)/len(values):.3f}, max {max(values):.3f}")

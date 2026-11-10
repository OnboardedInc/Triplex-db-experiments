#!/usr/bin/env python3
"""[DX-H4] Why: retain exact saved verdicts; rejected: manually reclassifying a miss."""
import hashlib,json,pathlib,subprocess,sys
here=pathlib.Path(__file__).resolve().parent
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4')
names=sys.argv[1:]
if len(names)!=2:raise SystemExit('report.py SMALL-PAIR-PREFIX TEN-K-PAIR-PREFIX')
out=[]
def w(s=''):out.append(s)
def val(x):
 if x is None:return 'unavailable'
 if isinstance(x,(list,dict)):return json.dumps(x,separators=(',',':')).replace('|','\\|')
 if isinstance(x,float):return f'{x:.3f}'
 return str(x).replace('|','\\|').replace('\n',' ')
def table(headers,rows):
 w('| '+' | '.join(headers)+' |');w('|'+'|'.join('---' for _ in headers)+'|')
 for row in rows:w('| '+' | '.join(map(val,row))+' |')
 w()
w('# DX-H4 — trustworthy north-star verdicts')
w()
w('North star: P1–P4 measurement integrity under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md` section 1.1. Fast-forward diagnostic smoke measurements under PROTOCOL 0b; no acceptance, scorecard or contract promotion.')
w()
w('## Changes and verification')
w()
w('1. Maintenance events retain gateway timestamps but use fresh request/response bounds on the same monotonic epoch as the level window. Both bounds must be inside that level and the job must complete. The recorded OM2 fixture reproduces the original five misses; incomplete, crossed-window and wrongly bound jobs still refuse.')
w('2. Every Datomic history depth requests indexing before reads begin. A completed response within 60 seconds, complete growth on the whole sample, and at least 10,000 correct pulls at each depth are all required. Mean/p50 ratios are reported beside p99; the 1.1 p99 bar is unchanged. Missing prerequisites remain in `history.invalid`.')
w('3. `attempt.sh pair` runs a zero-reader arm and a ladder on two fresh stacks, with the same arguments, seed, trace and exported configuration. The raw baseline writes and report are copied unchanged into the ladder input. Identity, harness source, completed writes, correctness and full trace-window coverage are checked before using a denominator. Baseline history reads are explicitly unjudged.')
w('4. Every offered command retains scheduled/start/finish times; commits additionally retain transact call/return, publication-witness start/durable time and ACK time where observed. Optional per-commit response diagnostics are copied when present. No cumulative client counter is presented as a per-commit observation. P2 reports segment medians/p99s, including all post-ACK completion work. No time is subtracted from a bar.')
w('5. Feed consumption and RYOW pulls run on a side worker; probe HTTP/encoding/receipt work runs on a separate probe worker against the write gateway. Per-subject admission, command intent/model updates and ACK publication stay coordinated on the main writer. Every original feed/replay/crash and expected-world check remains. Feed-before-ACK intent checks are deferred rather than skipped; unresolved checks or RYOW pulls invalidate finalization. Publication fsync stays on each committing thread.')
w('6. CPU plan: Postgres 0, transactor 0–1, write gateway 1, read gateway 2–3, driver 4–7; engine throughput denominator four CPUs. Three reader workers initially. Driver 8g; transactor heap 3g / container 4g; gateways heap 2g / containers 3g; Postgres 2g. Requested G1, cache, index and Postgres settings are in `run.sh` and retained effective stack evidence.')
w()
w('Focused tests: 8/8; native feed tests: 5/5, including delayed intent validation. The sandboxed host feed attempt was blocked by macOS boot-clock sysctl access; its native rerun passed. Ten package builds succeeded from the local cache after an offline frozen install. Broad bench TypeScript still reports errors in unrelated diagnostics; no diagnostic names a changed driver/worker/helper file. Full root check, package release, independent review and acceptance were not run.')
w()
for label,name in zip(['2,000 subjects','10k rung'],names):
 d=root/(name+'-ladder');z=root/(name+'-zero')
 w('## '+label);w()
 if not (d/'driver/ns-report.json').exists():
  w('No completed ladder report is available for this attempt. No bars or oracle result are inferred.');w();continue
 r=json.loads((d/'driver/ns-report.json').read_text());p=r.get('priorities',{})
 w(f"Attempt `{name}`. Saved status `{r.get('status')}`; oracle `{r.get('oracle',{}).get('status')}`; client invalid `{r.get('client',{}).get('invalid')}`. These are diagnostic observations; DONE is not a claim that the bars pass.");w()
 w('Evidence: `'+str(d)+'`; zero-reader evidence: `'+str(z)+'`.');w()
 w('Correctness: `'+val(r.get('correctness'))+'`.');w()
 w('Invalid reasons: `'+val(r.get('invalidReasons',[]))+'`. History invalid: `'+val(p.get('P4',{}).get('history',{}).get('invalid',[]))+'`.');w()
 w('Matched baseline: `'+val(r.get('matchedBaseline'))+'`.');w()
 w('Burst main-thread ELU: `'+val(r.get('client',{}).get('burstMainEluMean'))+'` (target < 0.5).');w()
 rows=[]
 import re
 for priority,part in p.items():
  for b in part.get('bars',[]):
   distance=''
   m=re.match(r'(<=|>=|=) ([\d.]+)',b['bar'])
   if b['pass'] is False and m and isinstance(b['value'],(float,int)):
    limit=float(m[2]);delta=b['value']-limit if m[1]=='<=' else limit-b['value'] if m[1]=='>=' else abs(b['value']-limit)
    distance=f'{delta:.3f} beyond threshold' if delta>0 else 'prerequisite missing'
   phase='L256' if 'L256' in b['id'] or '-256' in b['id'] else 'L1024' if 'L1024' in b['id'] or '-1024' in b['id'] else 'recovery' if 'RECOVERY' in b['id'] else 'every ladder window' if priority=='P1' else 'p4h10 / p4h1' if 'history' in b['id'] else 'p4mix' if priority=='P4' else 'sweep / presweep' if priority=='P5' else 'whole trace'
   rows.append([priority,phase,b['id'],b['value'],b['bar'],'MET' if b['pass'] is True else 'MISS' if b['pass'] is False else 'UNJUDGED',distance,b.get('note','')])
 table(['Priority','Phase','Bar','Value','Required','Saved predicate','Miss amount','Qualification'],rows)
 details=here/(name+'-TABLES.md')
 with details.open('w') as handle:subprocess.run([sys.executable,str(here/'summarize.py'),str(d)],stdout=handle,check=True)
 w('Full per-phase goodput, read/commit p50/p99, feed lag, every reader ELU, engine CPU per container and per-commit breakdown: ['+details.name+']('+details.name+').');w()
 bd=p.get('P2',{}).get('breakdown',{}).get('burst',{})
 w('Burst median driver-owned work: `'+val(bd.get('driverOwn',{}).get('p50Ms'))+' ms`; before transact `'+val(bd.get('beforeTransact',{}).get('p50Ms'))+' ms`; after transact to ACK `'+val(bd.get('afterTransact',{}).get('p50Ms'))+' ms`; after ACK to scheduler completion `'+val(bd.get('afterAck',{}).get('p50Ms'))+' ms`; publication witness `'+val(bd.get('publicationWitness',{}).get('p50Ms'))+' ms`. The driver-owned median is a per-command sum, not a sum of the separately reported segment medians.');w()
w('## Integrity, blockers and limits');w()
w('The full observation-to-verdict list is [AUDIT.md](AUDIT.md). Hash changes and pin matches are in [HASH-CHANGES.json](HASH-CHANGES.json); the contract is unchanged. Evidence bytes are indexed by [SHA256SUMS](SHA256SUMS).');w()
w('P4 engine bytes read remain unmeasured; no bytes-flatness pass is claimed. The NS P5 path remains fetch-only; W0 release evaluation, outbox publication and throttled maintenance overlap belong to the separate P5 harness. The 2,000-subject run caps nominal L1024 at 256 actual readers and cannot establish a 1,024-reader result. Smoke/development overrides cannot close acceptance obligations. Optional per-commit diagnostics may be absent on this source revision. No store optimization, package source edit, forbidden port, default Docker context change, download, merge or push was performed.');w()
w('Before completion, owned container/network/volume inventories must be empty. Each completed wrapper retains these exact inventories and releases the lock only after checking them. Queued cancelled attempts created no engine resources.');w()
(here/'REPORT.md').write_text('\n'.join(out)+'\n')

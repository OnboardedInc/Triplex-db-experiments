#!/usr/bin/env python3
"""[DX-N1] Why: tables derive only from retained observations; absent arms stay absent. Rejected: inferred missing results."""
import json,pathlib,sys
base=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2')
prefix=sys.argv[1]; root=base/'evidence/DX-N1/matched'
def fmt(n):return 'unavailable' if n is None else f'{n:.3f}' if isinstance(n,float) else str(n)
print('| Arm | Repeat | Phase | n | p50 ms | p99 ms | Throughput /s | Used engine cores | Throughput / used core |')
print('|'+'|'.join(['---']*9)+'|')
for repeat in [1,2]:
 for arm in ['vm','native']:
  name=f'{prefix}-{arm}-{repeat}'
  d=(root/name/'driver') if arm=='vm' else base/'native/runs'/name/'driver'
  for file in ['lone-commit.json','pull-load.json']:
   p=d/file
   if not p.exists():
    print('| '+' | '.join(map(str,[arm,repeat,file,'unavailable','unavailable','unavailable','unavailable','unavailable','unavailable']))+' |');continue
   report=json.loads(p.read_text())
   for phase,r in report['phases'].items():
    n=r['latency']['n'];throughput=r.get('pullsPerSecond',n/(r['wallMs']/1000));cores=r.get('engineCpu',{}).get('usedCores')
    values=[arm,repeat,phase,n,r['latency'].get('p50'),r['latency'].get('p99'),throughput,cores,throughput/cores if cores and cores>0 else None]
    print('| '+' | '.join(fmt(v) for v in values)+' |')
print('\nCPU denominator: observed used cores, not a native allocation/quota. VM is cgroups; native is cumulative ps time of roots and live descendants. Short-lived exited PG workers may be missed. No acceptance verdict.')
print('\nHost observations:')
for p in sorted(root.glob(prefix+'*/host-*.txt')):
 print('\n`'+str(p)+'`\n\n```text\n'+p.read_text().strip()+'\n```')

#!/usr/bin/env python3
# [EXP-OBS01] Why: compare feasible offset intervals of both real clock transports.
# Rejected: treating a slower RTT as a wrong clock domain or retrofitting rejected old samples.
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'experiments/EXP-OBS01/round2';out={}
for p in root.glob('obs01-r2-*/clock-comparison.json'):
 d=json.loads(p.read_text());intervals={}
 for method in ('legacy-http','nonce-tcp'):
  rows=[r for r in d['rows'] if r['method']==method]
  intervals[method]={'lower':max(r['observerMono']-r['receive'] for r in rows),'upper':min(r['observerMono']-r['send'] for r in rows)}
 lo=max(x['lower'] for x in intervals.values());hi=min(x['upper'] for x in intervals.values())
 out[p.parent.name]={'summary':d['summary'],'offsetIntervalsMs':intervals,'commonIntervalMs':[lo,hi],'sameClockDomainConsistent':lo<=hi}
(root/'clock-analysis.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,sort_keys=True))

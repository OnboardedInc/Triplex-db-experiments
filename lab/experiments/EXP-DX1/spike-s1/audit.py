#!/usr/bin/env python3
"""Cross-check reported distributions against raw retained CSVs, not acceptance."""
import csv
import json
import math
from pathlib import Path

out=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1')
records=json.loads((out/'summary.json').read_text())
lines=[]
for label,record in sorted(records.items()):
    path=out/(label+'.csv')
    if not path.exists() or 'latency_ms' not in record:
        continue
    rows=list(csv.DictReader(path.open()))
    column='scheduled_to_ack_ms' if 'scheduled_to_ack_ms' in rows[0] else 'wall_ms'
    values=sorted(float(row[column]) for row in rows)
    summary=record['latency_ms']
    assert len(values)==summary['n'], (label,len(values),summary['n'])
    for key,p in [('p50',.5),('p90',.9),('p99',.99),('max',1)]:
        expected=values[max(0,math.ceil(len(values)*p)-1)]
        assert abs(expected-summary[key])<1e-8,(label,key,expected,summary[key])
    if 'errors' in record:
        assert record['errors']==0,(label,record['errors'])
    if 'observed_tx_datoms' in rows[0]:
        assert len(set(row['observed_tx_datoms'] for row in rows))==1,label
    if 'bytes' in rows[0] and label.startswith(('q2-','q3-')):
        assert all(int(row['bytes'])==1+251*int(row['rows']) for row in rows),label
    lines.append(f'{label}: {len(values)} raw latency samples; reported percentiles match CSV')
if 'q5-lag' in records:
    a=list(csv.DictReader((out/'q5-feed-ack.csv').open()))
    s=list(csv.DictReader((out/'q5-feed-seen.csv').open()))
    assert len(a)==2000==len(s)
    assert len({r['marker'] for r in a})==2000
    assert len({r['marker'] for r in s})==2000
    assert {r['marker'] for r in a}=={r['marker'] for r in s}
    ts=[int(r['t']) for r in s]
    assert all(x<y for x,y in zip(ts,ts[1:]))
    lines.append('q5: 2000 unique ACKs = 2000 unique seen markers; report t strictly increasing')
(out/'number-crosscheck.txt').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines))

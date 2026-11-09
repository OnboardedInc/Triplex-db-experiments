#!/usr/bin/env python3
"""Summarize exposed engine timings without pretending to decompose end-to-end time."""
import csv
import collections
import datetime as dt
import json
import math
import re
import statistics
from pathlib import Path

out=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1')
def stats(xs):
    a=sorted(xs)
    return {'n':len(a),'mean':statistics.mean(a),**{k:a[max(0,math.ceil(p*len(a))-1)] for k,p in [('p50',.5),('p90',.9),('p99',.99),('max',1)]}} if a else {'n':0}
window=out/'q1-pg-sample-window.txt'
times=[dt.datetime.strptime(s,'%a %b %d %H:%M:%S UTC %Y') for s in window.read_text().splitlines() if re.match(r'^\w{3} \w{3} +\d+ \d\d:',s)] if window.exists() else []
result={}
if len(times)>=2:
    samples=collections.defaultdict(list)
    count=0
    for path in sorted((out/'transactor-log').glob('*.log')):
        for line in path.read_text(errors='replace').splitlines():
            if ':event :tx/process' not in line or ':datom-count 41,' not in line:continue
            stamp=dt.datetime.strptime(line[:23],'%Y-%m-%d %H:%M:%S.%f')
            if not(times[0]<=stamp<times[1]+dt.timedelta(seconds=1)):continue
            count+=1
            for key in ['msec','apply-msec','tx-fn-ms','ucheck-tx-ms','res-tx-ms']:
                m=re.search(r':'+key+r' ([0-9.]+)',line)
                if m:samples[key].append(float(m[1]))
    result['transactor_pg_sample']={k:stats(v) for k,v in samples.items()}
    result['transactor_pg_sample']['process_lines']=count
pg=out/'q1-pg-statements.log'
if pg.exists():
    samples=collections.defaultdict(list)
    for line in pg.read_text(errors='replace').splitlines():
        m=re.search(r'duration: ([0-9.]+) ms\s+(statement|execute [^:]+):\s*(.*)',line)
        if not m:continue
        statement=m[2].split(' ',1)[0] + ':' + m[3].strip().split(' ',1)[0].upper()
        samples[statement].append(float(m[1]))
    result['postgres_logged_statement_ms']={k:stats(v) for k,v in samples.items()}
intervals=[]
for path in sorted((out/'transactor-log').glob('*.log')):
    for line in path.read_text(errors='replace').splitlines():
        if ':event :metrics' not in line:continue
        for key in ['TransactionMsec','TransactionDatoms','MemoryIndexMB','StoragePutMsec','LogWriteMsec']:
            m=re.search(r':'+key+r' \{([^}]+)\}',line)
            if m:
                fields=dict(re.findall(r':(lo|hi|sum|count) ([0-9.]+)',m[1]))
                intervals.append([line[:23],key,*[fields.get(k,'') for k in ['lo','hi','sum','count']]])
with (out/'transactor-metric-intervals.csv').open('w') as stream:
    w=csv.writer(stream);w.writerow(['timestamp','metric','lo','hi','sum','count']);w.writerows(intervals)
result['exposed_metric_interval_rows']=len(intervals)
(out/'engine-metrics-summary.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))

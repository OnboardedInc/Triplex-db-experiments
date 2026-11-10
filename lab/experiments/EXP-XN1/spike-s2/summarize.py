#!/usr/bin/env python3
# [XN-S2] Why: expose raw cgroup counter differences and memory samples without emitting an acceptance verdict. Rejected: treating a broker-only window as the complete engine.
import datetime, json, pathlib, re
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2')
samples=[]
for p in sorted(root.glob('kafka-sample-*-time.txt')):
    text=p.with_name(p.name.replace('-time','')).read_text()
    lines=text.strip().splitlines()
    memory=[int(s) for s in lines if s.isdigit()]
    samples.append(dict(at=p.read_text().strip(),usageUsec=int(re.search(r'usage_usec (\d+)',text)[1]),memoryCurrentBytes=memory[0],memoryPeakBytes=memory[1],raw=text))
if samples:
    elapsed=(datetime.datetime.fromisoformat(samples[-1]['at'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(samples[0]['at'].replace('Z','+00:00'))).total_seconds()
    cpu=(samples[-1]['usageUsec']-samples[0]['usageUsec'])/1e6
    out=dict(kind='diagnostic-idle-broker-only',keepAwake=True,samples=samples,elapsedSeconds=elapsed,cpuSeconds=cpu,averageCores=cpu/elapsed)
    (root/'kafka-summary.json').write_text(json.dumps(out,indent=2)+'\n')
    print(json.dumps(out,indent=2))

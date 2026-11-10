#!/usr/bin/env python3
# [XN-S2] Why: expose raw cgroup counter differences and memory samples without emitting an acceptance verdict. Rejected: treating a broker-only window as the complete engine.
import datetime, hashlib, json, pathlib, re
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2')
samples=[]
for p in sorted(root.glob('kafka-sample-*-time.txt')):
    text=p.with_name(p.name.replace('-time','')).read_text()
    lines=text.strip().splitlines()
    memory=[int(s) for s in lines if s.isdigit()]
    samples.append(dict(at=p.read_text().strip(),usageUsec=int(re.search(r'usage_usec (\d+)',text)[1]),memoryCurrentBytes=memory[0],memoryPeakBytes=memory[1],raw=text))
# [XN-S2] Why: refuse partial, stale or differently bound brackets before deriving numbers. Rejected: exporting a plausible average from any available samples.
container=json.loads((root/'kafka-container.json').read_text())[0]
identity=(root/'kafka-container-id.txt').read_text().strip()
images=json.loads((root/'images.json').read_text())
image=next(i['Id'] for i in images if 'apache/kafka:4.1.1' in (i['RepoTags'] or []))
assert container['Id']==identity and container['Image']==image, 'container/image binding'
assert container['State']['Running'] and not container['State']['OOMKilled'], 'broker state'
assert container['HostConfig']['CpusetCpus']=='0' and container['HostConfig']['Memory']==1073741824, 'resource binding'
assert not container['HostConfig']['PortBindings'], 'published ports'
binding=json.loads((root/'source-binding-2.json').read_text())
runner='lab/experiments/EXP-XN1/spike-s2/kafka-cost.sh'
assert hashlib.sha256(pathlib.Path(runner).read_bytes()).hexdigest()==binding['files'][runner], 'runner source changed'
assert len(samples)==7 and [p.name for p in sorted(root.glob('kafka-sample-*-time.txt'))]==[f'kafka-sample-{i}-time.txt' for i in range(7)], 'incomplete bracket'
parse=lambda t: datetime.datetime.fromisoformat(t.strip().replace('Z','+00:00'))
start=parse((root/'kafka-window-started.txt').read_text())
end=parse((root/'kafka-window-ended.txt').read_text())
assert end-start < datetime.timedelta(minutes=10), 'hold limit'
assert (start-parse((root/'inspection-window-ended.txt').read_text())).total_seconds()>=120, 'rest limit'
assert parse(container['State']['StartedAt'])<=parse(samples[0]['at']), 'stale samples'
assert all(start<=parse(x['at'])<=end and 0<x['memoryCurrentBytes']<=x['memoryPeakBytes']<=1073741824 for x in samples), 'sample bounds'
assert all(parse(a['at'])<parse(b['at']) and a['usageUsec']<=b['usageUsec'] for a,b in zip(samples,samples[1:])), 'nonmonotone samples'
if samples:
    elapsed=(datetime.datetime.fromisoformat(samples[-1]['at'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(samples[0]['at'].replace('Z','+00:00'))).total_seconds()
    cpu=(samples[-1]['usageUsec']-samples[0]['usageUsec'])/1e6
    out=dict(kind='diagnostic-idle-broker-only',keepAwake=True,containerId=identity,imageId=image,runnerCommit=binding['sourceCommit'],samples=samples,elapsedSeconds=elapsed,cpuSeconds=cpu,averageCores=cpu/elapsed)
    (root/'kafka-summary.json').write_text(json.dumps(out,indent=2)+'\n')
    print(json.dumps(out,indent=2))

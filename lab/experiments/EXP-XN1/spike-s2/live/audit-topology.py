#!/usr/bin/env python3
# [XN-S2-LIVE] Why: bind the real restart/old-basis proof to its source preimages, unique probe and exact stopped container. Rejected: treating a stage-completed marker as a topology proof.
import datetime,hashlib,json,pathlib,time,xml.etree.ElementTree as ET
ROOT=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/live')
p=ROOT/'topology-2'
def load(path):return json.loads(path.read_text())
def dt(s):return datetime.datetime.fromisoformat(s.replace('Z','+00:00'))
source=load(p/'source.json')
for name,expected in source['files'].items():assert hashlib.sha256((p/'sources'/name).read_bytes()).hexdigest()==expected
seed=load(p/'driver/seed.json');binding=load(p/'binding.json')
assert binding['source']==source and seed['binding']['source']==source
before=load(p/'driver/topology-before.json');stopped=load(p/'driver/topology-stopped.json');restarted=load(p/'driver/topology-restarted.json')
assert before['p']==stopped['old']==restarted['old'] and stopped['p']==restarted['p']
assert before['p']['id']==stopped['p']['id'] and before['p']['value']=='before' and stopped['p']['value']=='while-reader-stopped'
assert before['rows']==[{'value':'before'}] and restarted['current']==[{'value':'while-reader-stopped'}] and restarted['past']==[{'value':'before'}]
assert stopped['readEndpointUnavailable'] is True
for probe in [before['p'],stopped['p']]:assert probe['token'] and probe['snapshot']
released=dt((p/'released.txt').read_text().strip())
assert dt(seed['binding']['at'])<=dt(before['p']['clock'])<dt(stopped['p']['clock'])<=dt(binding['at'])<=released
assert (released-dt(seed['binding']['at'])).total_seconds()<900
initial={c['Name']:c for c in seed['binding']['containers']};final={c['Name']:c for c in binding['containers']}
assert initial.keys()==final.keys()
for name,c in initial.items():
 assert name.startswith('/tx2-xns2-') and c['Id']==final[name]['Id'] and c['Image']==final[name]['Image']
 assert not c['HostConfig']['PortBindings']
 if name.endswith(('write','read')):
  assert c['HostConfig']['CpusetCpus']==('0,1' if name.endswith('write') else '2,3')
  assert c['HostConfig']['Memory']==3758096384 and c['HostConfig']['MemorySwap']==3758096384
observed=load(p/'read-stopped-inspect.json')[0]
assert observed['Id']==initial['/tx2-xns2-read']['Id'] and observed['State']['Running'] is False and observed['State']['Status']=='exited'
assert dt(initial['/tx2-xns2-read']['State']['StartedAt'][:26]+'Z')<dt(final['/tx2-xns2-read']['State']['StartedAt'][:26]+'Z')
assert final['/tx2-xns2-write']['State']['StartedAt']==initial['/tx2-xns2-write']['State']['StartedAt']
storage=load(p/'driver/remote-storage.json');assert storage['status']==200 and storage['listing']['status']==200
keys=[e.text for e in ET.fromstring(storage['listing']['body']).iter() if e.tag.endswith('}Key')]
assert 'v06/blocks/b00.binpb' in keys
metrics=load(p/'driver/topology-metrics.json')
assert all(x['status']==200 and dt(seed['binding']['at'])<=dt(x['at'])<=released for x in metrics.values())
assert any(line.startswith('xtdb_log_leader{') and line.endswith(' 1.0') for line in metrics['write']['text'].splitlines())
assert any(line.startswith('xtdb_log_leader{') and line.endswith(' 0.0') for line in metrics['read']['text'].splitlines())
keeper='\n'.join(f.read_text() for f in p.glob('keeper-*.txt'));assert 'running 8' in keeper and '"onePerCpu": true' in keeper
assert (p/'cleanup-containers.txt').read_text()==''
files={str(f.relative_to(p)):hashlib.sha256(f.read_bytes()).hexdigest() for f in p.rglob('*') if f.is_file()}
result={'kind':'diagnostic topology observation audit, no acceptance verdict','generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'auditorSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'window':p.name,'source':source,'probeId':before['p']['id'],'files':files,'objectKeys':keys,'readerContainerId':observed['Id']}
(ROOT/f'topology-audit-{time.time_ns()}.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'window':p.name,'probeId':before['p']['id'],'objectKeys':len(keys),'boundFiles':len(files)}))

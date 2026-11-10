# [DX-B6] Why: compare retained execution bytes with the final tree, preserving historical drift.
# Rejected: assigning a later Git head to an earlier execution.
import pathlib,json,hashlib,sys
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6')
selected=['suite-e-test-source','tx2-dxb6-lone-d-source','tx2-dxb6-peer-c-source']+[f'tx2-dxb6-{kind}-{layout}-b-source' for kind in ['concurrent','reach'] for layout in ['legacy','lean']]+[f'tx2-dxb6-differential-{n}-c-source' for n in [0,100,200]]
selected=sys.argv[1:] or selected
results=[]
for name in selected:
 dest=root/name;capture=json.loads((dest/'CAPTURE.json').read_text());verified=0;matches=[];changed=[]
 for name2,entry in capture['files'].items():
  data=(dest/name2).read_bytes();assert len(data)==entry['bytes'] and hashlib.sha256(data).hexdigest()==entry['sha256'],(name,name2)
  verified+=1
  if name2.startswith(('packages/core/src/','packages/core/dist/','packages/datomic/src/','packages/datomic/dist/','packages/datomic/gateway/','packages/datomic/test/')):
   p=pathlib.Path(name2)
   (matches if p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256'] else changed).append(name2)
 stackname='tx2-dxb6-suite-e' if name=='suite-e-test-source' else name.removesuffix('-source')
 attempt=root/stackname;stack=json.loads((attempt/'stack.json').read_text())
 gatewaybytes=(attempt/'gateway-files.json').read_bytes();gatewayhash=hashlib.sha256(gatewaybytes).hexdigest()
 assert stack['prefix']==stackname and stack['gatewaySourceSha256']==gatewayhash
 for role in ['w','r']:assert json.loads((attempt/f'health-{role}.json').read_text())['gatewaySourceHash']==gatewayhash
 gateway=json.loads(gatewaybytes)
 for rel,digest in gateway.items():
  staged=root/'stage'/stackname/rel
  assert hashlib.sha256(staged.read_bytes()).hexdigest()==digest,(name,rel)
  source='packages/datomic/src/codec-spec.json' if rel=='codec-spec.json' else 'packages/datomic/gateway/'+rel
  assert capture['files'][source]['sha256']==digest,(name,source)
 inspected=json.loads((attempt/'containers.json').read_text());byid={c['Id']:c for c in inspected}
 for c in stack['containers']:
  observed=byid[c['id']];assert observed['Name']=='/'+c['name']
  assert observed['HostConfig']['CpusetCpus']==c['cpuset'] and observed['HostConfig']['Memory']==c['memory']
  if '-gw-' in c['name']:
   assert any(m.get('Source')==str(root/'stage'/stackname) and not m.get('RW') for m in observed['Mounts']),c
 results.append({'capture':str(dest),'observedBaseHead':capture['head'],'verifiedPreimages':verified,'finalMatches':len(matches),'finalDifferentPaths':changed,'stack':str(attempt/'stack.json'),'gatewaySourceHash':gatewayhash,'verifiedStageFiles':len(gateway),'verifiedContainerIdentities':len(stack['containers'])})
(root/'SOURCE-AUDIT.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))

# [DX-B6] Why: compare retained execution bytes with the final tree, preserving historical drift.
# Rejected: assigning a later Git head to an earlier execution.
import pathlib,json,hashlib
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6')
selected=['suite-e-test-source','tx2-dxb6-lone-d-source','tx2-dxb6-peer-c-source']+[f'tx2-dxb6-{kind}-{layout}-b-source' for kind in ['concurrent','reach'] for layout in ['legacy','lean']]+[f'tx2-dxb6-differential-{n}-c-source' for n in [0,100,200]]
results=[]
for name in selected:
 dest=root/name;capture=json.loads((dest/'CAPTURE.json').read_text());verified=0;matches=[];changed=[]
 for name2,entry in capture['files'].items():
  data=(dest/name2).read_bytes();assert len(data)==entry['bytes'] and hashlib.sha256(data).hexdigest()==entry['sha256'],(name,name2)
  verified+=1
  if name2.startswith(('packages/core/src/','packages/core/dist/','packages/datomic/src/','packages/datomic/dist/','packages/datomic/gateway/','packages/datomic/test/')):
   p=pathlib.Path(name2)
   (matches if p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256'] else changed).append(name2)
 results.append({'capture':str(dest),'observedBaseHead':capture['head'],'verifiedPreimages':verified,'finalMatches':len(matches),'finalDifferentPaths':changed})
(root/'SOURCE-AUDIT.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))

# [DX-B6] Why: retain bulky first failures/preimages outside Git with independently read-back hashes.
# Rejected: committing raw oracle directories or treating integrity as semantic acceptance.
import pathlib,hashlib,json
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B6');dest=pathlib.Path('lab/experiments/EXP-DX1/b6')
excluded={'SHA256SUMS.full','EVIDENCE-INTEGRITY.json','evidence-index.log'}
entries=[]
for p in sorted(root.rglob('*')):
 if p.is_file() and str(p.relative_to(root)) not in excluded:
  entries.append((hashlib.sha256(p.read_bytes()).hexdigest(),str(p.relative_to(root)),p.stat().st_size))
manifest=root/'SHA256SUMS.full';manifest.write_text(''.join(f'{digest}  {name}\n' for digest,name,_ in entries))
for digest,name,size in entries:
 data=(root/name).read_bytes();assert len(data)==size and hashlib.sha256(data).hexdigest()==digest,name
copies=[]
for letter in ['b','c','d']:
 name=f'tx2-dxb6-lone-{letter}'
 for rel in ['lone-commit.json','pull-load.json']:
  p=root/name/'driver'/rel
  candidates=list((root.parent/'DX-H3'/name).rglob(rel))
  assert p.exists() and candidates,(name,rel)
  h=hashlib.sha256(p.read_bytes()).hexdigest();same=[str(q) for q in candidates if hashlib.sha256(q.read_bytes()).hexdigest()==h]
  assert same,(name,rel)
  copies.append({'b6':str(p),'sha256':h,'identicalOriginals':same})
result={'purpose':'artifact integrity only; no semantic verdict','root':str(root),'files':len(entries),'bytes':sum(e[2] for e in entries),'readbackFiles':len(entries),'fullManifest':str(manifest),'fullManifestSha256':hashlib.sha256(manifest.read_bytes()).hexdigest(),'vmCopies':copies}
(root/'EVIDENCE-INTEGRITY.json').write_text(json.dumps(result,indent=2)+'\n')
small=[manifest,root/'EVIDENCE-INTEGRITY.json',root/'SOURCE-AUDIT.json',root/'SUITE-COVERAGE.json',root/'write-analysis.json',root/'FINAL-INVENTORY.json']+[root/x for x in ['suite-e.log','peer-c.log','lone-d.log','offline-final3.log','adapter-types.log','lint-final.log','types-final.log','observation-unit.log']]+[root/f'differential-{n}-c.log' for n in [0,100,200]]
(dest/'SHA256SUMS').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p}\n' for p in small))
(dest/'EVIDENCE.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='vmCopies'},indent=2))

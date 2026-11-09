# [CX-VINTQ] Why: retain raw evidence outside Git with independent destination readback. Rejected: deleting original fixtures or committing megabyte receipts.
import hashlib,json,pathlib,shutil,subprocess
root=pathlib.Path.cwd(); dest=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VINTQ')
dest.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files=[]
for base in ['lab/verify/INT-Q/output','lab/verify/SQL01/evidence','lab/verify/SQL01/data','runs/broker']:
 for p in sorted((root/base).rglob('*')):
  if p.is_symlink() or not p.is_file():continue
  rel=p.relative_to(root);target=dest/'raw'/rel;target.parent.mkdir(parents=True,exist_ok=True)
  before=sha(p)
  if not target.exists():shutil.copy2(p,target)
  assert sha(target)==before==sha(p),str(rel)
  files.append((str(pathlib.Path('raw')/rel),before,p.stat().st_size))
p=root/'lab/verify/INT-Q/tools/pnpm-10.11.0.tgz';target=dest/'pnpm-10.11.0.tgz';shutil.copy2(p,target);assert sha(target)==sha(p);files.append((target.name,sha(p),p.stat().st_size))
manifest=''.join(f'{h}  {p}\n' for p,h,_ in files)
(root/'lab/verify/INT-Q/SHA256SUMS').write_text(manifest)
# Verify source and log bindings before summarizing execution observations; semantic verdict stays in VERIFY.md.
runs=[]
for f in sorted((root/'lab/verify/INT-Q/output').glob('*/receipt.json')):
 r=json.loads(f.read_text());assert sha(f.parent/'command.log')==r['logSha256']
 drift=[p for p,h in r['source'].items() if not (root/p).is_file() or sha(root/p)!=h]
 assert not drift,drift
 runs.append({k:r[k] for k in ['label','argv','head','start','end','node','endpoint','freeBytes','result','sourceUnchanged'] }|{'receipt':str(pathlib.Path('raw')/f.relative_to(root)),'receiptSha256':sha(f),'logSha256':r['logSha256'],'currentInputsMatch':True})
(root/'lab/verify/INT-Q/RUNS.json').write_text(json.dumps(runs,indent=2)+'\n')
info={'root':str(dest),'files':len(files),'bytes':sum(x[2] for x in files),'sha256sumsSha256':sha(root/'lab/verify/INT-Q/SHA256SUMS'),'originalsRetained':True,'symlinksCopied':False,'toolArchiveSha256':sha(p)}
(root/'lab/verify/INT-Q/EVIDENCE.json').write_text(json.dumps(info,indent=2)+'\n');print(json.dumps(info))

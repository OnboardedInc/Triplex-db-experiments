#!/usr/bin/env python3
# [DX-S3] Why: check cleanup and reread retained bytes after writers stop. Rejected: a semantic verdict from exit status or hashes alone.
import pathlib,hashlib,json,subprocess,shutil,datetime
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S3')
owned=pathlib.Path('lab/experiments/EXP-DX1/s3')
def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()
def docker(args):
    return subprocess.check_output(['docker','--host','unix:///Users/sam/.colima/triplex2/docker.sock']+args,text=True).splitlines()
assert not (root/'INTEGRITY.json').exists(), 'seal only after all evidence writers finish'
inventory={
    'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'containers':docker(['ps','-a','--filter','name=tx2-dxs3-','--format','{{.Names}}']),
    'networks':docker(['network','ls','--filter','name=tx2-dxs3-','--format','{{.Name}}']),
    'volumes':docker(['volume','ls','--filter','name=tx2-dxs3-','--format','{{.Name}}'])}
(root/'final-inventory.json').write_text(json.dumps(inventory,indent=2))
assert all(not inventory[k] for k in ['containers','networks','volumes']), inventory
expected=json.loads((root/'source-build/files.json').read_text())
checked={p:h for p,h in expected.items() if p.startswith(('packages/','lab/bench/lib/'))}
moved={p:{'before':h,'after':digest(pathlib.Path(p))} for p,h in checked.items() if digest(pathlib.Path(p))!=h}
(root/'source-readback.json').write_text(json.dumps({'checked':len(checked),'changed':moved},indent=2))
assert not moved,moved
final=root/'source-final';final.mkdir()
for p in list(owned.glob('*'))+[pathlib.Path(p) for p in ['lab/experiments/EXP-DX1/stack/up.sh','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','turbo.json']]:
    if p.is_file() and p.name not in ['SHA256SUMS','EVIDENCE.md']:
        dest=final/p;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
files=sorted(p for p in root.rglob('*') if p.is_file() and p not in [root/'SHA256SUMS',root/'INTEGRITY.json'])
hashes={str(p.relative_to(root)):digest(p) for p in files}
manifest=''.join(f'{h}  {p}\n' for p,h in hashes.items())
(root/'SHA256SUMS').write_text(manifest)
(owned/'SHA256SUMS').write_text(manifest)
mismatches=[p for p,h in hashes.items() if digest(root/p)!=h]
summary={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':len(files),'bytes':sum(p.stat().st_size for p in files),'manifestSha256':digest(root/'SHA256SUMS'),'readbackMismatches':mismatches,'meaning':'Retained byte integrity and prefix-scoped inventory only; no semantic or performance acceptance verdict.'}
(root/'INTEGRITY.json').write_text(json.dumps(summary,indent=2))
assert not mismatches,mismatches
print(json.dumps(summary,indent=2))

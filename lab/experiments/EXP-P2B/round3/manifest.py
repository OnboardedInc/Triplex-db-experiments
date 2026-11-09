"""[EXP-P2B-R3] Why: index actual retained files and source changes without committing bulky observations.
Rejected: checksumming deleted pre-archive filenames or following dependency directory symlinks.
"""
import pathlib,hashlib,json,os,subprocess
work=pathlib.Path.cwd();base=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B');root=base/'round3';out=work/'lab/experiments/EXP-P2B'
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
links={};files=[]
for directory,ds,fs in os.walk(root,followlinks=False):
 for name in ds+fs:
  p=pathlib.Path(directory)/name
  if p.is_symlink():links[str(p.relative_to(base))]=os.readlink(p)
 for name in fs:
  p=pathlib.Path(directory)/name
  if p.is_file() and not p.is_symlink():files.append(p)
files+=sorted(p for p in base.glob('r3-*') if p.is_file() and not p.is_symlink())
linkfile=out/'LINK-TARGETS-round3.json';linkfile.write_text(json.dumps(links,indent=2)+'\n')
lines=[];chunks=[];size=0;total=0
for p in sorted(set(files)):
 line=f'{sha(p)}  {p}\n';total+=p.stat().st_size
 if size+len(line.encode())>750000:chunks.append(lines);lines=[];size=0
 lines.append(line);size+=len(line.encode())
if lines:chunks.append(lines)
for i,chunk in enumerate(chunks,1):(out/f'SHA256SUMS-round3-{i:02}.txt').write_text(''.join(chunk))
base_identity=root/'finalization-preimages/identity.json'
base_head=json.loads(base_identity.read_text())['baseHead'] if base_identity.exists() else 'HEAD'
changed=subprocess.check_output(['git','diff','--name-only',base_head],text=True).splitlines()+subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines()
sources=[]
for f in sorted(set(changed)):
 if not (f.startswith('packages/') or f.endswith(('.mjs','.py'))):continue
 p=work/f
 if not p.is_file():continue
 old=subprocess.run(['git','show',f'{base_head}:{f}'],capture_output=True)
 sources.append(dict(path=f,oldSha256=hashlib.sha256(old.stdout).hexdigest() if old.returncode==0 else None,newSha256=sha(p)))
(out/'SOURCE-CHANGES-round3.json').write_text(json.dumps(sources,indent=2)+'\n')
print(json.dumps(dict(files=len(set(files)),bytes=total,manifestChunks=len(chunks),symlinks=len(links),sourceFiles=len(sources))))

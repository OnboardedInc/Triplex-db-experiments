# [DX-B9] Why: retain small committed digest shards for every durable raw file, without bulky evidence in Git.
# Rejected: copying multi-megabyte raw profiles, excluding failed attempts, or hashing still-running gate output.
import hashlib,json,pathlib
here=pathlib.Path(__file__).resolve().parent
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9')
assert (root/'default-mixed-1/exit.json').exists()
assert (root/'tx2-dxb9-a-default1-short-gate-union.json').exists()
assert json.loads((root/'final-owned-cleanup/result.json').read_text())['absenceObserved']
files=sorted(p for p in root.rglob('*') if p.is_file())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while chunk:=f.read(1024*1024):h.update(chunk)
 return h.hexdigest()
chunks=[];current=[];size=0;total=0
for p in files:
 st=p.stat();d=digest(p);assert (st.st_size,st.st_mtime_ns)==(p.stat().st_size,p.stat().st_mtime_ns),(p,'changed while hashing')
 total+=st.st_size;line=d+'  '+str(p.relative_to(root))+'\n'
 if size+len(line.encode())>750000:chunks.append(''.join(current));current=[];size=0
 current.append(line);size+=len(line.encode())
if current:chunks.append(''.join(current))
for p in here.glob('SHA256SUMS.part-*'):p.unlink()
manifest=[]
for i,chunk in enumerate(chunks):
 p=here/f'SHA256SUMS.part-{i:03d}';p.write_text(chunk);assert p.stat().st_size<1000000
 manifest.append(digest(p)+'  '+p.name+'\n')
(here/'SHA256SUMS').write_text(''.join(manifest))
(here/'EVIDENCE-SIZE.json').write_text(json.dumps({'root':str(root),'files':len(files),'logicalBytes':total,'gib':total/1024**3,'manifestShards':len(chunks),'allRawFilesIncluded':True},indent=2)+'\n')
print(f'{len(files)} durable files, {total} bytes, {len(chunks)} digest shards; manifests are integrity indexes, not acceptance')

# [DX-B9] Why: retain exact raw seed/request bytes in lossless compressed form, with original hashes for recovery.
# Rejected: truncating first-failure logs or silently changing the paths their old receipts cite.
import hashlib,json,pathlib,subprocess
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9')
assert (root/'default-mixed-1/exit.json').exists()
rows=[]
for p in sorted(root.rglob('*.ndjson')):
 if p.stat().st_size<1024*1024:continue
 raw=p.read_bytes(); h=hashlib.sha256(raw).hexdigest();size=len(raw);del raw
 dest=p.with_name(p.name+'.zst');assert not dest.exists()
 subprocess.run(['zstd','-q','-T1','--rm',str(p)],check=True)
 # Check recovered content immediately; old receipt paths are resolved through this index.
 recovered=subprocess.run(['zstd','-q','-dc',str(dest)],stdout=subprocess.PIPE,check=True).stdout
 assert len(recovered)==size and hashlib.sha256(recovered).hexdigest()==h
 rows.append({'originalPath':str(p.relative_to(root)),'originalBytes':size,'originalSha256':h,'compressedPath':str(dest.relative_to(root)),'compressedBytes':dest.stat().st_size,'compressedSha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
(root/'COMPRESSION-INDEX.json').write_text(json.dumps({'kind':'lossless storage transformation; no semantic verdict','files':rows},indent=2)+'\n')
print('Lossless compression verified:',len(rows),'files')

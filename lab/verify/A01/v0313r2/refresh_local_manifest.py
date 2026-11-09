"""Refresh local retention checksums after final prose, granting no new semantic verdict."""
import hashlib,json
from pathlib import Path
H=Path(__file__).resolve().parent;ROOT=H.parents[3];S=json.loads((H/'source.json').read_bytes());RAW=Path(S['raw'])
info=json.loads((H/'evidence-index.json').read_bytes());manifest=(H/'RAW-SHA256SUMS').read_bytes()
assert manifest==(RAW/'SHA256SUMS').read_bytes() and hashlib.sha256(manifest).hexdigest()==info['rawManifestSha256']
for line in manifest.decode().splitlines():
 digest,p=line.split('  ',1);assert hashlib.sha256((RAW/p).read_bytes()).hexdigest()==digest
# [CX-VA01-0313-R2] Why: final report prose may add sealed size/cutoff facts after source cleanup; rehash all local bytes without rerunning or relabelling any gate. Rejected: leaving a stale report checksum or manufacturing a new PASS from retained text.
local=sorted([H.parent/'VERIFY-0.3.13-round2.md']+[p for p in H.rglob('*') if p.is_file() and p.name!='SHA256SUMS'])
assert all(p.stat().st_size<=1000000 for p in local)
(H/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(ROOT))+'\n' for p in local))
for line in (H/'SHA256SUMS').read_text().splitlines():
 digest,p=line.split('  ',1);assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==digest
print('Sealed raw bytes unchanged; every final local byte rehashed')

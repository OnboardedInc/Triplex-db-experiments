"""CX-VA01-040: finalize the evidence manifest after collector stdout closes.

Why: a collector's own log can gain its last line after an in-process manifest is made.
Rejected: accepting that stale digest or deleting the first manifest and its diagnostic.
"""
import hashlib
import json
from pathlib import Path
import shutil

R = Path(__file__).resolve().parents[3]
E = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040')
V = R / 'lab/verify/A01/evidence-0.4.0'
assert shutil.disk_usage(R).free >= 5 * 1024**3
sha = lambda b: hashlib.sha256(b).hexdigest()
old = (V / 'SHA256SUMS').read_bytes()
bad = []
for line in old.decode().splitlines():
    digest, name = line.split('  ', 1)
    actual = sha((E / name).read_bytes())
    if actual != digest: bad.append({'path': name, 'listedSha256': digest, 'actualSha256': actual})
assert [b['path'] for b in bad] == ['artifact-audit-attempt1.log'], bad
(E / 'manifest-initial-check.json').write_text(json.dumps({'mismatches': bad, 'reason': 'collector stdout closed after its provisional manifest'}, indent=2) + '\n')
(E / 'manifest-attempt1-SHA256SUMS').write_bytes(old)
shutil.copy2(Path(__file__), E / 'review-tools/manifest040.py')
entries = []
for p in sorted(E.rglob('*')):
    if not p.is_file() or p.is_symlink(): continue
    rel = p.relative_to(E)
    if any(s in ['node_modules', 'npm-cache', '_cacache', '.pnpm-store'] for s in rel.parts): continue
    entries.append((str(rel), sha(p.read_bytes()), p.stat().st_size))
manifest = ''.join(h + '  ' + p + '\n' for p, h, _ in entries).encode()
(V / 'SHA256SUMS').write_bytes(manifest)
for p, digest, size in entries:
    assert sha((E / p).read_bytes()) == digest and (E / p).stat().st_size == size
summary = {'files': len(entries), 'bytes': sum(s for _, _, s in entries), 'manifestSha256': sha(manifest),
           'allEntriesReread': True, 'initialMismatch': bad, 'dependencyCachesExcluded': True}
(V / 'manifest-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))

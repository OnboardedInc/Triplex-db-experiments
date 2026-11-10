# [DX-B5] Why: retain bulky immutable observations externally with independently readable byte hashes.
# Rejected: committing raw oracle/benchmark output, or treating hashes as a semantic acceptance gate.
import datetime
import hashlib
import json
import pathlib
import subprocess

root = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B5')
out = pathlib.Path('lab/experiments/EXP-DX1/b5')
if (root / 'functional-active').exists():
    raise SystemExit('functional guard is still held; do not seal active evidence')
files = [p for p in sorted(root.rglob('*')) if p.is_file()]
rows = [(hashlib.sha256(p.read_bytes()).hexdigest(), str(p.relative_to(root)), p.stat().st_size) for p in files]
manifest = out / 'SHA256SUMS'
manifest.write_text(''.join(f'{digest}  {name}\n' for digest, name, _ in rows))
# Read back both the emitted manifest and each source file; a partial write cannot count as integrity verification.
for line in manifest.read_text().splitlines():
    digest, name = line.split('  ', 1)
    if hashlib.sha256((root / name).read_bytes()).hexdigest() != digest:
        raise SystemExit(f'changed during readback: {name}')
(out / 'EVIDENCE.json').write_text(json.dumps({
    'kind': 'developer-evidence-byte-index',
    'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'headBeforeIndexCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'root': str(root), 'files': len(rows), 'bytes': sum(size for _, _, size in rows),
    'manifestSha256': hashlib.sha256(manifest.read_bytes()).hexdigest(),
    'readbackFiles': len(rows),
    'limitations': 'Integrity and attempt binding only; no semantic acceptance or complete source-coverage claim.',
}, indent=2) + '\n')
print(len(rows), 'files hashed and read back;', sum(size for _, _, size in rows), 'bytes retained')

# [CX-INT-Q] Why: preserve gate bytes and synthetic fixtures outside Git without removing originals.
# Rejected: deleting broad output roots before task ownership is independently established.
import hashlib, json, pathlib, shutil
root = pathlib.Path.cwd()
base = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-INT-Q')
run_ids = ['G0-qlever-20261109T051022Z-8d85d5', 'G0-qlever-20261109T051506Z-ddbc5c', 'G0-xtdb-20261109T052037Z-e50469']
files = set()
for run_id in run_ids:
    p = root / 'lab/runs/G0' / (run_id + '.json')
    files.add(p)
    files.update((root / 'runs/G0' / run_id).rglob('*'))
    receipt = json.loads(p.read_text())
    for obj in receipt['objects']:
        h = obj['sha256']
        for candidate in [(root / 'runs/objects' / h), (root / 'runs/objects' / h[:2] / h)]:
            if candidate.is_file(): files.add(candidate)
# These are read-only evidence copies. The task's originals and their directory entries remain intact.
for rel in ['lab/verify/SQL01/evidence', 'lab/verify/SQL01/data', 'runs/broker']:
    files.update((root / rel).rglob('*'))
records = []
for p in sorted(files):
    if not p.is_file(): continue
    if p.is_symlink(): raise RuntimeError('Unexpected evidence symlink: ' + str(p))
    relative = p.relative_to(root)
    dest = base / 'fresh' / relative
    dest.parent.mkdir(parents=True, exist_ok=True)
    with p.open('rb') as f: h = hashlib.file_digest(f, 'sha256').hexdigest()
    shutil.copyfile(p, dest)
    with dest.open('rb') as f: copied = hashlib.file_digest(f, 'sha256').hexdigest()
    if copied != h: raise RuntimeError('Copy mismatch: ' + str(p))
    records.append({'path': str(relative), 'bytes': p.stat().st_size, 'sha256': h})
for n in range(0, len(records), 1500):
    (root / f'lab/experiments/INT-Q/FRESH-SHA256SUMS-{n//1500+1}').write_text(''.join(f"{r['sha256']}  {r['path']}\n" for r in records[n:n+1500]))
(base / 'fresh-inventory.json').write_text(json.dumps(records, indent=2) + '\n')
print(json.dumps({'files': len(records), 'bytes': sum(r['bytes'] for r in records), 'root': str(base / 'fresh'), 'originalsRetained': True}))

import hashlib
import json
import pathlib
import shutil

# [EXP-DF01] Why: terminal bytes and first failures need durable copies with independently checkable hashes.
# Rejected: adopting interrupted output as a PASS or storing bulky dependency/raw bytes in git.
repo = pathlib.Path.cwd()
durable = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01')
local = repo / 'lab/experiments/EXP-DF01'
runs = ['G0-datomic-20261109T073729Z-b9d89b', 'G0-datomic-20261109T074129Z-83a091',
        'G0-datomic-20261109T074216Z-bab2d9', 'G0-datomic-20261109T074723Z-fe429c']

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def copy(src, dest, expected=None):
    assert src.is_file() and not src.is_symlink(), src
    before = sha(src)
    if expected is not None:
        assert before == expected, src
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        assert sha(dest) == before, dest
    else:
        shutil.copyfile(src, dest)
    assert sha(src) == sha(dest) == before, src

for run in runs:
    raw = repo / 'runs/G0' / run
    for src in sorted(raw.rglob('*')):
        if src.is_file():
            copy(src, durable / 'gates' / run / 'raw' / src.relative_to(raw))
    receipt = repo / 'lab/runs/G0' / (run + '.json')
    if receipt.exists():
        copy(receipt, durable / 'gates' / run / 'receipt.json')
        data = json.loads(receipt.read_text())
        for entry in data['objects']:
            if 'sha256' in entry:
                digest = entry['sha256']
                copy(repo / 'runs/objects' / digest, durable / 'objects' / digest, digest)
    else:
        assert run == 'G0-datomic-20261109T074129Z-83a091'

xtdb = repo / 'packages/xtdb/dist'
for src in sorted(xtdb.rglob('*')):
    if src.is_file():
        copy(src, durable / 'xtdb-dist' / src.relative_to(xtdb))

files = sorted(p for p in durable.rglob('*') if p.is_file())
(local / 'DURABLE-SHA256SUMS').write_text(''.join(sha(p) + '  ' + str(p.relative_to(durable)) + '\n' for p in files))
small = sorted(p for p in local.rglob('*') if p.is_file() and p.name not in ['FILES-SHA256SUMS', 'retention.log'])
assert all(p.stat().st_size <= 1000000 for p in small)
(local / 'FILES-SHA256SUMS').write_text(''.join(sha(p) + '  ' + str(p.relative_to(local)) + '\n' for p in small))
print(json.dumps({'durableFiles': len(files), 'localFiles': len(small), 'root': str(durable)}))

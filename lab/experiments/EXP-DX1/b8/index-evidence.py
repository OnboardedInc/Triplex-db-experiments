# [DX-B8] Why: bind retained raw bytes and source preimages without committing bulky recursive inventories.
# Rejected: indexing live writers, loading whole profiles into memory, or treating a checksum as semantic acceptance.
import hashlib,pathlib
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B8')
repo=pathlib.Path('lab/experiments/EXP-DX1/b8')
def sha(p):
 before=p.stat();h=hashlib.sha256()
 with p.open('rb') as f:
  while block:=f.read(1024*1024):h.update(block)
 after=p.stat();assert (before.st_size,before.st_mtime_ns,before.st_ino)==(after.st_size,after.st_mtime_ns,after.st_ino),str(p)
 return h.hexdigest()
rows=[];count=total=0
for p in sorted(root.iterdir()):
 if p.is_dir():
  manifest=p/'DX-B8-FINAL-SHA256SUMS';assert not manifest.exists(),str(manifest)
  files=sorted(v for v in p.rglob('*') if v.is_file())
  with manifest.open('x') as f:
   for v in files:
    f.write(f'{sha(v)}  {v.relative_to(p)}\n');count+=1;total+=v.stat().st_size
  rows.append((sha(manifest),str(manifest.relative_to(root))))
 elif p.is_file():rows.append((sha(p),p.name));count+=1;total+=p.stat().st_size
(repo/'SHA256SUMS').write_text(''.join(f'{h}  {p}\n' for h,p in rows))
assert (repo/'SHA256SUMS').stat().st_size<1000000
(repo/'EVIDENCE.md').write_text(f'''# DX-B8 evidence index

Durable root: `{root}/`.

[SHA256SUMS](SHA256SUMS) binds {len(rows)} root artifacts or directory manifests, covering {count} files ({total:,} bytes before
these manifests). Each directory has `DX-B8-FINAL-SHA256SUMS`; verify it from that directory after checking the root list from
the durable root. Checksums bind bytes and paths, not semantic acceptance. Writers were finished before indexing; each file's
size, inode and modification time must remain stable while hashing. Large profile JSON is gzip-compressed with original stream
hashes and round-trip verification in `profile-compression*.json`; JFR and source preimages remain retained.

- `before-*`: unchanged growing-scope slowdown and retraction-filter stack; only the original no-helper baseline reached98,553.
- `state-after-*-a.json`, `growth-*-a.log`: completed paired 19f5422d growth observations through500,000 commits.
- `integrated-gate-union.json`, `stepc-v6-gate-union.json`: distinct fully source-bound developer gate unions.
- `tx2-dxb8-stepc-v6-full-*`, `shortdiff-*`, `race-*`: final both-layout gates, complete300-case differential and independent oracle race.
- `tx2-dxb8-load-noawake-a-*`, `load-awake-a-*`: paired 19f5422d frozen/moving measurements and profiles.
- `tx2-dxb8-load-weighted-v2-*`: rejected labelled low-weight helper control, not the required original-helper arm.
- `tx2-dxb8-final-v6-noawake-1794328871/`: completed da77a50a no-helper measurement; source stability and396-second empty cleanup.
- `tx2-dxb8-final-v6-awake-1794329267/`: disk-preflight failure, no engine, zero-second empty cleanup; no measurement verdict.
- `final-v6-analysis.json`, `profile-final-v6-*.json`: streaming analysis of the completed final arm and captured callers.
- `DISK-BLOCK.json`, `final-cleanup.json`: missing helper/W0 arms due to host disk below5GiB, and zero remaining owned resources.
- All failed, superseded and truncated attempts remain. The initial profile export's exit0 cleanup is explicitly not export success.

[REPORT.md](REPORT.md) distinguishes correctness, head-cost improvements, missed performance targets and unexecuted fingerprints.
No acceptance promotion, independent review, main merge or push is implied.
''')
print(f'Indexed {count} retained files / {total} bytes in {len(rows)} root entries')

"""[CX-VDI01-R3] Why: retain completed round-2 observations with stable byte hashes.
Rejected: including active logs or dependency caches in a semantic-evidence manifest.
"""
import pathlib,os,hashlib,json,datetime,subprocess
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01/round3-review')
rows=[];size=0
for directory,dirs,files in os.walk(root):
    dirs[:]=sorted(d for d in dirs if d not in ['node_modules','npm-cache','bin','__pycache__'])
    for n in sorted(files):
        p=pathlib.Path(directory)/n;rel=p.relative_to(root).as_posix()
        if p.is_symlink() or rel in ['SHA256SUMS','INVENTORY.json']:continue
        before=p.stat();h=hashlib.sha256()
        with p.open('rb') as f:
            for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
        after=p.stat();assert(before.st_size,before.st_mtime_ns)==(after.st_size,after.st_mtime_ns),rel
        rows.append(f'{h.hexdigest()}  {rel}\n');size+=after.st_size
text=''.join(rows);(root/'SHA256SUMS').write_text(text)
pathlib.Path('lab/verify/DI01/SHA256SUMS-round3').write_text(text)
receipt=dict(files=len(rows),bytes=size,manifestSha256=hashlib.sha256(text.encode()).hexdigest(),head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),scriptSha256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),completed=datetime.datetime.now(datetime.timezone.utc).isoformat(),offline=True,slot=None,excludes=['dependency installations','npm caches','bin symlinks','inventory self outputs'])
(root/'INVENTORY.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))

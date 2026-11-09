"""[CX-VDI01] Why: bind completed reviewer observations without committing bulk output.
Rejected: hashing mutable active output or including dependency caches as semantic evidence.
"""
import hashlib,json,pathlib,os,datetime
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01')
rows=[]; total=0
for directory,dirs,files in os.walk(root):
    dirs[:]=sorted(d for d in dirs if d not in ['node_modules','npm-cache','bin','__pycache__'])
    for name in sorted(files):
        p=pathlib.Path(directory)/name
        if p.is_symlink() or p.relative_to(root).as_posix() in ['INVENTORY.json','SHA256SUMS']: continue
        before=p.stat(); h=hashlib.sha256()
        with p.open('rb') as stream:
            for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
        after=p.stat();assert (before.st_size,before.st_mtime_ns)==(after.st_size,after.st_mtime_ns),str(p)
        rows.append(f'{h.hexdigest()}  {p.relative_to(root).as_posix()}\n');total+=after.st_size
text=''.join(rows); (root/'SHA256SUMS').write_text(text)
out=dict(files=len(rows),bytes=total,manifestSha256=hashlib.sha256(text.encode()).hexdigest(),completed=datetime.datetime.now(datetime.timezone.utc).isoformat(),excluded=['dependency installations','npm caches','bin symlinks','inventory self outputs'],scriptSha256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest())
(root/'INVENTORY.json').write_text(json.dumps(out,indent=2)+'\n')
# [CX-VDI01] Why: the committed manifest is directly usable from the durable root. Rejected: committing the databases or generated commands.
pathlib.Path('lab/verify/DI01/SHA256SUMS').write_text(text)
print(json.dumps(out))

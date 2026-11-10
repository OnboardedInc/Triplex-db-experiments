# [DX-B6] Why: contract builders need exact old/new source bytes without editing acceptance.
# Rejected: hand-waving that a public seam cannot be pinned.
import subprocess,pathlib,hashlib,json
base='66c40d5b5cd723da48ffd344ac6644bd00ed0fae'
paths=subprocess.check_output(['git','diff','--name-only',base,'HEAD'],text=True).splitlines()
acceptance={str(p):p.read_bytes() for p in pathlib.Path('lab/acceptance').rglob('*') if p.is_file()}
changes=[]
for name in paths:
 if not (name.startswith('packages/') or name.startswith('lab/experiments/EXP-DX1/stack/')):continue
 p=pathlib.Path(name)
 try:old=subprocess.check_output(['git','show',base+':'+name],stderr=subprocess.DEVNULL)
 except subprocess.CalledProcessError:old=None
 oldhash=hashlib.sha256(old).hexdigest() if old is not None else None
 newhash=hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
 matches=[a for a,data in acceptance.items() if name.encode() in data or (oldhash and oldhash.encode() in data)]
 changes.append({'path':name,'oldSha256':oldhash,'newSha256':newhash,'acceptanceReferences':matches})
pathlib.Path('lab/experiments/EXP-DX1/b6/HASH-CHANGES.json').write_text(json.dumps({'base':base,'changes':changes},indent=2)+'\n')
print(json.dumps({'paths':len(changes),'referenced':sum(bool(c['acceptanceReferences']) for c in changes)}))

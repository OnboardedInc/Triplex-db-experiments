# [DX-B4] Why: retain old/new file hashes without modifying the acceptance contract. Rejected: repinning as part of implementation.
import hashlib,json,pathlib,subprocess
base='8ff41660a9eba6ef4a52ba671e6bed8ee2b4034d'
files=subprocess.check_output(['git','diff',base,'--name-only'],text=True).splitlines()
acceptance='\n'.join(p.read_text(errors='replace') for p in pathlib.Path('lab/acceptance').rglob('*') if p.is_file())
rows=[]
for name in files:
    p=pathlib.Path(name)
    if not p.is_file():continue
    old=subprocess.run(['git','show',f'{base}:{name}'],capture_output=True)
    if old.returncode:continue
    before=hashlib.sha256(old.stdout).hexdigest();after=hashlib.sha256(p.read_bytes()).hexdigest()
    if before!=after:rows.append(dict(path=name,oldSha256=before,newSha256=after,referencedInAcceptance=name in acceptance or before in acceptance))
pathlib.Path('lab/experiments/EXP-DX1/b4/HASH-CHANGES.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps([r for r in rows if r['referencedInAcceptance']],indent=2))

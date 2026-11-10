# [DX-B8] Why: show every changed package preimage and detect explicit acceptance pins without editing the contract.
# Rejected: updating pins to make a source-changing experiment appear accepted.
import hashlib,json,pathlib,subprocess
base='53fcf4f289b257a7c26a630a3c6b447ff926b516'
paths=set(subprocess.check_output(['git','diff','--name-only',base,'--','packages/datomic'],text=True).splitlines())
paths.update(subprocess.check_output(['git','ls-files','--others','--exclude-standard','packages/datomic'],text=True).splitlines())
contracts=[(str(p),p.read_text(errors='replace')) for p in pathlib.Path('lab/acceptance').rglob('*') if p.is_file()]
rows=[]
for name in sorted(paths):
 old=subprocess.run(['git','show',f'{base}:{name}'],capture_output=True)
 before=hashlib.sha256(old.stdout).hexdigest() if old.returncode==0 else None
 p=pathlib.Path(name);after=hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None
 if before==after:continue
 refs=[name for name,text in contracts if name and ((before and before in text) or p.as_posix() in text)]
 rows.append({'path':name,'oldSha256':before,'newSha256':after,'acceptanceReferences':refs})
pathlib.Path('lab/experiments/EXP-DX1/b8/SOURCE-HASHES.json').write_text(json.dumps({'base':base,'files':rows},indent=2)+'\n')
print(json.dumps({'changed':len(rows),'withExplicitAcceptanceReferences':[r['path'] for r in rows if r['acceptanceReferences']]}))

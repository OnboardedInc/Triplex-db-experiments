#!/usr/bin/env python3
"""[DX-H4] Why: hash retained bytes after runs quiesce; rejected: checksums as semantic verdicts."""
import hashlib,json,pathlib,subprocess,sys
repo=pathlib.Path.cwd();here=repo/'lab/experiments/EXP-DX1/h4'
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4')
base=subprocess.check_output(['git','rev-parse','1ea9013c^'],text=True).strip()
paths=subprocess.check_output(['git','diff','--name-only',base,'--','lab/bench','lab/experiments/EXP-DX1/stack','lab/experiments/EXP-DX1/h3/attempt.sh','lab/experiments/EXP-DX1/h4'],text=True).splitlines()
pins={str(p.relative_to(repo)):p.read_text(errors='replace') for p in (repo/'lab/acceptance').rglob('*') if p.is_file()}
rows=[]
for name in paths:
 p=repo/name
 if not p.is_file():continue
 old=subprocess.run(['git','show',f'{base}:{name}'],capture_output=True)
 oldhash=hashlib.sha256(old.stdout).hexdigest() if old.returncode==0 else None
 newhash=hashlib.sha256(p.read_bytes()).hexdigest()
 matches=[f for f,contents in pins.items() if name in contents or (oldhash and oldhash in contents)]
 rows.append({'path':name,'oldSha256':oldhash,'newSha256':newhash,'acceptanceReferences':matches})
(here/'HASH-CHANGES.json').write_text(json.dumps({'base':base,'files':rows,'contractChanged':False},indent=2)+'\n')
lines=[]
for p in sorted(root.rglob('*')):
 if p.is_file():lines.append(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p))
(here/'SHA256SUMS').write_text('\n'.join(lines)+'\n')
(here/'EVIDENCE.md').write_text('# DX-H4 retained evidence\n\nDurable evidence root: `'+str(root)+'`. Raw output and databases stay outside git. [SHA256SUMS](SHA256SUMS) binds bytes only, not semantics. [HASH-CHANGES.json](HASH-CHANGES.json) records old/new source hashes and acceptance references without re-pinning anything.\n\n'+ '\n'.join('- `'+p.name+'`' for p in sorted(root.iterdir()))+'\n')

# [CX-VRT01] Why: audit retained bytes and every existing contract pin independently. Rejected: trusting the builder's drift inventory.
import hashlib,json,pathlib,subprocess,datetime
base=pathlib.Path('lab/verify/RT01/round3')
builder=pathlib.Path('/Users/sam/projects/triplex-db-2/.claude/worktrees/rt01/lab/experiments/EXP-RT01')
sha=lambda b:hashlib.sha256(b).hexdigest()
checks=[]
for line in (builder/'SHA256SUMS').read_text().splitlines():
 expected,name=line.split('  ',1)
 p=builder/name
 actual=sha(p.read_bytes()) if p.is_file() else None
 checks.append(dict(path=name,expected=expected,actual=actual))
pins=[]
def visit(x,loc=''):
 if isinstance(x,dict):
  if isinstance(x.get('path'),str) and isinstance(x.get('sha256'),str):
   p=pathlib.Path(x['path'])
   actual=sha(p.read_bytes()) if p.is_file() else None
   pins.append(dict(location=loc,path=str(p),expected=x['sha256'],actual=actual))
  for k,v in x.items():visit(v,loc+'/'+k)
 elif isinstance(x,list):
  for k,v in enumerate(x):visit(v,loc+'/'+str(k))
visit(json.loads(pathlib.Path('lab/acceptance/obligations.json').read_text()))
source={}
for p in subprocess.check_output(['git','diff','--name-only','59e07af','4b305bc8','--','packages']).decode().splitlines():
 original=subprocess.check_output(['git','show','4b305bc8:'+p]); actual=pathlib.Path(p).read_bytes()
 source[p]=dict(expected=sha(original),actual=sha(actual))
result=dict(at=datetime.datetime.now(datetime.UTC).isoformat(),builderManifestHash=sha((builder/'SHA256SUMS').read_bytes()),manifestFiles=len(checks),manifestMismatches=[c for c in checks if c['expected']!=c['actual']],pinEntries=len(pins),pinDrift=[p for p in pins if p['expected']!=p['actual']],sourceFiles=len(source),sourceMismatches={k:v for k,v in source.items() if v['expected']!=v['actual']},acceptanceDiff=subprocess.check_output(['git','diff','--name-only','59e07af','HEAD','--','lab/acceptance']).decode())
(base/'integrity.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))

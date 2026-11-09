# [CX-VRT01-R2] Why: every fresh comparison must bind the rebuilt product and accepted independent judge. Rejected: using round 1 receipts on round 2 source.
import pathlib,json,hashlib,subprocess
BASE=pathlib.Path(__file__).resolve().parent;ROOT=BASE.parents[3]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def require_binding():
 records={}
 for folder in ['packages','reproductions']:
  p=BASE/folder/'execution.json';v=json.loads(p.read_text());assert v['stable'] and v['exit']==0,folder
  assert v['before']==v['after'] and v['runnerBefore']==v['runnerAfter'],folder
  for path,h in v['after'].items():assert sha(ROOT/path)==h,path
  for path,h in v['runnerAfter'].items():assert sha(ROOT/path)==h,path
  records[folder]=sha(p)
 r=json.loads((BASE/'reproductions/commands.json').read_text())
 for name,h in r['before'].items():assert sha(BASE/(name+'.ts'))==h,name
 copied=BASE.parent/'oracle-050';hashes={}
 for p in subprocess.check_output(['git','ls-tree','-r','--name-only','fed510e','lab/oracles/replay'],cwd=ROOT).decode().splitlines():
  h=sha(copied/p);assert h==hashlib.sha256(subprocess.check_output(['git','show','fed510e:'+p],cwd=ROOT)).hexdigest(),p;hashes[p]=h
 builds={str(p.relative_to(ROOT)):sha(p) for pkg in ['core','testkit','xtdb','qlever'] for p in (ROOT/'packages'/pkg/'dist').rglob('*.js')}
 details={'product':'4b305bc8886d4bcdd73f36be65b53fda3e1846cd','records':records,'oracleCommit':'fed510ecf5137873d5dab1ad192f0e54f8ed0955','oracleHashes':hashes,'finalBuildHashes':builds}
 (BASE/'bindings.json').write_text(json.dumps(details,indent=2)+'\n')
 return {'product':details['product'],'records':records,'oracleCommit':details['oracleCommit'],'bindingsSha256':sha(BASE/'bindings.json')}

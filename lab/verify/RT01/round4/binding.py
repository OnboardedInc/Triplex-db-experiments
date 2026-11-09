# [CX-VRT01-R4] Why: compare fresh observations using exact source, emitted builds, runner and accepted-judge identities. Rejected: treating the retained initial Cloudflare setup failure as a passing whole-suite result.
import pathlib,json,hashlib,subprocess
BASE=pathlib.Path(__file__).resolve().parent;ROOT=BASE.parents[3]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def require_binding():
 records={}
 for folder in ['packages','reproductions','journal','cloudflare-retest','data-audit']:
  p=BASE/folder/'execution.json';v=json.loads(p.read_text());assert v['stable'] and v['exit']==(1 if folder=='packages'else 0),folder
  assert v['before']==v['after'] and v['runnerBefore']==v['runnerAfter']
  for path,h in {**v['after'],**v['runnerAfter']}.items():assert sha(ROOT/path)==h,path
  for path,h in v['outputs'].items():assert sha(BASE/folder/path)==h,(folder,path)
  records[folder]=sha(p)
 text=(BASE/'packages/stdout').read_text();assert text.count('exit 0')==24 and text.count('exit 1')==1 and 'cloudflare tests: exit 1' in text
 assert '10 passed (10)' in (BASE/'cloudflare-retest/stdout').read_text()
 for name,h in json.loads((BASE/'reproductions/commands.json').read_text())['before'].items():assert sha(BASE/(name+'.ts'))==h,name
 copied=BASE.parent/'oracle-050';hashes={}
 for p in subprocess.check_output(['git','ls-tree','-r','--name-only','fed510e','lab/oracles/replay'],cwd=ROOT).decode().splitlines():
  h=sha(copied/p);assert h==hashlib.sha256(subprocess.check_output(['git','show','fed510e:'+p],cwd=ROOT)).hexdigest();hashes[p]=h
 assert not subprocess.check_output(['git','diff','--name-only','472c2c24','HEAD','--','packages','pnpm-lock.yaml']).strip()
 builds={str(p.relative_to(ROOT)):sha(p)for pkg in ['core','testkit','xtdb','qlever']for p in (ROOT/'packages'/pkg/'dist').rglob('*.js')}
 details={'product':'472c2c2439922b52e33206510b6cecb0812206ed','records':records,'oracleCommit':'fed510ecf5137873d5dab1ad192f0e54f8ed0955','oracleHashes':hashes,'finalBuildHashes':builds}
 (BASE/'bindings.json').write_text(json.dumps(details,indent=2)+'\n');return {'product':details['product'],'records':records,'oracleCommit':details['oracleCommit'],'bindingsSha256':sha(BASE/'bindings.json')}

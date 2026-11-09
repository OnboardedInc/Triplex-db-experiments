# [CX-VRT01] Why: refuse stale inputs before an oracle comparison emits agreement. Rejected: accepting yesterday's observed JSON on today's source.
import hashlib,json,pathlib,subprocess
BASE=pathlib.Path(__file__).resolve().parent
ROOT=BASE.parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def require_binding():
 receipt=json.loads((BASE/'attempt2/execution.json').read_text())
 assert receipt['exit']==0 and receipt['before']==receipt['after']
 assert receipt['runnerSha256']==receipt['runnerAfter']==sha(BASE/'probe.ts')
 for path,value in receipt['after'].items():assert sha(ROOT/path)==value,path
 copied=BASE/'oracle-050'
 paths=subprocess.check_output(['git','ls-tree','-r','--name-only','fed510e','lab/oracles/replay'],cwd=ROOT).decode().splitlines()
 oracle={}
 for path in paths:
  expected=hashlib.sha256(subprocess.check_output(['git','show','fed510e:'+path],cwd=ROOT)).hexdigest()
  actual=sha(copied/path);assert actual==expected,path;oracle[path]=actual
 return {'attempt':receipt['attempt'],'sourceHead':receipt['head'],'sourceStable':True,'oracleCommit':subprocess.check_output(['git','rev-parse','fed510e'],cwd=ROOT).decode().strip(),'oracleSha256':oracle}

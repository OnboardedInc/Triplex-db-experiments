# [CX-VRT01-R2] Why: independently rerun the accepted oracle's selfcheck, fixtures and tests. Rejected: reusing round 1 or builder results.
import subprocess,pathlib,os,json,hashlib,datetime
base=pathlib.Path('lab/verify/RT01').resolve();out=base/'round2/oracle';root=base/'oracle-050'
paths=subprocess.check_output(['git','ls-tree','-r','--name-only','fed510e','lab/oracles/replay']).decode().splitlines();hashes={}
for p in paths:
 actual=hashlib.sha256((root/p).read_bytes()).hexdigest();expected=hashlib.sha256(subprocess.check_output(['git','show','fed510e:'+p])).hexdigest();assert actual==expected,p;hashes[p]=actual
jobs=[('selfcheck',['python3','-m','lab.oracles.replay','--self-check']),('tests',['python3','-m','lab.oracles.replay','--test']),('fixtures',['python3','lab/experiments/EXP-O06/fixture_runner.py'])];results=[]
for name,command in jobs:
 start=datetime.datetime.now(datetime.UTC).isoformat();r=subprocess.run(command,cwd=root,env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1'),capture_output=True);(out/(name+'.stdout')).write_bytes(r.stdout);(out/(name+'.stderr')).write_bytes(r.stderr);results.append(dict(name=name,command=command,start=start,end=datetime.datetime.now(datetime.UTC).isoformat(),exit=r.returncode));print(name,r.returncode,flush=True)
(out/'commands.json').write_text(json.dumps(dict(oracleCommit='fed510ecf5137873d5dab1ad192f0e54f8ed0955',hashes=hashes,results=results),indent=2)+'\n');assert all(r['exit']==0 for r in results)

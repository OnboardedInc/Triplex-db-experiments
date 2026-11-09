"""Reproduce the disposable current-main merge in a fresh attempt directory."""
from pathlib import Path
import hashlib,json,shutil,subprocess,time
H=Path(__file__).resolve().parent;REPO=H.parents[3]
C='191f51c173ae605e278bebae319175a143b7ee2a';MAIN='e4850f801b8a7771a94e1b3394ecc5ddf24efb5f'
RAW=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0311/contract-0.3.13-round2-attempt1')
def git(*args,cwd=REPO):return subprocess.check_output(['git',*args],cwd=cwd)
assert not RAW.exists() and not (H/'scratch').exists()
assert shutil.disk_usage(REPO).free>=5*1024**3
RAW.mkdir(parents=True)
s={'candidate':C,'main':MAIN,'merge':'2ec12111466f53718e1c8420f112402883981c28','reviewerHead':git('rev-parse','HEAD').decode().strip(),'started':time.time(),'freeBytes':shutil.disk_usage(REPO).free,'raw':str(RAW)}
subprocess.run(['git','clone','--shared','--no-checkout',str(REPO),str(H/'scratch')],check=True,capture_output=True)
R=H/'scratch';git('checkout','-b','review-0313-round2',C,cwd=R)
# [CX-VA01-0313-R2] Why: use a real current-main merge without editing either reviewed branch. Rejected: treating a historical standalone candidate as merged-tree Q87 evidence.
p=subprocess.run(['git','-c','user.name=Contract Reviewer','-c','user.email=noreply@openai.com','merge','--no-ff',MAIN,'-m','Review contract 0.3.13 round 2 with current main\n\nCo-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>'],cwd=R,capture_output=True,text=True)
(RAW/'merge.log').write_text(p.stdout+p.stderr)
s.update(mergeExit=p.returncode,testHead=git('rev-parse','HEAD',cwd=R).decode().strip(),mainSinceDispatch=git('diff','--name-only','9a7996e',MAIN).decode().splitlines(),testVsCandidate=git('diff','--name-only',C,'HEAD',cwd=R).decode().splitlines())
assert p.returncode==0 and s['mainSinceDispatch']==s['testVsCandidate']==['lab/NOTEBOOK.md','lab/STATE.md']
(H/'source.json').write_text(json.dumps(s,indent=2)+'\n')
for label,args in [('test-commit',['cat-file','commit',s['testHead']]),('test-tree',['ls-tree','-r',s['testHead']]),('current-main-only',['diff','--binary',C,s['testHead']])]:
 (RAW/(label+'.txt')).write_bytes(git(*args,cwd=R))
for name in ['lab/bin/gate.mjs','lab/bin/engine.mjs','lab/bin/heavy.mjs']:(RAW/Path(name).name).write_bytes((R/name).read_bytes())
print(json.dumps(s,indent=2))

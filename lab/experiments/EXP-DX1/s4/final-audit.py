#!/usr/bin/env python3
# [DX-S4] Why: finalize only actual source checks, a quiescent owned-resource inventory and hashes of retained bytes. Rejected: turning a successful audit into semantic acceptance or hashing files while our trials still run.
import ast,datetime,hashlib,json,os,pathlib,subprocess,sys
here=pathlib.Path(__file__).resolve().parent
root=pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4')
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while b:=f.read(1024*1024):h.update(b)
 return h.hexdigest()
checks=[];sources={}
for p in sorted(here.iterdir()):
 if p.name=='REMOVED.txt' or p.suffix not in ['.sh','.py','.mjs','.clj','.sql','.yaml','.txt']:continue
 sources[p.name]=sha(p)
 if p.suffix=='.py':ast.parse(p.read_text());checks.append([p.name,'Python AST'])
 elif p.suffix in ['.sh','.mjs']:
  cmd=['bash','-n',str(p)] if p.suffix=='.sh' else ['node','--check',str(p)]
  result=subprocess.run(cmd,capture_output=True,text=True);assert result.returncode==0,(p,result.stderr);checks.append([p.name,' '.join(cmd[:2])])
 elif p.suffix=='.clj':
  stack=[];quoted=escape=comment=False
  for c in p.read_text():
   if comment:
    if c=='\n':comment=False
    continue
   if quoted:
    if escape:escape=False
    elif c=='\\':escape=True
    elif c=='"':quoted=False
    continue
   if c==';':comment=True
   elif c=='"':quoted=True
   elif c in '([{':stack.append(c)
   elif c in ')]}':assert stack and stack.pop()==dict(zip(')]}','([{'))[c],p
  assert not stack and not quoted,p
  checks.append([p.name,'delimiter balance only; runtime compilation is per attempt'])
env=dict(os.environ,DOCKER_HOST='unix:///Users/sam/.colima/triplex2/docker.sock');inventories={}
for kind,cmd in [('containers',['ps','-a','--filter','name=tx2-dxs4','--format','{{.Names}}']),('volumes',['volume','ls','--filter','name=tx2-dxs4','--format','{{.Name}}']),('networks',['network','ls','--filter','name=tx2-dxs4','--format','{{.Name}}'])]:
 result=subprocess.run(['docker',*cmd],env=env,capture_output=True,text=True,check=True);assert not result.stdout.strip(),(kind,result.stdout);inventories[kind]=result.stdout.splitlines()
# [DX-S4] Why: empty Docker inventory alone can miss our queued container jobs. Rejected: finalizing while an owned heavy holder can later acquire the measurement lock.
heavy=[]
for owner in pathlib.Path('/Users/sam/projects/triplex-db-2/lab/locks/heavy').glob('*/owner.json'):
 try:heavy.append(json.loads(owner.read_text()))
 except FileNotFoundError:continue
permit=[x for x in heavy if x['pid']==os.getppid()]
assert len(permit)==1 and permit[0]['label'].startswith('DX-S4-final-audit'),permit
assert not any(x['label'].startswith('tx2-dxs4-') or (x['label'].startswith('DX-S4') and x['pid']!=os.getppid()) for x in heavy),heavy
removed=sorted({line for f in root.glob('*/cleanup.log') for line in f.read_text().splitlines() if line.startswith('tx2-dxs4-')})
branch=subprocess.check_output(['git','branch','--show-current'],text=True).strip();assert branch=='spike/DX-S4-storage'
changed=subprocess.check_output(['git','diff','--name-only','HEAD'],text=True).splitlines()+subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines()
assert all(p.startswith('lab/experiments/EXP-DX1/s4/') for p in changed),changed
receipt={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'classification':'DIAGNOSTIC-SYNTAX-OWNERSHIP-INVENTORY-NOT-SEMANTIC-ACCEPTANCE','source_checks':checks,'source_sha256':sources,'branch':branch,'head_before_final_commits':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'heavy_permit':permit[0],'audit_pid':os.getpid(),'docker_host':env['DOCKER_HOST'],'final_owned_resources':inventories,'removed_resources_from_cleanup_logs':removed,'limitation':'Syntax and ownership inventory only; source-bound content gates and maintenance observations remain separate per attempt.'}
(root/'continuation-final-audit.json').write_text(json.dumps(receipt,indent=2)+'\n')
entries=[]
for p in sorted(root.rglob('*')):
 if p.is_file():entries.append(f'{sha(p)}  {p.relative_to(root)}')
(here/'SHA256SUMS').write_text('\n'.join(entries)+'\n');(here/'REMOVED.txt').write_text('\n'.join(removed)+'\n')
print(json.dumps({'evidence_files':len(entries),'source_checks':len(checks),'owned_resources':inventories,'removed_resources':len(removed)}))

# [CX-VGS12F-R2] Why: bind this invocation to builder bytes and independent probes. Rejected: inherited receipt claims.
import pathlib,subprocess,hashlib,json,datetime
out=pathlib.Path('lab/verify/GS12F/round2/evidence')
def git(*a):return subprocess.check_output(['git',*a])
def sha(b):return hashlib.sha256(b).hexdigest()
head=git('rev-parse','HEAD').decode().strip();main=git('rev-parse','main').decode().strip();target=git('rev-parse','811a42a').decode().strip()
paths=[p for p in git('ls-files').decode().splitlines() if p.startswith(('packages/core/src/','packages/xtdb/src/','packages/qlever/src/','packages/sql/src/','packages/sqlite/src/','packages/postgres/src/','packages/cloudflare/src/','packages/duckdb/src/','packages/foundationdb/src/')) or p in ['pnpm-lock.yaml','vitest.workspace-aliases.ts','test/integration/test/value-domains.test.ts','packages/testkit/src/valueLimits.ts']]
files={p:sha(pathlib.Path(p).read_bytes()) for p in paths};assert all(sha(git('show',target+':'+p))==h for p,h in files.items())
for p in pathlib.Path('lab/verify/GS12F/round2').glob('*'):
 if p.is_file():files[str(p)]=sha(p.read_bytes())
(out/'execution-sources.json').write_text(json.dumps(dict(at=datetime.datetime.now(datetime.timezone.utc).isoformat(),head=head,target=target,files=files),indent=2)+'\n')
x=json.loads(git('show',target+':lab/acceptance/obligations.json'));pins={}
def walk(x):
 if isinstance(x,dict):
  if isinstance(x.get('path'),str) and isinstance(x.get('sha256'),str):pins[x['path']]=x['sha256']
  for k,v in x.items():
   if isinstance(v,str) and len(v)==64 and '/' in k:pins[k]=v
   walk(v)
 elif isinstance(x,list):
  for v in x:walk(v)
walk(x)
changed=set(git('diff','--name-only',main,target).decode().splitlines());rows=[]
for p in sorted(changed & pins.keys()):rows.append(dict(path=p,old=sha(git('show',main+':'+p)),new=sha(git('show',target+':'+p)),published=pins[p]))
result=dict(target=target,main=main,acceptanceEqualsMain=not git('diff',main,target,'--','lab/acceptance/'),changedPins=rows)
(out/'contract-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

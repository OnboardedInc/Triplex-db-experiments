# [CX-VGS12F-R3] Why: check immutable builder preimages and all main adapter definitions before testing.
# Rejected: treating builder receipts or an old main inventory as a fresh source-bound review.
import pathlib,hashlib,json,subprocess,datetime
out=pathlib.Path('lab/verify/GS12F/round3/evidence')
def git(*a):return subprocess.check_output(['git',*a])
def sha(b):return hashlib.sha256(b).hexdigest()
target=git('rev-parse','f8d1c3da').decode().strip();main=git('rev-parse','main').decode().strip();head=git('rev-parse','HEAD').decode().strip()
paths=[p for p in git('ls-files').decode().splitlines() if p.startswith('packages/') and '/src/' in p or p in ['pnpm-lock.yaml','vitest.workspace-aliases.ts','test/integration/test/value-domains.test.ts','lab/world/W0/schema.json']]
files={p:sha(pathlib.Path(p).read_bytes()) for p in paths}
assert all(sha(git('show',target+':'+p))==h for p,h in files.items())
for p in pathlib.Path('lab/verify/GS12F/round3').glob('*'):
 if p.is_file():files[str(p)]=sha(p.read_bytes())
(out/'execution-sources.json').write_text(json.dumps(dict(at=datetime.datetime.now(datetime.timezone.utc).isoformat(),head=head,target=target,main=main,files=files),indent=2)+'\n')
contract=json.loads(git('show',target+':lab/acceptance/obligations.json'));pins={}
def walk(v):
 if isinstance(v,dict):
  if isinstance(v.get('path'),str) and isinstance(v.get('sha256'),str):pins[v['path']]=v['sha256']
  for k,w in v.items():
   if isinstance(w,str) and len(w)==64 and '/' in k:pins[k]=w
   walk(w)
 elif isinstance(v,list):
  for w in v:walk(w)
walk(contract)
changed=set(git('diff','--name-only',main,target).decode().splitlines())
rows=[dict(path=p,old=sha(git('show',main+':'+p)),new=sha(git('show',target+':'+p)),published=pins[p]) for p in sorted(changed & pins.keys())]
result=dict(target=target,main=main,acceptanceEqualsMain=not git('diff',main,target,'--','lab/acceptance/'),changedPins=rows)
(out/'contract-audit.json').write_text(json.dumps(result,indent=2)+'\n')
mainpaths=git('ls-tree','-r','--name-only',main,'packages','lab','docs/datomic.md').decode().splitlines()
public=[p for p in mainpaths if p.startswith('packages/') and '/src/' in p and p.endswith(('/InMemoryKvBackend.ts','/FdbKvBackend.ts','/SqliteAdapter.ts','/PostgresqlAdapter.ts','/CloudflareAdapter.ts','/XtdbStorageAdapter.ts','/QleverStorageAdapter.ts','/effect-storage.ts'))]
world=json.loads(git('show',main+':lab/world/W0/schema.json'))
(out/'main-inventory.json').write_text(json.dumps(dict(main=main,adapterPaths=public,worldTypes=world['types'],mainHasDatomicPackage=any(p.startswith('packages/datomic/') for p in mainpaths)),indent=2)+'\n')
print(json.dumps(result,indent=2))

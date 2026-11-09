# [CX-VP2Q-11] Why: recheck sealed byte proofs, current source and owned-process quiescence, then hash every retained file.
# Rejected: treating a PID, a prior summary flag or a partial evidence listing as completion.
import hashlib,json,os,pathlib,subprocess,sys,time,shutil
root=pathlib.Path.cwd();base=pathlib.Path(sys.argv[1]);assert str(base).startswith('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2Q-11/round11/')
started=time.time();self_path=root/'lab/verify/P2Q/scripts/round11-finalize.py'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
self_sha=sha(self_path);summary=json.loads((base/'SUMMARY.json').read_text());assert summary['verdict']=='ACCEPT'
assert summary['selfSha256']==sha(root/'lab/verify/P2Q/scripts/round11-seal-final.mjs')
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==summary['head']
assert shutil.disk_usage(root).free>=5*1024**3
owners=[]
for p in pathlib.Path('/Users/sam/projects/triplex-db-2/lab/locks/heavy').glob('*/owner.json'):
 try:o=json.loads(p.read_text())
 except FileNotFoundError:continue
 if o['pid']==os.getppid() and o['label']=='CX-VP2Q-11-R11-finalize':owners.append((p,p.read_bytes()))
assert len(owners)==1;owner_path,owner_bytes=owners[0]
case_hashes={}
for name,g in summary['gates'].items():
 folder=base/name;assert sha(folder/'receipt.json')==g['receiptSha256'];r=json.loads((folder/'receipt.json').read_text())
 assert sha(folder/'command.log')==r['logSha256']
 if isinstance(r['expected'],dict):
  assert sha(folder/'vitest.json')==r['resultSha256'];d=json.loads((folder/'vitest.json').read_text());cases=[c for s in d['testResults'] for c in s['assertionResults']]
  assert [sum(c['status']=='passed' for c in cases),sum(c['status']=='failed' for c in cases),len(cases)]==g['counts']
 for p in r['preimages']:
  f=root/p['file'];archived=base/'preimages'/p['file']
  assert (f.exists() and sha(f)==p['sha256']) or (archived.exists() and sha(archived)==p['sha256']),p['file']
 for f in (folder/'cases').glob('*.json'):
  assert r['started']/1000<=f.stat().st_mtime<=r['finished']/1000
  case_hashes[str(f.relative_to(base))]=sha(f)
for kind in ['standard','fresh']:
 for row in json.loads((base/'new-live/cases'/f'round8-{kind}-immutable.json').read_text()):
  if row['route'] in ['select','selectWithRelations']:
   assert json.loads(row['before'])[0]['v']['value']=='first-0'
   assert row['after']==row['before']
for retirement in summary['retirements']:assert sha(pathlib.Path(retirement['file']))==retirement['sha256']
for f in (base/'new-live/cases').glob('*journal-immutable.json'):
 d=json.loads(f.read_text());assert all(d[k]==d['before'] for k in ['after','transaction','afterMetadata','transactionAfterMetadata'])
ps=subprocess.check_output(['ps','-axo','pid=,command='],text=True);rows={int(p[0]):p[1] for line in ps.splitlines() if len(p:=line.strip().split(None,1))==2}
owned=[]
for pid,command in rows.items():
 if not command.startswith(('node ','/Users/','/opt/')) or str(root) not in command:continue
 if '/test/fixtures/lock-holder.ts' in command or '/scripts/lock-holder.ts' in command or ('vitest' in command and ('vitest.mjs run' in command or '/dist/workers/' in command)):owned.append({'pid':pid,'command':command})
assert not owned,owned
locks=[];live=[]
for f in (base/'states').rglob('LOCK'):
 raw=f.read_bytes();pid=int(raw.strip());locks.append({'file':str(f.relative_to(base)),'pid':pid,'sha256':hashlib.sha256(raw).hexdigest()})
 if pid in rows:live.append({'pid':pid,'command':rows[pid]})
assert not live,live
assert sha(self_path)==self_sha and owner_path.read_bytes()==owner_bytes
record={'format':'p2q-round11-final-readback/1','started':started,'finished':time.time(),'sourceHead':summary['head'],'selfSha256':self_sha,'summarySha256':sha(base/'SUMMARY.json'),'heavySlot':{'file':str(owner_path),'sha256':hashlib.sha256(owner_bytes).hexdigest(),'owner':json.loads(owner_bytes)},'ownedTestProcesses':owned,'lockFiles':len(locks),'recordedPids':len({x['pid'] for x in locks}),'liveRecordedPids':live,'hostFreeBytes':shutil.disk_usage(root).free,'caseHashes':case_hashes,'retention':'Retained all durable state and first failures. Package suite removes its own fixtures. Earlier scoped abort is recorded separately; this finalizer sends no signals and deletes nothing.'}
with (base/'FINAL.json').open('x') as f:json.dump(record,f,indent=2);f.write('\n')
with (base/'lock-owner-readback.json').open('x') as f:json.dump(locks,f,indent=2);f.write('\n')
# Preserve the final authored verifier revisions as well as the initial preimages used by rejected fixtures.
for f in (root/'lab/verify/P2Q/scripts').glob('round11*'):
 dest=base/'final-verifier-source'/f.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,dest)
for f in (root/'lab/verify/P2Q/tests').glob('round11*'):
 dest=base/'final-verifier-source'/f.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,dest)
files=sorted(p for p in base.rglob('*') if p.is_file() and not p.is_symlink());links=[{'path':str(p.relative_to(base)),'target':os.readlink(p)} for p in base.rglob('*') if p.is_symlink()]
with (base/'symlinks.json').open('x') as f:json.dump(links,f,indent=2);f.write('\n')
files.append(base/'symlinks.json')
with (base/'SHA256SUMS').open('x') as f:
 for p in sorted(files):f.write(sha(p)+'  '+str(p.relative_to(base))+'\n')
# The repo's compact manifest anchors the complete durable manifest, not a partial raw-output listing.
index=root/'lab/verify/P2Q/evidence-round11';index.mkdir(exist_ok=True)
selected=[base/'SHA256SUMS',base/'SUMMARY.json',base/'FINAL.json',base/'controller-finished.json',base/'sandbox-failed-package-abort.json']+[base/name/'receipt.json' for name in summary['gates']]
with (index/'SHA256SUMS').open('x') as f:
 for p in selected:f.write(sha(p)+'  '+str(p.relative_to(base.parent))+'\n')
print(json.dumps({'finalReadback':str(base/'FINAL.json'),'filesInDurableManifest':len(files),'symlinks':len(links),'lockFiles':len(locks),'recordedPids':record['recordedPids'],'hostFreeBytes':record['hostFreeBytes'],'ownedProcesses':owned},indent=2))

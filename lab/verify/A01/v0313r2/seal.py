"""Seal quiescent attempt bytes and remove only this attempt's private source clone."""
import hashlib,json,shutil,subprocess,time
from pathlib import Path
H=Path(__file__).resolve().parent;ROOT=H.parents[3];S=json.loads((H/'source.json').read_bytes());RAW=Path(S['raw']);R=H/'scratch'
assert RAW==Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0311/contract-0.3.13-round2-attempt1')
assert json.loads((H/'result-audit.json').read_bytes())['verdict']=='ACCEPT'
assert (H/'merge-audit.json').exists() and (H/'mutation-summary.json').exists()
def git(*a,cwd=R):return subprocess.check_output(['git',*a],cwd=cwd,text=True).strip()
assert git('rev-parse','HEAD')==S['testHead'] and git('diff','--name-only','HEAD')==''
untracked=git('ls-files','--others','--exclude-standard').splitlines();assert all(p.startswith('lab/runs/G0/') for p in untracked),untracked
summary={'candidate':S['candidate'],'testHead':S['testHead'],'testedMain':S['main'],'mainAfterReview':git('rev-parse','main',cwd=ROOT),'trackedSourceDiff':'empty','untrackedPaths':untracked,'allCommandsFinished':True,'sealedAt':time.time(),'freeBytesBeforeCleanup':shutil.disk_usage(ROOT).free,'scratchRemovedAfterChecks':True}
summary['mainAdvancedPaths']=git('diff','--name-only',S['main'],summary['mainAfterReview'],cwd=ROOT).splitlines()
(H/'final-source.json').write_text(json.dumps(summary,indent=2)+'\n')
# [CX-VA01-0313-R2] Why: only the attempt-created clone is disposable after byte capture; no shared engine, build, cache or earlier evidence is removed. Rejected: broad cleanup to gain disk space.
assert R.parent==H and (R/'.git').is_file()
subprocess.run(['git','worktree','remove','--force',str(R)],cwd=ROOT,check=True)
files=sorted(p for p in RAW.rglob('*') if p.is_file() and p.name!='SHA256SUMS')
manifest=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(RAW))+'\n' for p in files)
(RAW/'SHA256SUMS').write_text(manifest);(H/'RAW-SHA256SUMS').write_text(manifest)
info={'rawRoot':str(RAW),'candidate':S['candidate'],'testHead':S['testHead'],'fileCount':len(files),'bytes':sum(p.stat().st_size for p in files),'largestFileBytes':max(p.stat().st_size for p in files),'rawManifestSha256':hashlib.sha256(manifest.encode()).hexdigest(),'allRawBytesExternal':True,'sealedAt':time.time()}
(H/'evidence-index.json').write_text(json.dumps(info,indent=2)+'\n')
for line in manifest.splitlines():
 digest,p=line.split('  ',1);assert hashlib.sha256((RAW/p).read_bytes()).hexdigest()==digest
report=H.parent/'VERIFY-0.3.13-round2.md'
local=sorted([report]+[p for p in H.rglob('*') if p.is_file() and p.name!='SHA256SUMS'])
assert all(p.stat().st_size<=1000000 for p in local)
(H/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(ROOT))+'\n' for p in local))
for line in (H/'SHA256SUMS').read_text().splitlines():
 digest,p=line.split('  ',1);assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==digest
print(json.dumps(info))

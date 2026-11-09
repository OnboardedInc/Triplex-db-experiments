"""Seal quiescent review evidence and remove only this attempt's known scratch clones."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import time
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
S=json.loads((HERE/'source.json').read_bytes());RAW=Path(S['raw'])
assert RAW==Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-0311/contract-0.3.13-attempt1')
assert (HERE/'result-audit.json').exists() and (HERE/'mutation-summary.json').exists()
def git(*a,cwd=HERE/'scratch'):return subprocess.check_output(['git',*a],cwd=cwd,text=True).strip()
assert git('rev-parse','HEAD')==S['candidate'] and git('diff','--name-only','HEAD')==''
assert git('diff','--name-only','--diff-filter=U',cwd=HERE/'merged')=='lab/bin/gate.mjs'
(RAW/'gate-conflicted.mjs').write_bytes((HERE/'merged/lab/bin/gate.mjs').read_bytes())
(RAW/'merge-status.txt').write_text(git('status','--porcelain',cwd=HERE/'merged')+'\n')
summary={'candidate':S['candidate'],'testedMain':S['main'],'mainAfterReview':git('rev-parse','main',cwd=ROOT),'trackedCandidateDiff':'empty','candidateUntrackedPaths':git('ls-files','--others','--exclude-standard').splitlines(),'mergeConflicts':['lab/bin/gate.mjs'],'allCommandsFinished':True,'sealedAt':time.time(),'freeBytesBeforeCleanup':shutil.disk_usage(ROOT).free,'scratchRemovedAfterChecks':True}
assert all(p.startswith('lab/runs/G0/') for p in summary['candidateUntrackedPaths']),summary['candidateUntrackedPaths']
(HERE/'final-source.json').write_text(json.dumps(summary,indent=2)+'\n')
# [CX-VA01-0313] Why: only these two attempt-created clones are disposable after writers exit; durable raw objects are the retention authority. Rejected: broad cache or other-worktree cleanup to make disk space.
for name in ('scratch','merged'):
 p=HERE/name
 assert p.parent==HERE and (p/'.git').is_dir()
 shutil.rmtree(p)
files=sorted(p for p in RAW.rglob('*') if p.is_file() and p.name!='SHA256SUMS')
manifest=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(RAW))+'\n' for p in files)
(RAW/'SHA256SUMS').write_text(manifest)
(HERE/'RAW-SHA256SUMS').write_text(manifest)
info={'rawRoot':str(RAW),'candidate':S['candidate'],'fileCount':len(files),'bytes':sum(p.stat().st_size for p in files),'largestFileBytes':max(p.stat().st_size for p in files),'rawManifestSha256':hashlib.sha256(manifest.encode()).hexdigest(),'allRawBytesExternal':True,'sealedAt':time.time()}
(HERE/'evidence-index.json').write_text(json.dumps(info,indent=2)+'\n')
for line in manifest.splitlines():
 h,path=line.split('  ',1)
 assert hashlib.sha256((RAW/path).read_bytes()).hexdigest()==h
report=HERE.parent/'VERIFY-0.3.13.md'
local=sorted([report]+[p for p in HERE.rglob('*') if p.is_file() and p.name!='SHA256SUMS'])
assert all(p.stat().st_size<=1000000 for p in local),[(str(p),p.stat().st_size) for p in local if p.stat().st_size>1000000]
(HERE/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(ROOT))+'\n' for p in local))
for line in (HERE/'SHA256SUMS').read_text().splitlines():
 h,path=line.split('  ',1);assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==h
print(json.dumps(info))

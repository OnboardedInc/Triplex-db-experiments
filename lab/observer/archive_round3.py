#!/usr/bin/env python3
# [EXP-OBS01] Why: retain source-bound resident attempts and private evaluator keys with source/copy hashes.
# Rejected: deleting first failures or retaining only normalized protocol records.
import hashlib
import json
import os
from pathlib import Path
import shutil
round_id=os.environ.get('OBS01_ROUND','3')
if round_id not in ('3','4','5'):raise ValueError('unknown report round')
repo=Path(__file__).resolve().parents[2];base=repo/('lab/experiments/EXP-OBS01/round'+round_id);source=Path('/Users/sam/projects/triplex-db-2/runs/engines/observers');target=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01')/('round'+round_id+'-host')
capacity=os.statvfs(target.parent)
if capacity.f_bavail*capacity.f_frsize<5*1024**3:raise ValueError('host free space below 5 GiB; do not begin archival fingerprint job')
prefix='obs01-r'+round_id+'-'
cohort=os.environ.get('OBS01_SCREEN_ID','final')
if not all(c.isalnum() or c in '_-' for c in cohort):raise ValueError('unsafe cohort')
suffix='-'+cohort if round_id=='5' and cohort!='final' else ''
cleanup=json.loads((base/('cleanup-final'+suffix+'.json')).read_bytes())
if cleanup['ownReservations'] or cleanup['ownContainers']:raise ValueError('owned resident observers still active')
target.mkdir(mode=0o700,exist_ok=False);pairs=[]
def copy_tree(src,dst):
 shutil.copytree(src,dst,symlinks=True,ignore=shutil.ignore_patterns('archive.log'))
 for p in src.rglob('*'):
  if p.is_file() and not p.is_symlink() and p.name!='archive.log':pairs.append((p,dst/p.relative_to(src)))
for p in sorted(source.glob(prefix+'*')):
 if p.is_dir():copy_tree(p,target/'observer-runs'/p.name)
keys=target/'keys';keys.mkdir(mode=0o700)
for p in (repo/'runs/OBS01').glob(prefix+'*.key'):
 dst=keys/p.name;shutil.copy2(p,dst);dst.chmod(0o600);pairs.append((p,dst))
copy_tree(repo/'lab/observer',target/'source/lab/observer');copy_tree(base,target/'evidence')
for name in ['engine.mjs','resident-observer.mjs','observer.mjs','observer-clock.mjs','archive-volume.mjs','lib.mjs']:
 p=repo/'lab/bin'/name;dst=target/'source/lab/bin'/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst);pairs.append((p,dst))
lines=[]
for line in (source/'witness.jsonl').read_bytes().splitlines(keepends=True):
 try:record=json.loads(line)
 except json.JSONDecodeError:
  if prefix.encode() in line:raise ValueError('incomplete own witness line')
  continue
 if record['runId'].startswith(prefix):lines.append(line)
(target/'witness.jsonl').write_bytes(b''.join(lines))
for src,dst in pairs:
 with src.open('rb') as f:a=hashlib.file_digest(f,'sha256').hexdigest()
 with dst.open('rb') as f:b=hashlib.file_digest(f,'sha256').hexdigest()
 if a!=b:raise ValueError('source/copy changed: '+str(src))
manifest={}
for p in sorted(target.rglob('*')):
 if p.is_symlink():manifest[str(p.relative_to(target))]={'symlink':os.readlink(p)}
 elif p.is_file():
  with p.open('rb') as f:manifest[str(p.relative_to(target))]={'sha256':hashlib.file_digest(f,'sha256').hexdigest(),'bytes':p.stat().st_size}
(target/'SHA256SUMS.json').write_text(json.dumps(manifest,indent=2,sort_keys=True)+'\n')
print(json.dumps({'archive':str(target),'sourceFilesCompared':len(pairs),'manifestEntries':len(manifest),'allMatched':True,'manifestSha256':hashlib.sha256((target/'SHA256SUMS.json').read_bytes()).hexdigest(),'keysOutsideBundleAndGit':True}))

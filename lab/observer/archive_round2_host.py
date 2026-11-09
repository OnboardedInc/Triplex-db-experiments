#!/usr/bin/env python3
# [EXP-OBS01] Why: preserve every round-2 attempt and compare copied bytes to quiescent originals.
# Rejected: a destination-only manifest as proof of lossless preservation.
import hashlib
import json
import os
from pathlib import Path
import shutil
repo=Path(__file__).resolve().parents[2]
source=Path('/Users/sam/projects/triplex-db-2/runs/engines/observers')
target=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01/round2-host')
target.mkdir(mode=0o700,exist_ok=False)
pairs=[]
def copy_tree(src,dst):
 shutil.copytree(src,dst,symlinks=True)
 for p in src.rglob('*'):
  if p.is_file() and not p.is_symlink():pairs.append((p,dst/p.relative_to(src)))
for p in sorted(source.glob('obs01-r2-*')):
 if p.is_dir():
  if (p/'output/bundle/ready.json').exists() and not (p/'stopped.json').exists():
   raise ValueError('missing terminal observer stop receipt: '+str(p))
  copy_tree(p,target/'observer-runs'/p.name)
keys=target/'keys';keys.mkdir(mode=0o700)
for p in (repo/'runs/OBS01').glob('obs01-r2*.key'):
 dst=keys/p.name;shutil.copy2(p,dst);dst.chmod(0o600);pairs.append((p,dst))
copy_tree(repo/'runs/OBS01/r2-config',target/'r2-config')
copy_tree(repo/'lab/observer',target/'source/lab/observer')
for p in (repo/'lab/bin').glob('*.mjs'):
 dst=target/'source/lab/bin'/p.name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst);pairs.append((p,dst))
copy_tree(repo/'lab/experiments/EXP-OBS01/round2',target/'evidence')
witness=(source/'witness.jsonl').read_bytes().splitlines(keepends=True)
(target/'witness.jsonl').write_bytes(b''.join(line for line in witness if json.loads(line)['runId'].startswith('obs01-r2-')))
for src,dst in pairs:
 with src.open('rb') as f:a=hashlib.file_digest(f,'sha256').hexdigest()
 with dst.open('rb') as f:b=hashlib.file_digest(f,'sha256').hexdigest()
 if a!=b:raise ValueError('source/copy mismatch: '+str(src))
manifest={}
for p in sorted(target.rglob('*')):
 if p.is_symlink():manifest[str(p.relative_to(target))]={'symlink':os.readlink(p)}
 elif p.is_file():
  with p.open('rb') as f:manifest[str(p.relative_to(target))]={'sha256':hashlib.file_digest(f,'sha256').hexdigest(),'bytes':p.stat().st_size}
(target/'SHA256SUMS.json').write_text(json.dumps(manifest,sort_keys=True,indent=2)+'\n')
result={'destination':str(target),'sourceFilesCompared':len(pairs),'manifestEntries':len(manifest),'allMatched':True,'manifestSha256':hashlib.sha256((target/'SHA256SUMS.json').read_bytes()).hexdigest(),'sourceAnchor':'actual working bytes, not a pre-run Git anchor'}
print(json.dumps(result))

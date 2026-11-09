#!/usr/bin/env python3
"""EXP-OBS01: preserve prior source/evidence/keys before releasing disposable slots."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

repo=Path(__file__).resolve().parents[2]
base=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01')
target=base/'round1-host'
target.mkdir(parents=True,exist_ok=False,mode=0o700)
source=Path('/Users/sam/projects/triplex-db-2/runs/engines/observers')
for p in sorted(source.glob('obs01-*')):
    if p.is_dir(): shutil.copytree(p,target/'observer-runs'/p.name,symlinks=True)
witness=(source/'witness.jsonl').read_bytes().splitlines(keepends=True)
(target/'witness.jsonl').write_bytes(b''.join(line for line in witness if json.loads(line)['runId'].startswith('obs01-')))
shutil.copytree(repo/'runs/OBS01/diagnostic-config',target/'diagnostic-config')
keys=target/'keys';keys.mkdir(mode=0o700)
for name in ['diagnostic.key','final-evaluator.key']:
    shutil.copy2(repo/'runs/OBS01'/name,keys/name);(keys/name).chmod(0o600)
shutil.copytree(repo/'lab/experiments/EXP-OBS01',target/'committed-evidence')
with (target/'source-6946d91.tar').open('xb') as f:
    subprocess.run(['git','archive','6946d91'],cwd=repo,stdout=f,check=True)
manifest={}
for p in sorted(target.rglob('*')):
    if p.is_symlink(): manifest[str(p.relative_to(target))]={'symlink':os.readlink(p)}
    elif p.is_file():
        with p.open('rb') as f: manifest[str(p.relative_to(target))]={'sha256':hashlib.file_digest(f,'sha256').hexdigest(),'bytes':p.stat().st_size}
# [EXP-OBS01] Why: read every destination again, not just successful copy exit codes. Rejected: copy counts as preservation proof.
for name,entry in manifest.items():
    if 'sha256' in entry:
        with (target/name).open('rb') as f:
            if hashlib.file_digest(f,'sha256').hexdigest()!=entry['sha256']: raise ValueError('destination changed')
(target/'SHA256SUMS.json').write_text(json.dumps(manifest,sort_keys=True,indent=2)+'\n')
print(json.dumps({'destination':str(target),'files':len(manifest),'allReadBack':True,'manifestSha256':hashlib.sha256((target/'SHA256SUMS.json').read_bytes()).hexdigest()}))

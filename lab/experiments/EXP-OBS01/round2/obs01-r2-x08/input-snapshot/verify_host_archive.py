#!/usr/bin/env python3
# [EXP-OBS01] Why: compare immutable original run/key/profile bytes to the copied hashes.
# Rejected: validating only a destination against a manifest derived from that destination.
import hashlib
import json
from pathlib import Path
repo=Path(__file__).resolve().parents[2];target=Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/OBS01/round1-host')
manifest=json.loads((target/'SHA256SUMS.json').read_bytes());checked=0
for name,entry in manifest.items():
 if name.startswith('observer-runs/'):source=Path('/Users/sam/projects/triplex-db-2/runs/engines/observers')/Path(name).relative_to('observer-runs')
 elif name.startswith('keys/'):source=repo/'runs/OBS01'/Path(name).name
 elif name.startswith('diagnostic-config/'):source=repo/'runs/OBS01/diagnostic-config'/Path(name).relative_to('diagnostic-config')
 else:continue
 if 'sha256' in entry:
  with source.open('rb') as f:original=hashlib.file_digest(f,'sha256').hexdigest()
  with (target/name).open('rb') as f:copy=hashlib.file_digest(f,'sha256').hexdigest()
  if original!=entry['sha256'] or copy!=original:raise ValueError('source/copy mismatch: '+name)
  checked+=1
result={'allMatched':True,'sourceFilesCompared':checked,'archive':str(target)}
Path('lab/experiments/EXP-OBS01/round2/archive-source-comparison.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

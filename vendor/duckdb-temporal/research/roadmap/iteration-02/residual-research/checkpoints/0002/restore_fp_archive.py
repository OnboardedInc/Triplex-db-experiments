#!/usr/bin/env python3
"""Verify and reconstruct the research gzip only; never extract or execute it."""
from pathlib import Path
import base64
import hashlib
import json
import sys

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'fp-archive-manifest.json').read_text())
pieces=[]
for part in manifest['parts']:
    path = root / part['path']
    if Path(part['path']).name != part['path'] or path.is_symlink():
        raise SystemExit('Unsafe part path')
    data=path.read_bytes()
    if len(data)!=part['bytes'] or hashlib.sha256(data).hexdigest()!=part['sha256']:
        raise SystemExit('Part verification failed: '+part['path'])
    pieces.append(data.strip())
data=base64.b64decode(b''.join(pieces),validate=True)
if len(data)!=manifest['bytes'] or hashlib.sha256(data).hexdigest()!=manifest['sha256']:
    raise SystemExit('Archive verification failed')
target=Path(sys.argv[1]) if len(sys.argv)==2 else root/manifest['archive']
if len(sys.argv)>2:raise SystemExit('Use at most one output path')
if target.exists():
    if target.is_symlink() or hashlib.sha256(target.read_bytes()).hexdigest()!=manifest['sha256']:
        raise SystemExit('Refusing to replace a different existing output')
    print('Already verified:',target)
else:
    with target.open('xb') as output:output.write(data)
    print('Verified:',target)
print('No extraction or execution performed.')

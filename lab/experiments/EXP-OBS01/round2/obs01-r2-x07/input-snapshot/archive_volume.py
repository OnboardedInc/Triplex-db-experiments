#!/usr/bin/env python3
"""EXP-OBS01: lossless quiescent volume snapshot with complete read-back hashing."""
import hashlib
import json
import os
from pathlib import Path
import tarfile

source, output = Path('/source'), Path('/archive')

def scan():
    files = {}
    for p in sorted(source.rglob('*')):
        st = p.lstat()
        entry = {'mode': st.st_mode, 'uid': st.st_uid, 'gid': st.st_gid, 'size': st.st_size}
        if p.is_symlink(): entry['link'] = os.readlink(p)
        elif p.is_file(): entry['sha256'] = hashlib.file_digest(p.open('rb'), 'sha256').hexdigest()
        elif not p.is_dir(): raise ValueError('unsupported special file: ' + str(p))
        files[str(p.relative_to(source))] = entry
    return files

before = scan()
archive = output / 'volume.tar'
with tarfile.open(archive, 'x') as tar:
    tar.add(source, arcname='volume', recursive=True)
with archive.open('rb') as f:
    os.fsync(f.fileno())
    digest = hashlib.file_digest(f, 'sha256').hexdigest()
with tarfile.open(archive, 'r') as tar:
    members = {m.name.removeprefix('volume/'): m for m in tar if m.name != 'volume'}
    if set(members) != set(before): raise ValueError('archive member inventory mismatch')
    for name, entry in before.items():
        m = members[name]
        if 'sha256' in entry:
            with tar.extractfile(m) as f: actual = hashlib.file_digest(f, 'sha256').hexdigest()
            if actual != entry['sha256']: raise ValueError('archive bytes mismatch: ' + name)
        if 'link' in entry and m.linkname != entry['link']: raise ValueError('symlink mismatch')
if scan() != before: raise ValueError('source changed during snapshot')
receipt = {'format':'obs01-volume-archive/1', 'archiveSha256':digest, 'readbackVerified':True, 'sourceUnchanged':True, 'files':before}
with (output / 'manifest.json').open('x') as f:
    json.dump(receipt, f, sort_keys=True, indent=2); f.write('\n'); f.flush(); os.fsync(f.fileno())
print(json.dumps({'archiveSha256':digest,'files':len(before),'readbackVerified':True}))

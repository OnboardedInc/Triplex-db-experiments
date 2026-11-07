#!/usr/bin/env python3
"""Recover this immutable evidence archive; verify, never extract/execute it."""
import base64
import hashlib
import json
import os
from pathlib import Path
import tempfile

root = Path(__file__).resolve().parent
record = json.loads((root / 'ARCHIVE.json').read_text())
pieces = []
for item in record['parts']:
    name = item['file']
    if Path(name).name != name or not name.endswith('.b64'):
        raise SystemExit('Invalid archive-part name')
    raw = (root / name).read_bytes()
    if len(raw) != item['bytes'] or hashlib.sha256(raw).hexdigest() != item['sha256']:
        raise SystemExit('Archive part does not match: ' + name)
    pieces.append(base64.b64decode(raw.strip(), validate=True))
archive = b''.join(pieces)
if len(archive) != record['archive_bytes'] or hashlib.sha256(archive).hexdigest() != record['archive_sha256']:
    raise SystemExit('Recovered archive identity mismatch')
name = record['archive']
if Path(name).name != name or not name.endswith('.tar.gz'):
    raise SystemExit('Invalid archive name')
destination = root / name
if destination.exists():
    if destination.read_bytes() != archive:
        raise SystemExit('Refusing to overwrite another archive')
else:
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=root, prefix='.evidence-', delete=False) as file:
            temporary = Path(file.name)
            file.write(archive)
        os.replace(temporary, destination)
        temporary = None
    finally:
        if temporary is not None:
            temporary.unlink()
print(str(destination) + ' SHA-256 ' + record['archive_sha256'])

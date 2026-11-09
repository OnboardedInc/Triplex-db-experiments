"""[EXP-P2B-R3] Why: retain completed bulky evidence losslessly within the host disk floor.
Rejected: deleting evidence or unlinking originals before durable archive/content verification.
"""
import sys, os, json, pathlib, gzip, hashlib, shutil, fcntl
ROOT = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round3')
def digest(file):
    h = hashlib.sha256()
    with open(file, 'rb') as stream:
        for data in iter(lambda: stream.read(1024 * 1024), b''): h.update(data)
    return h.hexdigest()
def decoded(file):
    h = hashlib.sha256()
    with gzip.open(file, 'rb') as stream:
        for data in iter(lambda: stream.read(1024 * 1024), b''): h.update(data)
    return h.hexdigest()
def sync(fd):
    os.fsync(fd)
    if sys.platform == 'darwin': fcntl.fcntl(fd, fcntl.F_FULLFSYNC)
def save(file, value):
    temp = file.with_suffix('.tmp')
    with open(temp, 'x') as stream:
        json.dump(value, stream, indent=2); stream.write('\n'); stream.flush(); sync(stream.fileno())
    os.replace(temp, file)
    parent = os.open(file.parent, os.O_RDONLY)
    try: os.fsync(parent)
    finally: os.close(parent)
    with open(file, 'r+b') as stream: sync(stream.fileno())
def verify(directory):
    manifest = json.loads((directory/'ARCHIVE.json').read_text())
    assert manifest['attempt'] == directory.name
    assert digest(directory/'report.json') == manifest['reportSha256']
    assert digest(directory/'SHA256SUMS') == manifest['caseManifestSha256']
    for entry in manifest['files']:
        file = directory/entry['gzip']
        assert digest(file) == entry['gzipSha256']
        assert decoded(file) == entry['sourceSha256']
    return manifest
def archive(directory):
    directory = directory.resolve()
    assert directory.parent == ROOT and directory.name.startswith('r3-')
    report = json.loads((directory/'report.json').read_text())
    assert report['attempt'] == directory.name and pathlib.Path(report['out']).resolve() == directory
    assert report['sourceUnchanged'] and not report['failures'] and report['committed'] == report['offered'] == 3000
    assert all(b['stages']['offerToAck']['n'] >= 1000 for b in report['perBandSummary'])
    index = directory/'ARCHIVE.json'
    manifest = verify(directory) if index.exists() else dict(format='P2B-lossless-archive/1', attempt=directory.name, reportSha256=digest(directory/'report.json'), caseManifestSha256=digest(directory/'SHA256SUMS'), files=[], complete=False)
    for line in (directory/'SHA256SUMS').read_text().splitlines():
        expected, name = line.split('  ', 1)
        file = directory/name
        if file.exists(): assert digest(file) == expected
        else:
            entry = next(e for e in manifest['files'] if e['file'] == name)
            assert entry['sourceSha256'] == expected
    candidates = [directory/'raw.jsonl', *sorted((directory/'broker').glob('*'))]
    for file in candidates:
        if file.is_symlink() or not file.is_file() or file.stat().st_size < 1000000 or file.suffix in ['.gz','.tmp']: continue
        name = str(file.relative_to(directory))
        old = next((e for e in manifest['files'] if e['file'] == name), None)
        if old:
            assert digest(file) == old['sourceSha256']; file.unlink(); continue
        stat = file.stat(); original = digest(file)
        target = pathlib.Path(str(file)+'.gz'); temp = pathlib.Path(str(target)+'.tmp')
        assert not target.exists() and not temp.exists()
        with open(file, 'rb') as source, open(temp, 'xb') as output:
            with gzip.GzipFile(filename='', mode='wb', fileobj=output, compresslevel=1, mtime=0) as zipped: shutil.copyfileobj(source, zipped, 1024*1024)
            output.flush(); sync(output.fileno())
        assert decoded(temp) == original and digest(file) == original
        after = file.stat(); assert (stat.st_ino,stat.st_size,stat.st_mtime_ns) == (after.st_ino,after.st_size,after.st_mtime_ns)
        compressed = digest(temp); os.link(temp,target); temp.unlink()
        manifest['files'].append(dict(file=name,gzip=str(target.relative_to(directory)),sourceSha256=original,gzipSha256=compressed,sourceSize=stat.st_size,sourceDevice=str(stat.st_dev),sourceInode=str(stat.st_ino),sourceMtimeNs=stat.st_mtime_ns))
        save(index,manifest)
        assert decoded(target) == original
        file.unlink()
    manifest['complete'] = True; save(index,manifest)
    return dict(attempt=directory.name,files=len(manifest['files']))
if __name__ == '__main__':
    if sys.argv[1] == '--verify': print(json.dumps(dict(verified=len(verify(pathlib.Path(sys.argv[2]))['files']))))
    elif sys.argv[1] == '--case': print(json.dumps(archive(pathlib.Path(sys.argv[2]))))
    elif sys.argv[1] == '--existing':
        cases=set()
        for pointer in ROOT.glob('matrix-*.json'):
            for row in json.loads(pointer.read_text()):
                if row.get('exit') == 0 and row.get('out'): cases.add(row['out'])
        for directory in sorted(cases): print(json.dumps(archive(pathlib.Path(directory))),flush=True)
    else: raise RuntimeError('Choose --case, --existing or --verify')

"""Read-only file acquisition for an evaluator-owned observer, not a builder launcher."""
import base64
import hashlib
import json
import os
import stat


# [EXP-ER01-S] Why: open each path component without symlinks and read the whole stable file.
# Rejected: tail/grep, mmap prefixes, or a DB connection that can mutate source WAL/SHM.
def read_file(path, max_bytes):
    if not path.startswith('/') or any(p in ('.', '..', '') for p in path.split('/')[1:]):
        raise ValueError('source must be a normalized absolute file path')
    directory = os.open('/', os.O_RDONLY | os.O_DIRECTORY)
    fd = None
    try:
        parts = path.split('/')[1:]
        for part in parts[:-1]:
            next_dir = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=directory)
            os.close(directory)
            directory = next_dir
        fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_size > max_bytes:
            raise ValueError('source is not regular or exceeds complete-read budget')
        blocks = []
        remaining = before.st_size
        while remaining:
            block = os.read(fd, min(remaining, 1024 * 1024))
            if not block:
                raise ValueError('source shortened during capture')
            remaining -= len(block)
            blocks.append(block)
        if os.read(fd, 1):
            raise ValueError('source grew during capture')
        after = os.fstat(fd)
        identity = lambda st: (st.st_dev, st.st_ino, st.st_size, st.st_mtime_ns, st.st_ctime_ns)
        if identity(before) != identity(after):
            raise ValueError('source changed during capture')
        content = b''.join(blocks)
        return {'bytes': base64.b64encode(content).decode(), 'size': len(content),
                'sha256': hashlib.sha256(content).hexdigest(), 'capture': 'complete-file', 'stable': True,
                'identity': {'device': before.st_dev, 'inode': before.st_ino, 'mtimeNs': before.st_mtime_ns,
                             'ctimeNs': before.st_ctime_ns}}
    finally:
        if fd is not None:
            os.close(fd)
        os.close(directory)


def snapshot(spec, phase, native_evidence, max_bytes=64 * 1024 * 1024):
    if phase not in spec['phases'] or native_evidence['sourceIdentity'] != spec['nativeSourceIdentity']:
        raise ValueError('unbound phase/native read')
    if native_evidence['sourceKind'] != 'EI':
        raise ValueError('native envelopes require EI evidence')
    files = []
    budget = max_bytes
    for file_id, item in spec['inventory'].items():
        if item['sourceKind'] != 'HO':
            raise ValueError('file acquisition requires HO; capture EI query bytes separately')
        file = read_file(item['path'], budget)
        budget -= file['size']
        files.append({'fileId': file_id, **{k: item[k] for k in ('path', 'location', 'sourceKind', 'codec')}, **file})
    return {'phase': phase, 'slot': spec['slot'], 'nonce': spec['phases'][phase]['nonce'], 'files': files,
            'nativeEnvelopes': native_evidence['envelopes'], 'nativeSourceKind': 'EI',
            'nativeSourceIdentity': native_evidence['sourceIdentity']}

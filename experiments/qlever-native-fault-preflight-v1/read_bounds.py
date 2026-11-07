"""Closed read-only subset: bounded input/evidence writes, no subprocess API."""
from __future__ import annotations
import dataclasses
import hashlib
import json
import os
from pathlib import Path
import stat
import time


class ReadOnlyRefusal(RuntimeError):
    pass


def require(condition, message):
    if not condition: raise ReadOnlyRefusal(message)


@dataclasses.dataclass(frozen=True)
class Bounds:
    response: int=2*1024**2
    control_response: int=256*1024
    chunk: int=65536
    graphs: int=2048
    rows: int=200000
    page_rows: int=256
    capture_raw: int=64*1024**2
    capture_compressed: int=16*1024**2
    preflight_seconds: int=120
    request_seconds: int=6
    metadata: int=16*1024**2


LIMITS=Bounds()


def canonical(value):return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode()


def read_file(path:Path,maximum:int):
    require(not any(part.is_symlink() for part in [path,*path.parents]),'Linked local input')
    before=path.lstat()
    require(stat.S_ISREG(before.st_mode) and before.st_size<=maximum,'Nonregular/oversized local input')
    with path.open('rb') as stream:
        raw=stream.read(maximum+1); after=os.fstat(stream.fileno())
    require(len(raw)<=maximum and len(raw)==before.st_size and (before.st_dev,before.st_ino,before.st_mtime_ns)==(after.st_dev,after.st_ino,after.st_mtime_ns),'Input changed while bounded reader ran')
    return raw


def read_response(stream,maximum,deadline):
    result=bytearray()
    while True:
        require(time.monotonic()<deadline,'Read-only native response deadline')
        part=stream.read(min(LIMITS.chunk,maximum-len(result)+1))
        if not part:return bytes(result)
        result.extend(part);require(len(result)<=maximum,'Read-only native response exceeded cap')


def sync_directory(path):
    fd=os.open(path,os.O_RDONLY|os.O_DIRECTORY)
    try:os.fsync(fd)
    finally:os.close(fd)


def write_json(path:Path,value,maximum=LIMITS.metadata):
    raw=canonical(value)+b'\n'
    require(len(raw)<=maximum,'Bounded evidence output exceeded cap')
    require(not any(part.is_symlink() for part in [path,*path.parents]),'Linked evidence output')
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
    try:
        rest=memoryview(raw)
        while rest:
            size=os.write(fd,rest);require(size>0,'Incomplete evidence write');rest=rest[size:]
        os.fsync(fd)
    finally:os.close(fd)
    sync_directory(path.parent)


def safe_error(error):
    message=str(error).encode(errors='replace')
    return {'class':type(error).__name__ if type(error).__name__ in {'ReadOnlyRefusal','TimeoutError','OSError','ValueError','HTTPError'} else 'OtherError','messageSha256':hashlib.sha256(message).hexdigest(),'messageBytes':len(message)}

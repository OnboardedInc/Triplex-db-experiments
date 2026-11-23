"""Compress one completed AGE1 attempt and verify its bytes before freeing the tree."""

import hashlib
import os
from pathlib import Path
import re
import shutil
import sys
import tarfile
import tempfile


def digest(stream):
    return hashlib.file_digest(stream, "sha256").hexdigest()


def inventory(directory):
    entries = {}
    for p in directory.rglob("*"):
        key = p.relative_to(directory).as_posix()
        if p.is_symlink():
            entries[key] = ("link", os.readlink(p))
        elif p.is_file():
            with p.open("rb") as source:
                entries[key] = ("file", digest(source))
        elif p.is_dir():
            entries[key] = ("dir", "")
        else:
            raise ValueError(f"Unsupported evidence entry: {key}")
    return entries


def archive(directory):
    parent = directory.parent
    if parent.name != "DX-AGE1" or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,49}", directory.name):
        raise ValueError("Use a named attempt under the DX-AGE1 evidence directory")
    if not directory.is_dir() or directory.is_symlink():
        raise ValueError("The completed attempt must be a directory")
    target = parent / (directory.name + ".tar.gz")
    expected = inventory(directory)
    with tempfile.NamedTemporaryFile(dir=parent, suffix=".tar.gz") as work:
        with tarfile.open(work.name, "w:gz", compresslevel=6) as output:
            output.add(directory, arcname=directory.name)
        work.flush()
        os.fsync(work.fileno())
        observed = {}
        with tarfile.open(work.name, "r:gz") as source:
            for member in source:
                name, _, key = member.name.partition("/")
                if name != directory.name or key in observed:
                    raise ValueError("Archive member differs from the attempt inventory")
                if not key and member.isdir():
                    continue
                if member.isfile():
                    with source.extractfile(member) as f:
                        observed[key] = ("file", digest(f))
                elif member.isdir():
                    observed[key] = ("dir", "")
                elif member.issym():
                    observed[key] = ("link", member.linkname)
                else:
                    raise ValueError(f"Unsupported archive member: {key}")
        # [DX-AGE1] Why: keep content-addressed evidence after freeing copy-heavy source trees.
        # Rejected: removing the uncompressed witness based on the archive command's exit code.
        if expected != observed or expected != inventory(directory):
            raise ValueError("Archive or live attempt bytes differ")
        os.link(work.name, target)
        fd = os.open(parent, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    shutil.rmtree(directory)
    with target.open("rb") as f:
        print(f"{digest(f)}  {target.name}")


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        archive(Path(arg).absolute())

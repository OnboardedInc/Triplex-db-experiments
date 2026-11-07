"""Bounded I/O primitives for the separately authorized fault executor.

Importing this module does not run commands, contact a socket or copy data.
Evidence never includes raw command errors/HTTP error bodies. Limits are checked
while acquiring bytes, rather than after an unbounded communicate()/read().
"""
from __future__ import annotations
import dataclasses
import hashlib
import json
import os
from pathlib import Path
import selectors
import stat
import subprocess
import time

from policy import FenceError, require


@dataclasses.dataclass(frozen=True)
class Limits:
    response: int = 2 * 1024 ** 2
    control_response: int = 256 * 1024
    command_stdout: int = 2 * 1024 ** 2
    command_stderr: int = 64 * 1024
    request: int = 8 * 1024 ** 2
    chunk: int = 64 * 1024
    graphs: int = 2048
    rows: int = 200000
    page_rows: int = 256
    capture_raw: int = 64 * 1024 ** 2
    capture_compressed: int = 16 * 1024 ** 2
    preflight_seconds: int = 120
    request_seconds: int = 6
    maximum_files: int = 128
    metadata: int = 16 * 1024 ** 2
    journal: int = 16 * 1024 ** 2
    log: int = 8 * 1024 ** 2


LIMITS = Limits()


def canonical(value) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def sync_directory(path: Path) -> None:
    descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def write_new(path: Path, value, *, maximum: int = LIMITS.metadata) -> dict:
    raw = canonical(value) + b"\n"
    require(len(raw) <= maximum, "Evidence exceeds its declared bound")
    require(not any(part.is_symlink() for part in [path, *path.parents]), "Linked evidence path")
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        remaining = memoryview(raw)
        while remaining:
            count = os.write(descriptor, remaining)
            require(count > 0, "Incomplete evidence write")
            remaining = remaining[count:]
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
    sync_directory(path.parent)
    return {"path": str(path), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def file_digest(path: Path, *, maximum: int) -> tuple[int, str]:
    require(not any(part.is_symlink() for part in [path, *path.parents]), "Linked source input")
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        before = os.fstat(descriptor)
        require(stat.S_ISREG(before.st_mode) and before.st_size <= maximum, "Nonregular or oversized source input")
        digest, total = hashlib.sha256(), 0
        while True:
            chunk = os.read(descriptor, min(LIMITS.chunk, maximum - total + 1))
            if not chunk:
                break
            total += len(chunk)
            require(total <= maximum, "Source input grew past its bound")
            digest.update(chunk)
        after = os.fstat(descriptor)
        require((before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) == (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns) and total == before.st_size, "Source changed during streaming hash")
        return total, digest.hexdigest()
    finally:
        os.close(descriptor)


def read_response(stream, *, maximum: int, deadline: float) -> bytes:
    """The stream's own finite socket timeout supplements this total deadline."""
    result = bytearray()
    while True:
        require(time.monotonic() <= deadline, "Response deadline exceeded")
        chunk = stream.read(min(LIMITS.chunk, maximum - len(result) + 1))
        if not chunk:
            return bytes(result)
        result.extend(chunk)
        require(len(result) <= maximum, "Response exceeded its acquisition bound")


def run_command(argv: list[str], *, timeout: float = 10, stdin: bytes | None = None,
                maximum_stdout: int = LIMITS.command_stdout, maximum_stderr: int = LIMITS.command_stderr) -> bytes:
    """Only executor-owned commands; no shell or token value in argv.

    If its own command breaches a limit, terminate only that Popen child. Native
    engine cleanup is a separately fenced Docker action, never a host PID guess.
    This function is not exercised against real commands by component tests.
    """
    require(0 < timeout <= 360 and all(isinstance(arg, str) and '\0' not in arg for arg in argv), "Invalid bounded command")
    require(stdin is None or len(stdin) <= LIMITS.request, "Unbounded command input")
    child = subprocess.Popen(argv, stdin=subprocess.PIPE if stdin is not None else subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    deadline, outputs = time.monotonic() + timeout, {"stdout": bytearray(), "stderr": bytearray()}
    selector = selectors.DefaultSelector()
    try:
        for name in outputs:
            pipe = getattr(child, name)
            os.set_blocking(pipe.fileno(), False)
            selector.register(pipe, selectors.EVENT_READ, name)
        if stdin is not None:
            # Reviewed command inputs are small JSON metadata. A pipe that does
            # not consume this input cannot block this executor indefinitely.
            os.set_blocking(child.stdin.fileno(), False)
            selector.register(child.stdin, selectors.EVENT_WRITE, "stdin")
        remaining = memoryview(stdin or b"")
        while selector.get_map():
            require(time.monotonic() < deadline, "Owned command deadline exceeded")
            for key, _ in selector.select(min(0.1, max(0, deadline - time.monotonic()))):
                if key.data == "stdin":
                    if remaining:
                        try:
                            count = os.write(key.fileobj.fileno(), remaining[:LIMITS.chunk])
                            remaining = remaining[count:]
                        except BlockingIOError:
                            continue
                    if not remaining:
                        selector.unregister(key.fileobj); key.fileobj.close()
                    continue
                try:
                    chunk = os.read(key.fileobj.fileno(), LIMITS.chunk)
                except BlockingIOError:
                    continue
                if not chunk:
                    selector.unregister(key.fileobj); key.fileobj.close(); continue
                outputs[key.data].extend(chunk)
                maximum = maximum_stdout if key.data == "stdout" else maximum_stderr
                require(len(outputs[key.data]) <= maximum, "Owned command output exceeded its bound")
        code = child.wait(timeout=max(0.001, deadline - time.monotonic()))
        if code:
            # Deliberately exclude argv/stderr text; either may echo a secret.
            raise FenceError("Owned command failed: exit=" + str(code) + ", stderrSha256=" + hashlib.sha256(outputs['stderr']).hexdigest())
        return bytes(outputs["stdout"])
    finally:
        selector.close()
        if child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=1)
            except subprocess.TimeoutExpired:
                child.kill(); child.wait(timeout=1)
        for name in ["stdin", "stdout", "stderr"]:
            stream = getattr(child, name)
            if stream is not None:
                stream.close()

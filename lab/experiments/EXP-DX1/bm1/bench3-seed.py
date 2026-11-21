"""Verify the published SCALE1 custody inventory and meter its read-only transfer."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import time

SEAL = "f9e63cc6bac86c3bafbd33c5756709e28a66ebd675fa898f4a5563a17c4f04d4"
IMAGE = "77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b"
TRANSFER = "1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154"
EXPECTED = {"files": 1452, "bytes": 125923989950,
            "controlSha": "6c8986df870b10b5cec64a6103e3316935a82d8c85cad080fbd4b86d67b05c0c",
            "treeSha": "fc501b6a14066d711222dbe202febbc9d911d3b4121c862f550fac0d92a7b24a"}


def sha(path):
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def verify(stage):
    # [DX-BM1] Why: reproduce SCALE1's ordered path/mode/owner/content inventory on
    # the destination bytes. Rejected: trusting a transport exit or just pg_control.
    for name, expected in (("sealed-pgdata.json", SEAL), ("image.json", IMAGE), ("transfer.json", TRANSFER)):
        assert sha(stage / name) == expected, name
    seal = json.loads((stage / "sealed-pgdata.json").read_bytes())
    assert seal["inventory"] == EXPECTED and seal["seed"]["cut"] == 87002
    root = stage / "cluster"
    assert root.resolve(strict=True) == root and not (root / "postmaster.pid").exists()
    assert (root / "PG_VERSION").read_text().strip() == "17"
    pg_control = root / "global/pg_control"
    assert pg_control.stat().st_size == 8192
    device = root.stat().st_dev
    tree = hashlib.sha256()

    def census(directory):
        files = size = 0
        for path in sorted(directory.iterdir(), key=lambda p: p.name):
            info = path.lstat()
            regular = stat.S_ISREG(info.st_mode) and info.st_nlink == 1
            assert info.st_dev == device and (regular or stat.S_ISDIR(info.st_mode)), path
            row = [path.relative_to(root).as_posix(), info.st_mode, info.st_uid, info.st_gid,
                   sha(path) if regular else None]
            tree.update((json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n").encode())
            if regular:
                files += 1
                size += info.st_size
            else:
                inside_files, inside_size = census(path)
                files += inside_files
                size += inside_size
        return files, size

    count, bytes_ = census(root)
    observed = dict(files=count, bytes=bytes_, controlSha=sha(pg_control), treeSha=tree.hexdigest())
    assert observed == EXPECTED, observed
    return dict(sealedSource=seal["source"], seed=seal["seed"], inventory=observed, checkedAt=time.time())


def throttle():
    # [DX-BM1] Why: cap the direct stream independently of the available link rate.
    # Rejected: unbounded tar reads or sending the cluster via the Mac.
    rate = 300_000_000
    cursor = time.monotonic()
    total = 0
    for block in iter(lambda: sys.stdin.buffer.read(1 << 20), b""):
        cursor = max(cursor, time.monotonic()) + len(block) / rate
        time.sleep(max(0, cursor - time.monotonic()))
        sys.stdout.buffer.write(block)
        total += len(block)
    sys.stdout.buffer.flush()
    print(f"Streamed {total} tar bytes", file=sys.stderr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=("throttle", "verify"))
    parser.add_argument("stage", type=Path, nargs="?")
    args = parser.parse_args()
    if args.operation == "verify":
        assert args.stage is not None
        print(json.dumps(verify(args.stage), sort_keys=True))
    else:
        assert args.stage is None
        throttle()

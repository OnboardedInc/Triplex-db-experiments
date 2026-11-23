"""Stopped PostgreSQL inventory, copied unchanged from DX-BM1 bench4-inventory.py (SCALE1 stoppedInventory): ordered path, mode, owner, content."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import time


def sha(path):
    with open(path, "rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def inventory(root):
    # [DX-BM1] Why: check a received cluster with the sender's own algorithm (ordered path, mode, owner, content).
    # Rejected: trusting the transport exit status, apparent size or pg_control alone.
    root = Path(root)
    assert root.resolve(strict=True) == root, root
    assert (root / "PG_VERSION").read_text().strip() == "17"
    assert not (root / "postmaster.pid").exists()
    control = root / "global/pg_control"
    assert control.stat().st_size == 8192
    device = root.stat().st_dev
    rows = []

    def walk(directory):
        for name in sorted(os.listdir(directory)):
            path = directory / name
            info = path.lstat()
            regular = stat.S_ISREG(info.st_mode) and info.st_nlink == 1
            assert info.st_dev == device and (regular or stat.S_ISDIR(info.st_mode)), path
            rows.append((path, info, regular))
            if not regular:
                walk(path)

    walk(root)
    with ThreadPoolExecutor(8) as pool:
        digests = list(pool.map(lambda r: sha(r[0]) if r[2] else None, rows))
    tree = hashlib.sha256()
    files = size = 0
    for (path, info, regular), digest in zip(rows, digests):
        row = [path.relative_to(root).as_posix(), info.st_mode, info.st_uid, info.st_gid, digest]
        tree.update((json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n").encode())
        if regular:
            files += 1
            size += info.st_size
    return dict(files=files, bytes=size, controlSha=sha(control), treeSha=tree.hexdigest())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("cluster")
    parser.add_argument("--expect", help="JSON object with files, bytes, controlSha, treeSha (any subset)")
    parser.add_argument("--file-sha", nargs=2, action="append", default=[], metavar=("PATH", "SHA256"))
    args = parser.parse_args()
    started = time.time()
    observed = inventory(args.cluster)
    checks = {}
    if args.expect:
        expected = json.loads(args.expect)
        checks["inventory"] = all(observed[k] == v for k, v in expected.items())
    for path, digest in args.file_sha:
        checks[path] = sha(path) == digest
    result = dict(cluster=args.cluster, inventory=observed, checks=checks, seconds=round(time.time() - started, 1),
                  checkedAt=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    print(json.dumps(result, indent=2))
    sys.exit(0 if all(checks.values()) else 1)

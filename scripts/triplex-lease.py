#!/usr/bin/env python3
"""Serialize native test/failure trials without owning database transactions.

Lock files persist deliberately: unlinking them would permit two inode locks.
Every native qualification command must use this wrapper. An ``all`` lease is
required for performance trials; it does not stop or reconfigure any service.
"""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend", required=True, choices=["xtdb", "qlever", "all"])
    parser.add_argument("--wait-seconds", type=float, default=30)
    parser.add_argument("--purpose", required=True)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command or not args.purpose.strip() or not 0 <= args.wait_seconds <= 3600:
        parser.error("A command, purpose and wait budget from 0 to 3600 seconds are required")
    root = Path(__file__).resolve().parents[1]
    directory = root / ".experiments" / "backend-leases"
    directory.mkdir(parents=True, exist_ok=True)
    names = ["qlever", "xtdb"] if args.backend == "all" else [args.backend]
    handles = []
    deadline = time.monotonic() + args.wait_seconds
    child = None
    started = time.time()
    try:
        for name in names:
            handle = (directory / f"{name}.lock").open("a+b")
            handles.append(handle)
            while True:
                try:
                    fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        print(f"Native {name} lease unavailable; no child started", file=sys.stderr)
                        return 75
                    time.sleep(min(0.05, max(0, deadline - time.monotonic())))
        child = subprocess.Popen(command, cwd=root, pass_fds=tuple(handle.fileno() for handle in handles))
        record = {"format": "triplex-native-lease/1", "event": "acquired", "backends": names,
                  "purpose": args.purpose, "wrapperPid": os.getpid(), "childPid": child.pid,
                  "startedUnixSeconds": started, "executable": command[0],
                  "argvSha256": hashlib.sha256(json.dumps(command).encode()).hexdigest()}
        with (directory / "events.jsonl").open("a") as journal:
            journal.write(json.dumps(record) + "\n")
            journal.flush()
            os.fsync(journal.fileno())
        # The child inherits the locked descriptors. If the wrapper is killed,
        # the lease survives until the child exits, rather than opening a race.
        exit_code = child.wait()
        with (directory / "events.jsonl").open("a") as journal:
            journal.write(json.dumps({**record, "event": "released", "exitCode": exit_code,
                                      "finishedUnixSeconds": time.time()}) + "\n")
            journal.flush()
            os.fsync(journal.fileno())
        return exit_code
    except KeyboardInterrupt:
        # Keep ownership while the command unwinds; never release a live trial.
        if child is not None:
            try:
                child.wait()
            except KeyboardInterrupt:
                return child.wait()
        return 130
    finally:
        if child is not None and child.poll() is None:
            child.wait()
        for handle in reversed(handles):
            handle.close()


if __name__ == "__main__":
    raise SystemExit(main())

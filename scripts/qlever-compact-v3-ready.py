#!/usr/bin/env python3
"""Configure an explicitly owned epoch, or check its readiness without mutation.

Run --configure under scripts/triplex-lease.py. The current receipt is an epoch
pointer; unique full receipts are retained. A restarted server is never ready
merely because a previous epoch's receipt exists.
"""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
NAME = "triplex-qlever-compact-v3"
IMAGE = "adfreiburg/qlever:0.6.0@sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec"
COMMAND = ["-i", "triplex", "-p", "7019", "-j", "4", "-m", "512M", "-c", "64M", "-e", "32M", "--persist-updates", "--no-patterns", "--no-access-check"]
CURRENT = ROOT / ".qlever/compact-v3/readiness.json"


def run(*args: str):
    return json.loads(subprocess.check_output(args, text=True, timeout=20))


def inspect():
    item = run("docker", "inspect", NAME)[0]
    assert item["State"]["Running"] and item["State"]["Pid"] > 0, "Owned node is not running"
    assert item["Config"]["Image"] == IMAGE
    assert item["Image"] == run("docker", "image", "inspect", IMAGE)[0]["Id"]
    assert item["Config"]["Cmd"] == COMMAND
    assert item["Config"]["Entrypoint"] == ["qlever-server"]
    assert item["Config"]["WorkingDir"] == "/data"
    labels = item["Config"]["Labels"]
    assert labels["com.docker.compose.project"] == NAME
    assert labels["triplex.owner"] == "triplex-db"
    assert labels["triplex.profile"] == "compact-v3"
    host = item["HostConfig"]
    assert host["Memory"] == host["MemorySwap"] == 4 * 1024**3
    assert host["NanoCpus"] == 4 * 10**9
    assert host["RestartPolicy"]["Name"] in ("", "no")
    assert host["LogConfig"] == {"Type": "json-file", "Config": {"max-file": "2", "max-size": "8m"}}
    assert host["PortBindings"] == {"7019/tcp": [{"HostIp": "127.0.0.1", "HostPort": "7019"}]}
    binds = [(m["Source"], m["Destination"]) for m in item["Mounts"] if m["Type"] == "bind"]
    assert binds == [(str((ROOT / ".qlever/compact-v3/data").resolve()), "/data")]
    return item


def epoch(item):
    return {"containerId": item["Id"], "startedAt": item["State"]["StartedAt"], "imageId": item["Image"]}


def validate_epoch(receipt, item):
    assert receipt["format"] == "qlever-owned-readiness/1"
    assert receipt["status"] == "READY" and receipt["queryPlanningBudget"] == 100
    assert all(receipt[key] == value for key, value in epoch(item).items()), "Stale READY receipt: native epoch changed"


def require_lease():
    expected = (ROOT / ".experiments/backend-leases/qlever.lock").stat()
    for fd in range(3, 1024):
        try:
            observed = os.fstat(fd)
            if (observed.st_dev, observed.st_ino) == (expected.st_dev, expected.st_ino):
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                return
        except OSError:
            pass
    raise RuntimeError("--configure requires the inherited exclusive QLever qualification lease")


def get(parameters):
    url = "http://127.0.0.1:7019/?" + urllib.parse.urlencode(parameters)
    with urllib.request.urlopen(url, timeout=3) as response:
        raw = response.read(1024 * 1024 + 1)
        assert len(raw) <= 1024 * 1024
        return json.loads(raw)


def settings_check(settings):
    assert settings["query-planning-budget"] == "100"
    assert settings["cache-max-size"] == "64 MB"
    assert settings["cache-max-size-single-entry"] == "32 MB"


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x") as stream:
        json.dump(value, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--configure", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    assert args.configure != args.check, "Select exactly one of --configure or --check"
    first = inspect()
    if args.check:
        receipt = json.loads(CURRENT.read_text())
        validate_epoch(receipt, first)
        settings_check(get({"cmd": "get-settings"}))
        assert epoch(first) == epoch(inspect()), "Native epoch changed during check"
        print(json.dumps({"status": "READY", **epoch(first), "queryPlanningBudget": 100}))
        return
    require_lease()
    deadline = time.monotonic() + 30
    while True:
        try:
            before = get({"cmd": "get-settings"})
            break
        except (OSError, ValueError):
            if time.monotonic() >= deadline:
                raise
            time.sleep(.2)
    changed = get({"query-planning-budget": "100"})
    settings = get({"cmd": "get-settings"})
    settings_check(settings)
    stats = get({"cmd": "stats"})
    assert stats["git-hash-server"].startswith("6c5861a"), stats
    assert stats["version-server"] == "v0.6.0", stats
    final = inspect()
    assert epoch(first) == epoch(final), "Native epoch changed during configuration"
    unique = f"qlever-compact-v3-readiness-{time.time_ns()}.json"
    receipt = {"format": "qlever-owned-readiness/1", "status": "READY", **epoch(final), "queryPlanningBudget": 100,
               "nativeQueryAllocation": "512M", "nativeThreads": 4, "nativeCache": "64M", "nativeSingleEntryCache": "32M",
               "settingsBefore": before, "settingsSetResponse": changed, "settingsReadback": settings, "stats": stats,
               "composeSha256": hashlib.sha256((ROOT / "compose.qlever-compact-v3.yaml").read_bytes()).hexdigest(),
               "readinessScriptSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "createdUnixSeconds": time.time()}
    evidence = ROOT / "qualification/evidence" / unique
    save_json(evidence, receipt)
    pending = CURRENT.with_name(f"readiness-{time.time_ns()}.pending.json")
    save_json(pending, {**receipt, "fullReceipt": str(evidence.relative_to(ROOT))})
    os.replace(pending, CURRENT)
    directory = os.open(CURRENT.parent, os.O_RDONLY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)
    print(json.dumps({"status": "READY", **epoch(final), "receipt": str(evidence)}))


if __name__ == "__main__":
    main()

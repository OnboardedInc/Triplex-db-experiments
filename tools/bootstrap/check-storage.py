#!/usr/bin/env python3
"""Fail closed unless the owned fixed-capacity APFS image is mounted at homebase."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import plistlib
import subprocess


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    root = args.root.absolute()
    config = json.loads((root / "provenance/bounded-storage.json").read_text())
    volume = plistlib.loads(subprocess.check_output(["diskutil", "info", "-plist", str(root)]))
    info = plistlib.loads(subprocess.check_output(["hdiutil", "imageinfo", "-plist", config["backingPath"]]))
    expected = config["volume"]
    failures = []
    if root.is_symlink() or volume.get("FilesystemType") != "apfs" or volume.get("MountPoint") != str(root):
        failures.append("Homebase is not the expected real mounted APFS directory")
    if not expected.get("uuid") or volume.get("VolumeUUID") != expected["uuid"]:
        failures.append("Mounted volume UUID differs")
    if info["Size Information"]["Total Bytes"] != config["imageVirtualBytes"]:
        failures.append("Owned image capacity differs; resizing is not admitted")
    if volume["TotalSize"] > config["imageVirtualBytes"]:
        failures.append("Mounted filesystem exceeds image capacity")
    archive = Path(config["originalZip"]["path"])
    archive_stat = archive.stat()
    archive_bytes = max(archive_stat.st_size, archive_stat.st_blocks * 512)
    if archive_stat.st_size != config["originalZip"]["logicalBytes"] or archive_stat.st_mtime_ns != config["originalZip"]["mtimeNs"]:
        failures.append("Original ZIP identity metadata changed; full SHA verification required")
    outside = Path(config["outsideOwnerRoot"])
    extra_bytes = 0
    image = Path(config["backingPath"])
    for path in outside.rglob("*"):
        if path.is_symlink():
            failures.append("Outside owner directory contains a symlink")
        elif path.is_file() and path != image:
            stat = path.stat()
            extra_bytes += max(stat.st_size, stat.st_blocks * 512)
    backing_stat = image.stat()
    backing_bytes = max(backing_stat.st_size, backing_stat.st_blocks * 512)
    owned = archive_bytes + backing_bytes + extra_bytes
    if extra_bytes > config["outsideAllowanceBytes"]:
        failures.append("Outside ownership allowance exceeded")
    if owned > config["operationalMaximumBytes"]:
        failures.append("Operational46GB ceiling exceeded")
    if owned > config["hardOwnedMaximumBytes"]:
        failures.append("Hard50GB ownership ceiling exceeded")
    filesystem = os.statvfs(root)
    print(json.dumps({
        "format": "triplex-bounded-storage-observation/1",
        "result": "PASS" if not failures else "FAIL",
        "mechanism": config["mechanism"], "root": str(root),
        "volumeUuid": volume.get("VolumeUUID"), "device": volume.get("DeviceIdentifier"),
        "imageVirtualBytes": config["imageVirtualBytes"],
        "sourceZipCountedBytes": archive_bytes, "backingCountedBytes": backing_bytes,
        "outsideCountedBytes": extra_bytes, "ownedCountedBytes": owned,
        "operationalMaximumBytes": config["operationalMaximumBytes"],
        "hardOwnedMaximumBytes": config["hardOwnedMaximumBytes"],
        "freeInsideBytes": filesystem.f_bavail * filesystem.f_frsize,
        "failures": failures,
        "limits": ["Nested VM/database allocation is already inside the backing image; never add it twice.", "Native macOS memory supervision is separate and is not hard process-tree containment.", "Outside task writes require explicit bounded accounting; this checker is not a substitute for the image boundary."],
    }, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())

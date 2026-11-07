#!/usr/bin/env python3
"""Verify the portable export baseline. This is not an original Git-origin audit."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def sha256(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--check-zip", action="store_true")
    parser.add_argument("--allow-working-changes", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    baseline = json.loads((root / "provenance/portable-export-baseline.json").read_text())
    differences = []
    for relative, expected in baseline["files"].items():
        path = root / relative
        if path.is_symlink() or not path.is_file():
            differences.append({"path": relative, "kind": "missing-or-not-regular"})
        elif path.stat().st_size != expected["bytes"] or sha256(path) != expected["sha256"]:
            differences.append({"path": relative, "kind": "changed"})
    archive = baseline["sourceArchive"]
    zip_verified = None
    if args.check_zip:
        source = Path(archive["path"])
        zip_verified = source.stat().st_size == archive["logicalBytes"] and sha256(source) == archive["sha256"]
    passed = (not differences or args.allow_working_changes) and zip_verified is not False
    print(json.dumps({
        "format": "triplex-portable-export-verification/1",
        "proofPolicy": baseline["proofPolicy"],
        "result": "PASS" if passed else "FAIL",
        "scope": "Selected sanitized export member bytes only; no original Git-origin or runtime qualification claim.",
        "files": len(baseline["files"]),
        "workingChangesAllowed": args.allow_working_changes,
        "differences": differences,
        "sourceArchiveSha256Verified": zip_verified,
    }, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())

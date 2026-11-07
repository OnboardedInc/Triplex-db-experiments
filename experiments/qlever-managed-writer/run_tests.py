"""Run retained offline model fixtures and write a narrowly labelled receipt."""
import hashlib
import json
import sys
import time
import unittest
import shutil
from pathlib import Path

here = Path(__file__).resolve().parent
root = here.parents[1]
sys.path.insert(0, str(here))
def main() -> None:
    stamp = time.time_ns()
    log = root / "qualification" / "evidence" / f"qlever-managed-writer-model-{stamp}.log"
    archive = log.parent / f"qlever-managed-writer-model-{stamp}-source"
    archive.mkdir()
    sources = sorted(here.glob("*.py"))
    for path in sources:
        shutil.copyfile(path, archive / path.name)
    started = time.monotonic()
    with log.open("x") as stream:
        result = unittest.TextTestRunner(stream=stream, verbosity=2).run(unittest.defaultTestLoader.discover(str(here), pattern="test_*.py"))
    artifact = {
        "format": "qlever-managed-writer-offline-model/1",
        "at_ns": stamp,
        "status": "PASS_OFFLINE_MODEL_ONLY" if result.wasSuccessful() else "FAIL_OFFLINE_MODEL",
        "tests": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "elapsedSeconds": time.monotonic() - started,
        "sourceSha256": {path.name: hashlib.sha256((archive / path.name).read_bytes()).hexdigest() for path in sources},
        "sourceArchive": str(archive.relative_to(root)),
        "log": str(log.relative_to(root)),
        "retainedFixtures": [".qlever/managed-model/", ".qlever/managed/offline-packet-*/"],
        "nativeRequests": 0,
        "nativeContainerActions": 0,
        "limitations": ["File-backed lifecycle model and mocked native boundaries only", "No native cancellation/writeback/power-loss durability guarantee", "No Triplex backend integration or goal7 acceptance", "Compact8KiBselector/16MiBjournal and ephemeral32MiBmodify/1MiBproof limits are provisional, not a qualified command-scale contract", "All model fixtures retained; no cleanup"],
    }
    output = log.with_suffix(".json")
    output.write_text(json.dumps(artifact, indent=2) + "\n")
    print(json.dumps({"artifact": str(output.relative_to(root)), "status": artifact["status"], "tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}))
    raise SystemExit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()

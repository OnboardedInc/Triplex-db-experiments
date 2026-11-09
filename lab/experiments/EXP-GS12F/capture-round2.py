"""Retain historical pin deltas and classify existing timeout logs; no semantic PASS."""
import hashlib
import json
import pathlib
import subprocess
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / "lab/experiments/EXP-GS12F/evidence/round2"

def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def explicit_pins(obj):
    result = {}
    if isinstance(obj, dict):
        if isinstance(obj.get("path"), str) and isinstance(obj.get("sha256"), str):
            result[obj["path"]] = obj["sha256"]
        for value in obj.values():
            result.update(explicit_pins(value))
    elif isinstance(obj, list):
        for value in obj:
            result.update(explicit_pins(value))
    return result

# [EXP-GS12F-R2] Why: report the original regeneration's moved pins without changing authority.
# Rejected: regenerating the current contract (only its builder may own a repin/version).
old = explicit_pins(json.loads(git("show", "8d098718:lab/acceptance/obligations.json")))
new = explicit_pins(json.loads(git("show", "1e22e79a:lab/acceptance/obligations.json")))
deltas = [{"path": p, "oldSha256": old.get(p), "newSha256": new.get(p)}
          for p in sorted(old.keys() | new.keys()) if old.get(p) != new.get(p)]
implementation_pins = [p for p in deltas if not p["path"].startswith("lab/acceptance/")]
for pin in implementation_pins:
    assert sha((ROOT / pin["path"]).read_bytes()) == pin["newSha256"]

core = []
old_paths = set(git("ls-tree", "-r", "--name-only", "8d098718", "--", "packages/core/src").decode().splitlines())
for p in git("diff", "--name-only", "8d098718", "1e22e79a", "--", "packages/core/src").decode().splitlines():
    before = git("show", f"8d098718:{p}") if p in old_paths else None
    core.append({"path": p, "oldSha256": sha(before) if before is not None else None,
                 "newSha256": sha((ROOT / p).read_bytes()), "note": "source delta; not an explicit moved contract pin in that regeneration"})

main = git("rev-parse", "main").decode().strip()
assert git("diff", main, "--", "lab/acceptance/") == b""
(OUT / "pins.json").write_text(json.dumps({
    "originalBase": "8d098718", "originalRegeneration": "1e22e79a",
    "restoredMain": main, "restorationCommit": "564d79b3",
    "implementationPins": implementation_pins,
    "revertedGeneratedMetadataPins": [p for p in deltas if p not in implementation_pins],
    "coreSourceDeltas": core,
}, indent=2) + "\n")

# [EXP-GS12F-R2] Why: Q91a/R35 disallows qualification from this delta-resident composition.
# Rejected: replacing timeout logs with a success or treating them as a fresh offline execution.
records = []
for path, limit in [("attempt3/qlever-live.log", 30000), ("qlever-live.log", 120000)]:
    rel = "lab/experiments/EXP-GS12F/evidence/" + path
    data = (ROOT / rel).read_bytes()
    assert f"Test timed out in {limit}ms".encode() in data
    assert b"3 failed" in data
    records.append({"path": rel, "sha256": sha(data), "timeoutMs": limit,
                    "classification": "DIAGNOSTIC", "historical": True,
                    "semanticQualification": False,
                    "reason": "Q91a/R35: qlever-dev reads from its update delta; not a qualifying built-base composition"})
(OUT / "live-classification.json").write_text(json.dumps(records, indent=2) + "\n")

source_paths = [
    "packages/qlever/test/value-limits-offline.test.ts", "packages/qlever/src/rdf.ts",
    "packages/qlever/src/QleverStorageAdapter.ts", "packages/core/src/store/TriplesLive.ts",
    "packages/core/src/store/validateValues.ts", "lab/experiments/EXP-GS12F/capture-round2.py",
    "pnpm-lock.yaml",
]
(OUT / "execution-sources.json").write_text(json.dumps({
    "capturedAt": datetime.now(timezone.utc).isoformat(),
    "headBeforeTests": git("rev-parse", "HEAD").decode().strip(),
    "files": {p: sha((ROOT / p).read_bytes()) for p in source_paths},
    "mode": "offline; no engine, container or slot claim",
}, indent=2) + "\n")

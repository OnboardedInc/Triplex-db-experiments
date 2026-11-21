#!/usr/bin/env python3
"""Price the summary recorder against the previous summary on the physical host."""

import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
from statistics import mean
import subprocess
import sys
import time


def read(path):
    return json.loads(path.read_bytes())


def campaign(archive, image, root):
    assert sys.platform == "linux" and os.environ.get("DX_BARE_METAL") == "1"
    assert os.environ.get("DOCKER_HOST") == "unix:///var/run/docker.sock"
    assert subprocess.check_output(["systemd-detect-virt"], text=True).strip() == "none"
    source = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    subprocess.run(["git", "diff", "--quiet", "HEAD", "--"], check=True)
    root.mkdir()
    results, offers, expected = [], None, None
    started = time.monotonic()
    for label, control in (("control-a", True), ("events-a", False), ("events-b", False), ("control-b", True)):
        out = root / label
        flags = ["--trace-baseline"] if control else []
        # [DX-TAIL1] Why: use the same engine-owned launcher and a fresh stack for each bookend and treatment.
        # Rejected: comparing a late warmed treatment with a first-use control.
        with (root / (label + ".log")).open("x") as log:
            process = subprocess.Popen(["node", "lab/bin/engine.mjs", "tail1", "--holder", "DX-TAIL1",
                                        "--event-gate", "--arm", "g1-2core", "--archive", archive,
                                        "--image-receipt", image, "--out", out, *flags], stdout=log, stderr=log)
            try:
                assert process.wait(timeout=8 * 60) == 0
            except subprocess.TimeoutExpired:
                process.terminate()
                process.wait(timeout=90)
                raise
        result = read(out / "event-observations.json")
        ledger_file = out / "event-ledger.json"
        ledger, attempt = read(ledger_file), read(out / "attempt.json")
        cleanup, flags = read(out / "cleanup.json"), read(out / "runtime-flags.json")
        identity = result["identity"]
        assert result["timing"] == "bare-metal" and identity["source"] == source
        assert identity == attempt["identity"] == cleanup["identity"] == flags["identity"]
        assert all(row["id"] == result["ids"][row["role"]] and not row["oom"] for row in cleanup["stopped"])
        assert len(cleanup["stopped"]) == 4 and flags["ids"] == result["ids"]
        assert ("capture" in result) != control
        assert sha256(ledger_file.read_bytes()).hexdigest() == result["ledgerSha256"]
        assert (ledger["source"], ledger["slot"], ledger["nonce"]) == (source, identity["slot"], identity["nonce"])
        tape = [row["subject"] for row in ledger["rows"]]
        assert tape == list(range(len(tape))) and len(tape) >= 192
        identity_inputs = [attempt[k] for k in ("arm", "caps", "cpus", "heaps")]
        offers = tape if offers is None else offers
        expected = identity_inputs if expected is None else expected
        assert offers == tape and expected == identity_inputs
        results.append({"label": label, "control": control, "count": len(tape), **result})
    assert len({row["identity"]["slot"] for row in results}) == 4
    baseline = mean(row["p50Ms"] for row in results if row["control"])
    enabled = mean(row["p50Ms"] for row in results if not row["control"])
    data = {"source": source, "p50ChangePercent": 100 * (enabled / baseline - 1),
            "controlDriftMs": abs(results[0]["p50Ms"] - results[-1]["p50Ms"]),
            "elapsedSeconds": time.monotonic() - started, "arms": results}
    with (root / "cost.json").open("x") as output:
        json.dump(data, output, separators=(",", ":"), allow_nan=False)
        output.write("\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("image_receipt", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    campaign(args.archive.resolve(strict=True), args.image_receipt.resolve(strict=True), args.output.resolve())

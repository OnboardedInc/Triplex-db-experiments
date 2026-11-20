"""Verify the RD1 producer's small and physical writer-pause output."""

import hashlib
import json
import math
from pathlib import Path


def read(path):
    return json.loads(path.read_bytes())


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def encoded(value):
    return hashlib.sha256(json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


def summarize(output, source, slot, driver, start, *, offline=False, historical=False):
    # [DX-BM1] Why: both preflight and physical collector must see the actual scheduled IDs and block bytes.
    # Rejected: taking a writer tail from an unchecked aggregate or treating the self-test as native evidence.
    directory = Path(output)
    tape, result = (read(directory / f"{name}.json") for name in ("tape", "result"))
    keys = ("nonce", "source", "slot", "seconds", "nWorkers", "tapeHash", "primaryCount", "gatewayCalls", "driverSha256")
    assert all(result[key] == tape[key] for key in keys)
    assert (result["source"], result["slot"], result["driverSha256"]) == (source, slot, digest(driver))
    assert result["tapeHash"] == encoded({key: tape[key] for key in ("events", "reads", "validAt")})
    primaries = [row for row in tape["events"] if not row["resend"]]
    assert len(primaries) == result["primaryCount"] == len({row["seq"] for row in primaries})
    assert len(tape["reads"]) == result["gatewayCalls"]
    assert len(result["blocks"]) == 4
    if not historical:
        assert len(result["transactor"]) == 4
    rows = []
    for arm, on in enumerate((False, True, True, False)):
        file = directory / f"block-{arm + 1}/observed.json"
        assert file.stat().st_mtime >= start
        actual, summary = read(file), result["blocks"][arm]
        assert summary == {key: actual[key] for key in summary}
        assert all(actual[key] == tape[key] for key in keys)
        assert (actual["arm"], actual["on"]) == (arm, on)
        assert actual["at"] >= start * 1000 and actual["until"] - actual["at"] == 1000 * result["seconds"]
        observed = actual["writes"]
        assert [(r["seq"], r["resend"]) for r in observed] == [(r["seq"], r["resend"]) for r in tape["events"]]
        assert [r["subject"] for r in actual["gateway"]] == [r["subject"] for r in tape["reads"]]
        assert actual["controlHash"] == encoded({
            "writes": [[r["seq"], r["offsetMs"], r["resend"], r["request"]] for r in observed],
            "gateway": [[r["subject"], r["requests"], r["facts"]] for r in actual["gateway"]],
            "maintenanceRequests": int(actual["maintenance"] is not None),
        })
        latencies = sorted(row["verdictMs"] for row in observed if not row["resend"])
        assert all(math.isfinite(n) for n in latencies)
        assert actual["writerP90Ms"] == latencies[math.ceil(len(latencies) * .9) - 1]
        assert (actual["reads"] > 0) is on
        rows.append({"on": on, "primaries": len(latencies), "localReads": actual["reads"],
                     "writerP90Ms": actual["writerP90Ms"], "blockSha256": digest(file)})
    assert len({block["controlHash"] for block in result["blocks"]}) == 1
    if offline:
        assert slot == "offline-fixture" and result["nativeComplete"] is False
    elif not historical:
        assert result["seconds"] == 90 and result["nWorkers"] == 6
        if result["nativeComplete"]:
            assert result["writeGatewayGc"] and result["nativeRecording"]
            assert all(len(item["rows"]) == item["matched"] == len(primaries) for item in result["transactor"])
    return {"source": source, "slot": slot, "nonce": tape["nonce"], "tapeSha256": digest(directory/"tape.json"),
            "resultSha256": digest(directory/"result.json"), "blocks": rows,
            "nativeComplete": result["nativeComplete"], "contrast": result["contrast"]}

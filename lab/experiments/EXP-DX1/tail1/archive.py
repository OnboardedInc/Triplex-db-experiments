#!/usr/bin/env python3
"""Read the sealed SCALE1 input without unpacking its observation store."""

import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import tarfile


ARCHIVE = "095971d5126cf567a7db3ff15c3fc718656bf98541a66ea0b05136c4c9bd54bb"
SOURCE = "69220f279eba2e79a8eb3075959107f0bbe10cb5"
SLOT = "tx2-dxscale1-arm-d19-i1-zero-b"
ROOT = "arm-d19-i1-zero-b/s0/"
ROLES = ("gw-w", "gw-r", "tx")
OFFER_KEYS = ("seq", "resend", "subject", "kind", "facts", "burst", "active", "correction", "ackLoss", "offsetMs")


def quantiles(values):
    values = sorted(values)
    return {name: values[math.ceil(q * len(values)) - 1] if values else None
            for name, q in (("p50", .5), ("p95", .95), ("p99", .99), ("p99_9", .999), ("max", 1))}


def pauses(log):
    # [DX-TAIL1] Why: HotSpot can log a pause at start and end, and ZGC cycles
    # include concurrent work. Rejected: treating cycle duration as stopped time.
    pause = re.compile(r"GC\((\d+)\) Pause (.*?)\s+([\d.]+)(ms|us|s)$")
    uptime = re.compile(r"\[(\d+(?:\.\d+)?)(ms|s)\]")
    for line in log.splitlines():
        match = pause.search(line)
        clock = uptime.search(line)
        if match and clock:
            gc_id, reason, duration, unit = match.groups()
            kind = next((k for text, k in (("Full", "full"), ("Mixed", "mixed"), ("Young", "young"))
                         if text in reason), "phase")
            yield {"gc": int(gc_id), "kind": kind, "humongous": "Humongous Allocation" in reason,
                   "reason": re.sub(r"\s+\d+[KMG]->\d+[KMG]\(\d+[KMG]\)$", "", reason),
                   "ms": float(duration) * {"ms": 1, "us": .001, "s": 1000}[unit],
                   "uptimeMs": float(clock[1]) * (1000 if clock[2] == "s" else 1)}


def describe(events):
    return {"count": len(events), "ms": quantiles([e["ms"] for e in events]),
            "kind": dict(Counter(e["kind"] for e in events)),
            "causes": dict(Counter(e["reason"] for e in events)),
            "humongousTriggers": sum(e["humongous"] for e in events)}


def write_json(file, data):
    with file.open("x") as output:
        json.dump(data, output, separators=(",", ":"), allow_nan=False)
        output.write("\n")


def read_archive(archive, output):
    with archive.open("rb") as stream:
        actual = hashlib.file_digest(stream, "sha256").hexdigest()
    if actual != ARCHIVE:
        raise ValueError("Deep B archive SHA-256 mismatch")
    logs, rows = {}, []
    report = ledger_hash = None
    with subprocess.Popen(["zstd", "-dc", "--", archive], stdout=subprocess.PIPE) as decoder:
        with tarfile.open(fileobj=decoder.stdout, mode="r|") as tar:
            for entry in tar:
                if entry.name == ROOT + "ns-report.json":
                    assert report is None and entry.isfile()
                    report = json.load(tar.extractfile(entry))
                if entry.name == ROOT + "ns-writes.jsonl":
                    assert ledger_hash is None and entry.isfile()
                    digest = hashlib.sha256()
                    for line in tar.extractfile(entry):
                        digest.update(line)
                        row = json.loads(line)
                        if row["stream"] == "background":
                            keys = (*OFFER_KEYS, "position", "traceId", "scheduledAt", "ackPublishedAt",
                                    "verdictMs", "outcome", "expired")
                            rows.append({key: row.get(key) for key in keys})
                    ledger_hash = digest.hexdigest()
                for role in ROLES:
                    if entry.name == f"trace/raw/{role}-gc.log.zst":
                        assert role not in logs and entry.isfile()
                        logs[role] = subprocess.run(["zstd", "-dc"], input=tar.extractfile(entry).read(),
                                                    capture_output=True, check=True).stdout.decode()
        # tar stops at the end marker before zstd necessarily reaches its checksum.
        while decoder.stdout.read(1024 * 1024):
            pass
        assert decoder.wait() == 0
    assert set(logs) == set(ROLES) and report is not None and ledger_hash is not None
    identity = report["deep"]["identity"]
    assert identity["source"] == SOURCE and identity["slot"] == SLOT
    assert report["status"] == "DONE" and report["config"]["zeroReaders"] and not report["finalizationErrors"]
    start = report["traceStartAbsMs"]
    rows.sort(key=lambda row: (row["offsetMs"], row["seq"], row["resend"]))
    primary = [r for r in rows if not r["resend"]]
    assert len(primary) == report["receiptCapture"]["matched"] == 56505
    assert len({r["traceId"] for r in primary}) == len({r["position"] for r in primary}) == len(primary)
    assert len({(r["seq"], r["resend"]) for r in rows}) == len(rows)
    for row in primary:
        assert row["outcome"] == "committed" and not row["expired"]
        assert row["offsetMs"] == row["scheduledAt"] - start
        assert math.isclose(row["verdictMs"], row["ackPublishedAt"] - row["scheduledAt"], abs_tol=.001)
    history = [{"name": p["name"], "startMs": p["traceStartS"] * 1000, "endMs": p["traceEndS"] * 1000}
               for p in report["phases"] if p["name"].startswith(("p4h", "grow"))]
    # [DX-TAIL1] Why: preserve the analyst's writer clock fit and its exclusion gap.
    # Rejected: applying a writer-uptime origin to another JVM in the archive.
    writer = list(pauses(logs["gw-w"]))
    cohorts = {"outside-history": [], "during-history": [], "outside-offers": []}
    for event in writer:
        end = event["uptimeMs"] - 475827.078
        begin = end - event["ms"]
        if end <= 0 or begin >= 5910000:
            cohort = "outside-offers"
        elif any(begin < p["endMs"] and end > p["startMs"] for p in history):
            cohort = "during-history"
        else:
            cohort = "outside-history"
        cohorts[cohort].append(event)
    output.mkdir(parents=True)
    for role, log in logs.items():
        with (output / f"{role}.log").open("x") as file:
            file.write(log)
    write_json(output / "offers.json", {"archive": actual, "ledger": ledger_hash,
               "source": SOURCE, "slot": SLOT, "start": start, "seconds": 5910,
               "seed": report["deep"]["seed"], "trace": report["deep"]["trace"],
               "offers": [{key: row[key] for key in OFFER_KEYS} for row in rows]})
    write_json(output / "gc.json", {"archive": actual, "source": SOURCE, "slot": SLOT,
               "primarySaves": len(primary), "resends": len(rows) - len(primary),
               "prefixPrimary": {s: sum(r["offsetMs"] < s * 1000 for r in primary) for s in (180, 240, 300, 900)},
               "historyWindows": history, "rolesFullProcess": {role: describe(list(pauses(logs[role]))) for role in ROLES},
               "writerByOverlap": {name: describe(events) for name, events in cohorts.items()}})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    arguments = parser.parse_args()
    read_archive(arguments.archive, arguments.output)

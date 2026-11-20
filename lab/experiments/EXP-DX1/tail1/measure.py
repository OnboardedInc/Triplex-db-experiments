#!/usr/bin/env python3
"""Describe a fresh Mac/server replay and its resource costs."""

from collections import Counter, defaultdict
from datetime import datetime
import json
import math
from pathlib import Path
import re
import subprocess
import sys

from archive import describe, OFFER_KEYS, pauses, quantiles, write_json


def load(path):
    return json.loads(path.read_bytes())


def timed_gc(directory, role, start, stop):
    files = sorted(directory.glob(f"{role}.log*"))
    assert files, f"Missing JVM log for {role}"
    log = "\n".join(p.read_text() for p in files)
    collector = re.search(r"\[gc(?:,init)?\] Using (.+)", log)
    assert collector, f"Missing initial collector settings for {role}"
    initialized = [line.rsplit("] ", 1)[-1] for line in log.splitlines() if "[gc,init]" in line]
    events = []
    allocation_stalls = []
    for line in log.splitlines():
        stamp = re.match(r"\[([^\]]+)\]", line)
        if not stamp:
            continue
        at = datetime.fromisoformat(stamp[1]).timestamp() * 1000
        stall = re.search(r"Allocation Stall .*? ([\d.]+)ms$", line)
        if stall and start <= at < stop:
            allocation_stalls.append(float(stall[1]))
        for event in pauses(line):
            if at >= start and at - event["ms"] < stop:
                events.append(event)
    return {"collector": collector[1], "init": initialized, "window": describe(events),
            "allocationStalls": {"count": len(allocation_stalls), "ms": quantiles(allocation_stalls)}}


def measure(out):
    attempt, report = load(out / "attempt.json"), load(out / "ns-report.json")
    identity = attempt["identity"]
    assert report["deep"]["identity"] == identity == load(out / "cleanup.json")["identity"]
    assert report["status"] == "DONE" and not report["finalizationErrors"]
    assert report["oracle"]["exitCode"] == 0 and report["oracle"]["mismatchCount"] == 0
    assert report["oracle"]["modelCorrectOnSameReads"] == report["oracle"]["reads"] > 0
    start = report["traceStartAbsMs"]
    stop = start + attempt["seconds"] * 1000
    dir = out / "stack" / identity["slot"]
    trace = dir / "trace/raw"
    stack = load(dir / "stack.json")
    assert stack["prefix"] == identity["slot"]
    assert all(stack["durability"][key] == "on" for key in ("fsync", "synchronous_commit", "full_page_writes"))
    ids = {row["name"].removeprefix(identity["slot"] + "-"): row["id"] for row in stack["containers"]}
    effective = load(out / "runtime-flags.json")
    assert effective["identity"] == identity and effective["ids"] == ids
    with subprocess.Popen(["zstd", "-dc", out / "ns-writes.jsonl.zst"], stdout=subprocess.PIPE) as reader:
        writes = [json.loads(line) for line in reader.stdout]
        assert reader.wait() == 0
    archive = load(out / "archive" / "offers.json")
    assert report["tailReplay"]["archive"] == archive["archive"] and report["tailReplay"]["ledger"] == archive["ledger"]
    expected = {(row["seq"], row["resend"]): row for row in archive["offers"] if row["offsetMs"] < stop - start}
    observed = {}
    saved = {}
    for row in writes:
        if row["stream"] != "background":
            continue
        key = row["seq"], row["resend"]
        assert key not in observed and key in expected
        observed[key] = row
        for field in OFFER_KEYS[:-1]:
            assert row[field] == expected[key][field], (key, field)
        assert abs(row["offsetMs"] - expected[key]["offsetMs"]) < .001
        assert not row["expired"]
        if not row["resend"]:
            assert row["outcome"] == "committed"
            assert row["traceId"] and row["traceId"] not in saved
            elapsed = row["ackPublishedAt"] - row["scheduledAt"]
            assert math.isclose(elapsed, row["verdictMs"], abs_tol=.001)
            assert elapsed >= 0 and row["scheduledAt"] >= start
            saved[row["traceId"]] = row
    assert observed.keys() == expected.keys()
    assert len(saved) == report["receiptCapture"]["matched"] == report["tailReplay"]["primary"] >= 5000
    assert len({r["position"] for r in saved.values()}) == len(saved)
    exchanges, replies = defaultdict(Counter), set()
    for role in ("gw-w", "gw-r"):
        with (trace / (role + ".jsonl")).open() as lines:
            for line in lines:
                span = json.loads(line)
                row = saved.get(span.get("traceId"))
                if row is None or not span["name"].startswith("gateway /"):
                    continue
                assert span["source"] == identity["source"] and span["slot"] == identity["slot"]
                assert span["run"] == identity["slot"] and span["process"] == role
                assert span["root"] not in replies
                replies.add(span["root"])
                exchanges[span["traceId"]][span["name"].rsplit("/", 1)[-1]] += 1
    requests = sum(exchanges.values(), Counter())
    all_timed = [json.loads(line) for line in (out / "resources.jsonl").read_text().splitlines()]
    for sample in all_timed:
        assert sample["identity"] == identity and sample["ids"] == ids
        assert sample["after"] >= sample["before"]
    before = [s for s in all_timed if s["after"] <= start]
    after = [s for s in all_timed if s["before"] >= stop]
    assert before and after, "Need resource samples bracketing the offer window"
    first, last = before[-1], after[0]
    assert start - first["after"] <= 12000 and last["before"] - stop <= 12000
    inside = [s for s in all_timed if first["before"] <= s["before"] <= last["before"]]
    cpu_memory = {}
    for role in ids:
        used = last["stats"][role]["cpuUsec"] - first["stats"][role]["cpuUsec"]
        assert used >= 0
        cpu_memory[role] = {
            "averageCores": used / ((last["before"] - first["before"]) * 1000),
            "sampledPeakMiB": max(s["stats"][role]["current"] for s in inside) / (2 ** 20),
            "peakSinceStartupMiB": last["stats"][role]["peak"] / (2 ** 20),
            "heapMaxMiB": attempt["heaps"].get(role), "containerMiB": attempt["caps"][role],
        }
    allocation = out / "allocation.json"
    groups = None
    if allocation.exists():
        alloc = load(allocation)
        assert alloc["from"] == start and alloc["to"] == stop
        groups = alloc["groups"]
    write_json(out / "measurement.json", {
        "identity": identity, "archive": archive["archive"], "arm": attempt["arm"], "seconds": attempt["seconds"],
        "saves": len(saved), "replays": len(observed) - len(saved),
        "savesPerSecond": len(saved) / max(attempt["seconds"], (max(r["ackPublishedAt"] for r in saved.values()) - start) / 1000),
        "ackMs": quantiles([r["verdictMs"] for r in saved.values()]), "cpuMemory": cpu_memory,
        "gc": {role: timed_gc(trace, role, start, stop) for role in ("gw-w", "gw-r", "tx")},
        "gatewayRequests": dict(requests), "requestsPerSave": requests.total() / len(saved),
        "transactJoinMissing": sum("transact" not in exchanges[trace_id] for trace_id in saved),
        "allocationSampleWeightBytesPerSave": sum(g["weightBytes"] for g in groups.values()) / len(saved) if groups else None,
        "allocationGroups": groups,
    })


if __name__ == "__main__":
    measure(Path(sys.argv[1]))

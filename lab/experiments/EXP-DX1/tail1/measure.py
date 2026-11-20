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


def timed_gc(directory, role, start, stop, history, indexes):
    files = sorted(directory.glob(f"{role}.log*"))
    assert files, f"Missing JVM log for {role}"
    log = "\n".join(p.read_text() for p in files)
    collector = re.search(r"\[gc(?:,init)?\] Using (.+)", log)
    assert collector, f"Missing initial collector settings for {role}"
    initialized = [line.rsplit("] ", 1)[-1] for line in log.splitlines() if "[gc,init]" in line]
    events = []
    cohorts = {"history": [], "explicit-index": [], "outside-known-overlays": []}
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
            begin = at - event["ms"]
            if at >= start and begin < stop:
                events.append(event)
                def overlaps(intervals):
                    return any(begin < right and at >= left for left, right in intervals)
                cohort = ("history" if overlaps(history) else "explicit-index" if overlaps(indexes)
                          else "outside-known-overlays")
                cohorts[cohort].append(event)
    return {"collector": collector[1], "init": initialized, "window": describe(events),
            "byKnownOverlay": {name: describe(group) for name, group in cohorts.items()},
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
    if attempt["platform"] == "darwin":
        lock = load(out / "timing-window.json")
        assert lock["identity"] == identity and lock["openedAt"] <= start
        assert lock["closedAt"] >= start + min(240, attempt["seconds"]) * 1000
        assert 0 < lock["closedAt"] - lock["openedAt"] <= 900_000
    dir = out / "stack" / identity["slot"]
    trace = dir / "trace/raw"
    stack = load(dir / "stack.json")
    assert stack["prefix"] == identity["slot"]
    assert all(stack["durability"][key] == "on" for key in ("fsync", "synchronous_commit", "full_page_writes"))
    ids = {row["name"].removeprefix(identity["slot"] + "-"): row["id"] for row in stack["containers"]}
    flags = out / "runtime-flags.json"
    if flags.exists():
        effective = load(flags)
        assert effective["identity"] == identity and effective["ids"] == ids
    # [DX-TAIL1] Why: the initial control predates the argument readback. Its
    # mounted native startup record still proves the exact process and heap.
    # Rejected: filling absent flags from the arm's desired settings.
    jvm = {}
    for role in ("gw-w", "gw-r", "tx"):
        row = load(dir / "config" / (role + "-native-settings.json"))
        assert row["source"] == identity["source"] and row["slot"] == identity["slot"] and row["process"] == role
        heap = row["jvm"]["maxHeapBytes"] / (2 ** 20)
        assert 0 < heap <= attempt["caps"][role]
        jvm[role] = heap
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
    assert load(out / "s0.armed.json")["identity"] == identity
    release = load(out / "release.json")
    assert all(release[part] == identity[part] for part in ("source", "slot", "nonce"))
    assert release["start"] == start and release["armed"]["s0"] == load(out / "s0.armed.json")
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
    transact_join_missing = sum("transact" not in exchanges[trace_id] for trace_id in saved)
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
            "heapMaxMiB": jvm.get(role), "containerMiB": attempt["caps"][role],
        }
    allocation = out / "allocation.json"
    groups = None
    if allocation.exists():
        alloc = load(allocation)
        assert alloc["from"] == start and alloc["to"] == stop
        groups = alloc["groups"]
    history = [(p["actualStart"], p["actualEnd"]) for p in report["phases"] if p["name"].startswith(("p4h", "grow"))]
    indexes = [(j["driverRequestedAtMs"], j["driverCompletedAtMs"]) for j in report["maintenance"]["events"]]
    write_json(out / "measurement.json", {
        "identity": identity, "archive": archive["archive"], "arm": attempt["arm"], "seconds": attempt["seconds"],
        "saves": len(saved), "replays": len(observed) - len(saved),
        "savesPerSecond": len(saved) / max(attempt["seconds"], (max(r["ackPublishedAt"] for r in saved.values()) - start) / 1000),
        "ackMs": quantiles([r["verdictMs"] for r in saved.values()]), "cpuMemory": cpu_memory,
        "gc": {role: timed_gc(trace, role, start, stop, history, indexes) for role in ("gw-w", "gw-r", "tx")},
        "gatewayRequests": dict(requests),
        "requestsPerSave": requests.total() / len(saved) if transact_join_missing == 0 else None,
        "transactJoinMissing": transact_join_missing,
        "allocationSampleWeightBytesPerSave": sum(g["weightBytes"] for g in groups.values()) / len(saved) if groups else None,
        "allocationSampleWeightBytesPerSecond": sum(g["weightBytes"] for g in groups.values()) / attempt["seconds"] if groups else None,
        "allocationGroups": groups,
    })


if __name__ == "__main__":
    measure(Path(sys.argv[1]))

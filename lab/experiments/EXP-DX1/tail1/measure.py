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


def timed_gc(directory, role, start, stop, history, indexes, startup):
    files = sorted(directory.glob(f"{role}.log*"))
    assert files, f"Missing JVM log for {role}"
    log = "\n".join(p.read_text() for p in files)
    collector = startup["collector"] if startup else None
    if collector is None:
        legacy = re.search(r"\[gc\s*\] Using (.+)", log)
        assert legacy, f"Missing initial collector settings for {role}"
        collector = legacy[1]
    initialized = []
    events = []
    cohorts = {"history": [], "explicit-index": [], "outside-known-overlays": []}
    allocation_stalls = []
    safepoints = defaultdict(list)
    for line in log.splitlines():
        stamp = re.match(r"\[([^\]]+)\]", line)
        if not stamp:
            continue
        at = datetime.fromisoformat(stamp[1]).timestamp() * 1000
        if startup and at < startup["initializedAt"]:
            continue
        if "[gc,init]" in line:
            initialized.append(line.rsplit("] ", 1)[-1])
        safe = re.search(r'Safepoint "([^"]+)".*Total: (\d+) ns$', line)
        if safe and start <= at < stop:
            safepoints[safe[1]].append(int(safe[2]) / 1e6)
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
    return {"collector": collector, "init": initialized, "window": describe(events),
            "byKnownOverlay": {name: describe(group) for name, group in cohorts.items()},
            "safepoints": {name: {"count": len(ms), "ms": quantiles(ms)} for name, ms in safepoints.items()},
            "allocationStalls": {"count": len(allocation_stalls), "ms": quantiles(allocation_stalls)}}


def measure(out, incomplete=False):
    attempt, report = load(out / "attempt.json"), load(out / "ns-report.json")
    identity = attempt["identity"]
    cleanup = load(out / "cleanup.json")
    assert report["deep"]["identity"] == identity == cleanup["identity"]
    assert report["verdictClock"] == "ack/1"
    # [DX-TAIL1] Why: preserve observations from a stopped analysis without accepting its replay.
    # Rejected: patching a driver report to DONE or attaching an oracle result from another attempt.
    if incomplete:
        assert report["status"] == "ERROR" and report.get("error")
    else:
        assert report["status"] == "DONE" and not report["finalizationErrors"]
        assert report["oracle"]["exitCode"] == 0 and report["oracle"]["mismatchCount"] == 0
        assert report["oracle"]["modelCorrectOnSameReads"] == report["oracle"]["reads"] > 0
    start = report["traceStartAbsMs"]
    stop = start + attempt["seconds"] * 1000
    if attempt["platform"] == "darwin":
        lock = load(out / "timing-window.json")
        assert lock["identity"] == identity and lock["openedAt"] <= start
        locked_seconds = 240 if attempt["seconds"] == 5910 else attempt["seconds"]
        assert lock["closedAt"] >= start + locked_seconds * 1000
        assert 0 < lock["closedAt"] - lock["openedAt"] <= 900_000
        if not incomplete:
            assert lock["measurementLease"]["label"] == identity["slot"]
            assert lock["measurementLease"]["holder"] == ("DX-JVM1" if attempt.get("jvmArm") else "DX-TAIL1")
    dir = out / "stack" / identity["slot"]
    trace = dir / "trace/raw"
    stack = load(dir / "stack.json")
    assert stack["prefix"] == identity["slot"]
    assert all(stack["durability"][key] == "on" for key in ("fsync", "synchronous_commit", "full_page_writes"))
    ids = {row["name"].removeprefix(identity["slot"] + "-"): row["id"] for row in stack["containers"]}
    effective = load(out / "runtime-flags.json")
    assert effective["identity"] == identity and effective["ids"] == ids
    assert {row["role"]: row["id"] for row in cleanup["stopped"]} == ids
    for row in cleanup["stopped"]:
        ready = effective["readyRuntime"][row["role"]]
        assert not row["oom"] and all(row[key] == ready[key] for key in ("startedAt", "restarts"))
    jvm = {}
    for role in ("gw-w", "gw-r", "tx"):
        settings_dir = trace if attempt.get("jvmArm") else dir / "config"
        row = load(settings_dir / (role + "-native-settings.json"))
        if attempt.get("jvmArm"):
            boot = datetime.fromisoformat(effective["readyRuntime"][role]["startedAt"]).timestamp() * 1000
            assert row["at"] >= boot - 1
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
    primary_outcomes, resend_outcomes = Counter(), Counter()
    for row in writes:
        if row["stream"] != "background":
            continue
        key = row["seq"], row["resend"]
        assert key not in observed and key in expected
        observed[key] = row
        for field in OFFER_KEYS[:-1]:
            assert row[field] == expected[key][field], (key, field)
        assert abs(row["offsetMs"] - expected[key]["offsetMs"]) < .001
        outcomes = resend_outcomes if row["resend"] else primary_outcomes
        outcome = "expired" if row["expired"] else row.get("outcome", "missing-outcome")
        outcomes[outcome] += 1
        if not row["resend"] and outcome == "committed":
            assert row["traceId"] and row["traceId"] not in saved
            assert row["verdictClock"] == "ack/1"
            elapsed = row["ackPublishedAt"] - row["scheduledAt"]
            assert math.isclose(elapsed, row["verdictMs"], abs_tol=.001)
            assert elapsed >= 0 and row["scheduledAt"] >= start
            saved[row["traceId"]] = row
    assert observed.keys() == expected.keys()
    capture = report["receiptCapture"]
    assert len(saved) == capture["matched"] > 0
    assert capture["missing"] == capture["mismatches"] == 0
    assert primary_outcomes.total() == report["tailReplay"]["primary"]
    assert report["writer"]["expired"] >= primary_outcomes["expired"] + resend_outcomes["expired"]
    assert len({r["position"] for r in saved.values()}) == len(saved)
    lost_ack = None
    if not incomplete:
        duplicates, lost_ack = (report["priorities"]["P2"][k] for k in ("duplicates", "lostAck"))
        assert duplicates["returnedOriginal"] == resend_outcomes["duplicate-returned-original"]
        assert lost_ack["simulated"] == lost_ack["returnedOriginal"] == sum(row["ackLoss"] for row in saved.values())
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
    restart = None
    if attempt.get("jvmArm"):
        restart = load(out / "restart.json")
        assert restart["identity"] == identity and restart["ids"] == ids
        assert restart["readyRuntime"] == effective["readyRuntime"]
        first_ack = min(saved.values(), key=lambda r: r["ackPublishedAt"])
        assert restart["startedAt"] <= restart["readyAt"] <= start <= first_ack["scheduledAt"]
        restart = {"readinessMs": restart["readyAt"] - restart["startedAt"],
                   "readyToOfferMs": first_ack["scheduledAt"] - restart["readyAt"],
                   "firstAckMs": first_ack["ackPublishedAt"] - restart["startedAt"],
                   "firstAckOfferMs": first_ack["verdictMs"]}
    in_index = [row for row in saved.values()
                if any(row["scheduledAt"] < b and row["ackPublishedAt"] >= a for a, b in indexes)]
    index_ids = {r["traceId"] for r in in_index}
    outside_index = [r for r in saved.values() if r["traceId"] not in index_ids]
    native_index = []
    tx_trace = trace / "tx.jsonl"
    if tx_trace.is_file():
        with tx_trace.open() as lines:
            for line in lines:
                row = json.loads(line)
                if row.get("type") != "metrics" or not start + 60_000 <= row["at"] <= stop:
                    continue
                assert row["source"] == identity["source"] and row["slot"] == identity["slot"]
                value = row.get("counters", {}).get("indexJobMsec")
                if isinstance(value, dict) and value.get("count", 0) > 0:
                    native_index.append({"at": row["at"], "durationDistribution": value})
    write_json(out / ("incomplete-measurement.json" if incomplete else "measurement.json"), {
        "identity": identity, "archive": archive["archive"], "arm": attempt["arm"], "seconds": attempt["seconds"],
        "jvmArm": attempt.get("jvmArm"), "restart": restart,
        "explicitIndex": {"jobs": len(indexes), "ms": quantiles([b - a for a, b in indexes]),
                          "overlappedSaves": len(in_index), "otherSaves": len(outside_index),
                          "overlapAckMs": quantiles([r["verdictMs"] for r in in_index]),
                          "outsideAckMs": quantiles([r["verdictMs"] for r in outside_index])},
        "nativeIndexMetricBuckets": native_index,
        "driverStatus": report["status"], "sampleFloorMet": len(saved) >= 5000,
        "saves": len(saved), "primaryOutcomes": dict(primary_outcomes), "resendOutcomes": dict(resend_outcomes),
        "resolvedLostAcks": lost_ack["returnedOriginal"] if lost_ack else None,
        "savesPerSecond": len(saved) / max(attempt["seconds"], (max(r["ackPublishedAt"] for r in saved.values()) - start) / 1000),
        "ackMs": quantiles([r["verdictMs"] for r in saved.values()]), "cpuMemory": cpu_memory,
        "gc": {role: timed_gc(trace, role, start, stop, history, indexes, effective.get("startupGc", {}).get(role))
               for role in ("gw-w", "gw-r", "tx")},
        "gatewayRequests": dict(requests),
        "requestsPerSave": requests.total() / len(saved) if transact_join_missing == 0 else None,
        "transactJoinMissing": transact_join_missing,
        "allocationSampleWeightBytesPerSave": sum(g["weightBytes"] for g in groups.values()) / len(saved) if groups else None,
        "allocationSampleWeightBytesPerSecond": sum(g["weightBytes"] for g in groups.values()) / attempt["seconds"] if groups else None,
        "allocationGroups": groups,
    })


if __name__ == "__main__":
    measure(Path(sys.argv[1]), sys.argv[2:] == ["--incomplete"])

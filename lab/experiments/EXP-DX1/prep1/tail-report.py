"""Join native append calls to their SQL backends and retain competing tail intervals."""

from bisect import bisect_left, bisect_right
from collections import Counter, defaultdict
from datetime import datetime
import json
from pathlib import Path
import re
import sys
from importlib import import_module

observer = import_module("tail-observe")
MS = 1_000_000
THRESHOLD = 20 * MS


def read(path):
    return json.loads(path.read_text())


def ndjson(path):
    with path.open() as file:
        for line in file:
            yield json.loads(line)


class Intervals:
    def __init__(self, rows):
        self.rows = sorted(rows)
        self.starts = [row[0] for row in self.rows]
        self.max_ends = []
        for _, end, *_ in self.rows:
            self.max_ends.append(max(end, self.max_ends[-1] if self.max_ends else 0))

    def overlap(self, start, end):
        lo = bisect_right(self.max_ends, start)
        hi = bisect_left(self.starts, end)
        return [row for row in self.rows[lo:hi] if row[1] > start]

    def contained(self, start, end):
        return [row for row in self.overlap(start, end) if start <= row[0] < row[1] <= end]


def covered_ns(rows, start, end):
    total, cursor = 0, start
    for lo, hi, *_ in sorted(rows):
        total += max(0, min(hi, end) - max(lo, cursor))
        cursor = max(cursor, hi)
    return total


class ClockBridge:
    def __init__(self, samples):
        self.rows = samples
        self.walls = [row["wall"] for row in samples]
        assert len(samples) >= 2 and self.walls == sorted(set(self.walls))
        assert all(0 <= s["hi"] - s["lo"] < 5 * MS for s in samples)

    def monotonic(self, unix_ns):
        i = bisect_right(self.walls, unix_ns)
        if not 0 < i < len(self.rows):
            return None
        left, right = self.rows[i-1:i+1]
        # [DX-PREP1] Why: preserve bridge uncertainty and let a clock step withhold the pause claim.
        # Rejected: subtracting one wall-clock offset across a whole arm.
        lo = min(s["lo"] - s["wall"] for s in (left, right))
        hi = max(s["hi"] - s["wall"] for s in (left, right))
        if right["wall"] - left["wall"] > 2_000 * MS or hi - lo > 3 * MS:
            return None
        return unix_ns + lo - MS, unix_ns + hi + MS


def safepoints(path, bridge):
    for line in path.read_text().splitlines():
        match = re.search(r'^\[([^\]]+)\].* Safepoint "([^"]+)",.* Total: (\d+) ns', line)
        if not match:
            continue
        timestamp, kind, duration = match.groups()
        end = bridge.monotonic(round(datetime.fromisoformat(timestamp).timestamp() * 1000) * MS)
        if end:
            lo, hi = end
            yield {"kind": kind, "startBoundsNs": [lo-int(duration), hi-int(duration)],
                   "endBoundsNs": [lo, hi], "durationNs": int(duration)}


def sql_for_append(spans, indexes, backend_map):
    links = []
    for span in spans:
        lo, hi = span["start"], span["end"]
        assert lo < hi
        hosts = backend_map.get(span["pid"], set())
        commits = [(pid, *commit) for pid in hosts for commit in indexes["C"][pid].contained(lo, hi)]
        if len(commits) != 1:
            links.append({**span, "link": "unresolved", "candidateCommits": len(commits)})
            continue
        pid, start, end, lsn = commits[0]
        flush = indexes["F"][pid].contained(start, end)
        assert any(row[2] == lsn for row in flush)
        wal = [row for a, b, _ in flush for row in indexes["W"][pid].contained(a, b)]
        links.append({**span, "link": "matched-backend", "hostPid": pid,
                      "commit": [start, end, lsn], "flush": flush, "walSync": wal})
    return links


def append_record(detail, meta, label, indexes, backends, time_range, pauses, writebacks, prior):
    start, end = detail["start"], detail["end"]
    observed = time_range[0] <= start <= end <= time_range[1]
    spans = detail["sql"]
    assert all(start <= s["start"] < s["end"] <= end for s in spans)
    links = sql_for_append(spans, indexes, backends) if observed else []
    direct = [link for link in links if link["link"] == "matched-backend"]
    commit_rows = [l["commit"] for l in direct]
    wal_rows = [row for link in direct for row in link["walSync"]]
    flush_rows = [row for link in direct for row in link["flush"]]
    overlapping = {role: index.overlap(start, end) for role, index in pauses.items()}
    io = writebacks.overlap(start, end) if observed else []
    wal = covered_ns(wal_rows, start, end)
    flush = covered_ns(flush_rows, start, end)
    durations = {"wal-sync": wal, "wal-flush-remainder": flush-wal,
                 "checkpoint-writeback-overlap": covered_ns(io, start, end),
                 "transactor-safepoint-overlap": covered_ns(overlapping["tx"], start, end)}
    primary, largest = max(durations.items(), key=lambda item: item[1])
    elapsed = end - start
    primary = primary if observed and largest >= elapsed / 2 and elapsed > THRESHOLD else None
    members = meta["members"] if meta else []
    handoff = None
    if members:
        ready = min(m["applied-at"] for m in members)
        if start - ready > THRESHOLD:
            queued_in_append = covered_ns(prior.overlap(ready, start), ready, start)
            handoff = {"readyNs": ready, "waitNs": start-ready, "priorAppendNs": queued_in_append,
                       "outsidePriorAppendNs": start-ready-queued_in_append}
    return {"cell": label, "startNs": start, "endNs": end, "durationNs": elapsed,
            "durableNativeT": [m["t"] for m in members], "failed": detail.get("failed", False),
            "pgProbeCovered": observed, "sql": links, "pgCommitNs": covered_ns(commit_rows, start, end),
            "overlapNs": durations, "checkpointIO": io, "safepoints": overlapping,
            "longAppend": (primary or "unresolved") if elapsed > THRESHOLD else None, "longHandoff": handoff}


def collect(directory, trace, standard_path):
    assert __debug__
    header = read(directory / "header.json")
    standard = read(standard_path)
    stack_path = trace.parents[1] / "stack.json"
    stack, probe, terminal = (read(p) for p in (stack_path, directory/"observer.json", directory/"observer-end.json"))
    for key, value in (("source", header["commit"]), ("slot", header["slot"]), ("nonce", header["nonce"])):
        assert terminal[key] == probe[key] == standard[key] == value
    assert not standard["fixture"] and standard["orderedIds"] and standard["numericOwner"]
    assert standard["rawSha256"]["header.json"] == observer.sha(directory / "header.json")
    assert standard["rawSha256"]["complete.json"] == observer.sha(directory / "complete.json")
    assert standard["planSha"] == observer.sha(directory.parent / "plan.json")
    restore = trace.parents[1] / "restore.sha256"
    assert restore.read_text().strip() == standard["dumpSha"]
    assert stack["prefix"] == header["slot"] and observer.sha(stack_path) == probe["stackSha256"]
    assert all(cid in {c["id"] for c in stack["containers"]} for cid in probe["containers"])
    assert probe["boot"] == terminal["boot"] == (directory / "boot-id").read_text().strip()
    expected_files = {"postgres-spans.tsv", "postgres-bpf.log", "clock.ndjson", "postgres.bt", "observer.json"}
    assert set(terminal["files"]) == expected_files
    assert all(observer.sha(directory/f) == digest for f, digest in terminal["files"].items())
    assert probe["bpfScriptSha256"] == terminal["files"]["postgres.bt"]
    native = trace / "prep1-native.ndjson"
    assert standard["rawSha256"][native.name] == observer.sha(native)
    for role in ("tx", "gw-w", "gw-r"):
        path = trace / f"prep1-gc-{role}.log"
        assert standard["rawSha256"][path.name] == observer.sha(path)
        text = path.read_text()
        is_zgc = role == "tx" and header["arm"]["tail"] == "zgc"
        assert re.search(r"Using (?:The Z Garbage Collector|ZGC)" if is_zgc else r"Using G1", text)
    config = trace.parents[1] / "config"
    base_image = (config / "java-image.txt").read_text().split("|")
    tx_image = ((config / "tail-tx-image.txt").read_text().split("|")
                if header["arm"]["tail"] == "zgc" else base_image)
    assert base_image[1] in {"21", "<no value>", ""} and (tx_image[1] == "25") == (header["arm"]["tail"] == "zgc")
    for role, cpuset in (("pg", "1"), ("tx", "0"), ("gw-w", "2-5"), ("gw-r", "6")):
        c, = [c for c in stack["containers"] if c["name"] == f'{probe["slot"]}-{role}']
        assert c["cpuset"] == cpuset
        if role != "pg":
            assert c["imageId"] == (tx_image if role == "tx" else base_image)[0]

    pg = read(directory / "pg-settings.json")
    data, wal, data_dev, wal_dev = pg["layout"]
    separate = header["arm"]["tail"] == "wal"
    assert int(pg["version"]) // 10000 == 17
    assert wal == ("/wal" if separate else data+"/pg_wal") and (data_dev != wal_dev) == separate
    mount_proof = []
    if separate:
        path = directory.parent / "wal-mount.json"
        assert read(path)["filesystems"] == [{"source": "/dev/nvme1n1",
            "target": str((directory.parent / "wal-mount").resolve()), "fstype": "ext4"}]
        mount_proof.append(path)
    assert pg["settings"] == {
        "fsync": "on", "synchronous_commit": "on", "full_page_writes": "on", "wal_sync_method": "fdatasync",
        "track_wal_io_timing": "on", "checkpoint_timeout": "5min", "checkpoint_completion_target": "0.9",
        "checkpoint_flush_after": "256kB", "min_wal_size": "80MB", "max_wal_size": "1GB",
        "log_checkpoints": "on", "log_timezone": "UTC", "shared_buffers": "2GB"}
    before, after = (read(directory / f"pg-{p}.json") for p in ("before", "after"))
    assert before["at"] < after["at"] and before["synchronous_commit"] == after["synchronous_commit"] == "on"
    assert before["wal"]["stats_reset"] == after["wal"]["stats_reset"]
    wal_delta = {key: after["wal"][key] - before["wal"][key] for key in ("wal_sync", "wal_sync_time", "wal_write", "wal_write_time")}
    assert all(value >= 0 for value in wal_delta.values())

    events, marks, count = observer.read_events(directory / "postgres-spans.tsv")
    assert len(events) == count and count > 0 and set(marks) == {"START", "STOP"}
    assert not re.search(r"\b(?:lost|dropped)\s+[1-9]|\b(?:ERROR|FATAL):", (directory/"postgres-bpf.log").read_text(), re.I)
    sentinel = read(directory / "sentinel.json")
    assert sentinel == observer.sentinel(directory, sentinel["sqlPid"])
    samples = list(ndjson(directory/"clock.ndjson"))
    bridge = ClockBridge(samples)
    backend_map = defaultdict(set)
    for snap in samples:
        for host, pid in snap["backendPids"].items():
            backend_map[pid].add(int(host))
    rows_by_pid = defaultdict(list)
    for kind, pid, lo, hi, detail in events:
        assert marks["START"] <= lo <= hi <= marks["STOP"] and pid > 1
        assert (lo == hi) == (kind == "B")
        rows_by_pid[kind, pid].append((lo, hi, detail))
    indexes = {kind: defaultdict(lambda: Intervals([])) for kind in "CFWBKI"}
    for (kind, pid), rows in rows_by_pid.items():
        indexes[kind][pid] = Intervals(rows)
    opens = {(pid, lo) for kind, pid, lo, _, _ in events if kind == "B"}
    closed = {(pid, lo): hi for kind, pid, lo, hi, _ in events if kind == "K"}
    assert set(closed) <= opens
    checkpoints = [{"pid": pid, "startNs": lo, "endNs": closed.get((pid, lo))} for pid, lo in sorted(opens)]
    for kind, pid, lo, hi, _ in events:
        if kind == "I":
            assert any(interval["pid"] == pid and interval["startNs"] <= lo <= hi <= (interval["endNs"] or marks["STOP"])
                       for interval in checkpoints)
    writebacks = Intervals((lo, hi, pid) for kind, pid, lo, hi, _ in events if kind == "I")
    converted = {role: list(safepoints(trace / f"prep1-gc-{role}.log", bridge)) for role in ("tx", "gw-w", "gw-r")}
    pauses = {role: Intervals((row["startBoundsNs"][1], row["endBoundsNs"][0], row["kind"])
                             for row in rows if row["startBoundsNs"][1] < row["endBoundsNs"][0])
              for role, rows in converted.items()}

    native_rows = list(ndjson(native))
    assert native_rows[-1] == {"attempt": header["nonce"], "dropped": 0, "end": True}
    assert all(row["attempt"] == header["nonce"] for row in native_rows)
    application = {(r["start"], r["end"]):r for r in native_rows[:-1]
                   if r["db"] == header["db"] and not r.get("tailAppend")}
    append_calls = [r for r in native_rows if r.get("tailAppend")]
    assert set(application) <= {(r["start"], r["end"]) for r in append_calls}
    calls_for_db = [r for r in append_calls if r["db"] == header["db"]]
    prior = Intervals((r["start"], r["end"]) for r in calls_for_db)
    cells_by_t, cells = {}, {}
    for cell in standard["cells"]:
        name = cell["cell"]
        path = directory / f"{name}.json"
        assert observer.sha(path) == standard["rawSha256"][path.name]
        raw = read(path)
        assert marks["START"] < int(raw["phaseStartNs"]) < marks["STOP"]
        for row in raw["rows"]:
            if row.get("receipt"):
                t = int(row["receipt"]["t"])
                assert cells_by_t.get(t, name) == name
                cells_by_t[t] = name
        cells[name] = {**cell, "appendTailCounts": Counter(), "handoffsOver20ms": 0,
                       "sqlSpanLinks": Counter(), "appendsWithMatchedPgCommit": 0,
                       "appendsWithWalSync": 0, "pricedAppends": 0}
    joined = directory / "append-tail.ndjson"
    with joined.open("x") as file:
        for r in append_calls:
            meta = application.get((r["start"], r["end"]))
            labels = {cells_by_t[m["t"]] for m in meta["members"] if m["t"] in cells_by_t} if meta else set()
            assert len(labels) <= 1
            label = next(iter(labels), None)
            event = append_record(r, meta, label, indexes, backend_map, (marks["START"], marks["STOP"]),
                                  pauses, writebacks, prior)
            if label:
                row = cells[label]
                assert event["pgProbeCovered"]
                row["pricedAppends"] += 1
                row["appendsWithMatchedPgCommit"] += bool(event["pgCommitNs"])
                row["appendsWithWalSync"] += bool(event["overlapNs"]["wal-sync"])
                row["sqlSpanLinks"].update(span["link"] for span in event["sql"])
                row["handoffsOver20ms"] += bool(event["longHandoff"])
                if event["longAppend"]:
                    row["appendTailCounts"][event["longAppend"]] += 1
            print(json.dumps(event, separators=(",", ":")), file=file)
    assert all(row["pricedAppends"] == row["appends"] for row in cells.values())
    assert all(row["orderedPrepared"] > 0 for row in cells.values()), "No ordered saves in a measured cell"
    assert all(row["appendsWithMatchedPgCommit"] for row in cells.values()), "Missing append-to-PG backend join in a cell"
    with (directory / "tail-summary.tmp").open("x") as output:
        json.dump({"source": header["commit"], "slot": header["slot"], "nonce": header["nonce"],
                   "arm": header["arm"], "durationThresholdMs": 20, "cells": list(cells.values()),
                   "seedSha": standard["seedSha"], "dumpSha": standard["dumpSha"], "planSha": standard["planSha"],
                   "clock": "CLOCK_MONOTONIC", "probeEvents": count, "checkpoints": checkpoints,
                   "safepoints": converted, "walCounters": wal_delta,
                   "rawSha256": {**standard["rawSha256"], **terminal["files"], **{
                       p.name: observer.sha(p) for p in (joined, stack_path, restore, directory/"sentinel.json",
                         directory/"observer-end.json", directory/"pg-settings.json", directory/"pg-before.json",
                         directory/"pg-after.json", directory/"postgres.log", config/"java-image.txt", *mount_proof,
                         *([config/"tail-tx-image.txt"] if header["arm"]["tail"] == "zgc" else []))}}}, output)
        output.write("\n")


if __name__ == "__main__":
    collect(*map(Path, sys.argv[1:]))

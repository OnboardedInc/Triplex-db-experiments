"""Reopen the copied PREP1 campaign prefix and report only witnessed clocks."""
import collections
import hashlib
import json
import math
from pathlib import Path
import statistics
import sys
import tarfile

SOURCE = "7ca8525a9ea0c3810c7af6ba0b5a0e15552dd534"
ARCHIVE = "55efa10fd2c44689ceb5d09db2cd20906150d03d66a42a75c6c42d009ef89b90"
DURATION = 144


def digest(stream):
    return hashlib.file_digest(stream, "sha256").hexdigest()


def stats(values):
    ordered = sorted(values)
    if not ordered:
        return None
    return {"p50": statistics.median(ordered), "p90": ordered[math.ceil(len(ordered)*.90)-1],
            "p99": ordered[math.ceil(len(ordered)*.99)-1], "mean": statistics.mean(ordered), "max": ordered[-1]}


def phases(root, arm, header, plan, members, official):
    armed = next(a for a in plan["arms"] if a["id"] == arm)
    assert {k: armed[k] for k in ("id", "writer", "writers", "reverse")} == header["arm"]
    cut = header["head"]
    result, missing = {}, []
    for cell in armed["cells"]:
        label = cell["label"]
        path = root / arm / (label + ".json")
        if f"{arm}/{path.name}" not in members:
            missing.append(label)
            continue
        assert not missing, "unbound suffix after missing cell"
        raw = path.read_bytes()
        if official:
            assert hashlib.sha256(raw).hexdigest() == official["rawSha256"][path.name]
        c = json.loads(raw)
        assert (c["head"], c["label"], c["seconds"], c["rate"], c["tapeSha"]) == (
            cut, label, DURATION, cell["rate"], cell["tapeSha"])
        rows = sorted(c["rows"], key=lambda r: r["ordinal"])
        assert len(rows) == cell["offered"] == len(plan["tapes"][label])
        assert len({r["id"] for r in rows}) == len(rows)
        for i, (r, offer) in enumerate(zip(rows, plan["tapes"][label], strict=True)):
            assert (r["ordinal"], r["id"], r["due"], r["account"], r["person"]) == (
                i, f"{label}-{i}", offer[0], offer[1], offer[2])
            if "sent" in r:
                assert r["due"] <= r["sent"] <= r["end"]
        receipts = sorted((r["receipt"]["p"], r["receipt"]["clock"]) for r in rows if "receipt" in r)
        assert [p for p, _ in receipts] == list(range(cut+1, c["after"]+1))
        assert all(x[1] < y[1] for x, y in zip(receipts, receipts[1:]))
        cut = c["after"]
        done = [r for r in rows if "ack" in r]
        grouped = collections.defaultdict(list)
        for r in done:
            a, receipt = r["ack"], r["receipt"]
            assert (a["operationId"], int(a["position"]["v"]), a["t"]["v"], a["recordedAt"]["v"]) == (
                r["id"], receipt["p"], receipt["t"], receipt["clock"])
            grouped[receipt["t"]].append(r)
            if arm.endswith("S") and a.get("subjectSave"):
                assert a["subjectSave"] == header["options"][r["peer"]]["subjectFunction"]
        per_save, per_tx = collections.defaultdict(list), collections.defaultdict(list)
        per_bin, per_clock = collections.defaultdict(collections.Counter), collections.defaultdict(list)
        for group in grouped.values():
            a = group[0]["ack"]
            width = a.get("groupSize", 1)
            assert width >= len(group)
            assert all(x["ack"].get("groupSize", 1) == width and
                       x["ack"]["nativeComputeMs"] == a["nativeComputeMs"] and
                       x["ack"]["nativeIoStats"] == a["nativeIoStats"] for x in group)
            reads = a.get("nativeIoStats", {}).get("reads", {})
            metrics = {"compute": a["nativeComputeMs"], "sql": reads.get("sql", 0),
                       "decode": reads.get("deserialize-ms", 0), "sqlMs": reads.get("sql-ms", 0),
                       "avetLoad": reads.get("avet-load", 0), "datoms": a["datoms"], "group": width}
            for key, value in metrics.items():
                per_tx[key].append(value)
                if key != "group":
                    per_save[key].extend([value / width] * len(group))
        for r in done:
            a = r["ack"]
            elapsed = r["end"]-r["due"]
            slot = int(r["due"]//1000)
            per_bin[slot]["acked"] += 1
            for threshold in (100, 250, 500, 1000):
                per_bin[slot][f">{threshold}"] += elapsed > threshold
            ready = a.get("readyToNativeEntryMs")
            for key, value in {
                "e2e": elapsed, "quiet": elapsed if r["account"] == 0 else None,
                "senderQueue": r["sent"]-r["due"], "httpRoundTrip": r["end"]-r["sent"],
                "readyToNative": ready, "submitToNative": a.get("submitToNativeEntryMs"),
                "tailReadyToNative": ready if elapsed > 1000 else None,
                "tailCompute": a["nativeComputeMs"] if elapsed > 1000 else None,
                "tailSql": a["nativeIoStats"]["reads"].get("sql", 0) if elapsed > 1000 else None,
            }.items():
                if value is not None:
                    per_clock[key].append(value)
        if official:
            witness = next(w for w in official["cells"] if w["cell"] == label)
            assert (len(rows), len(receipts), len(rows)-len(done)) == (
                witness["offered"], witness["durable"], witness["missingAcks"])
        by_account = {i: stats([r["end"]-r["due"] for r in done if r["account"] == i])
                      for i in set(r["account"] for r in rows)}
        counts = collections.Counter(r.get("reason", "acked") for r in rows)
        result[label] = {
            "offered": len(rows), "sent": sum("sent" in r for r in rows), "durable": len(receipts), "acked": len(done),
            "inside": sum(r["end"] <= 144000 for r in done), "nativeT": len({r["receipt"]["t"] for r in rows if "receipt" in r}),
            "insideNativeT": len({r["receipt"]["t"] for r in done if r["end"] <= 144000}),
            "prepared": sum(bool(r["ack"].get("subjectSave")) for r in done),
            "replans": sum(bool(r["ack"].get("subjectReplan")) for r in done),
            "sqlPositiveTx": sum(v > 0 for v in per_tx["sql"]),
            "reasons": counts, "phaseWallMs": c["phaseWallMs"], "drained": c["drained"], "after": cut,
            "perSave": {k:stats(v) for k,v in per_save.items()}, "perTx": {k:stats(v) for k,v in per_tx.items()},
            "clocks": {k: stats(v) for k,v in per_clock.items()}, "byAccount": by_account,
            "secondsBins": per_bin,
            "officialNative": {k:witness[k] for k in ("appends","savesPerAppend","appendP99Ms","stageP99Ms")} if official else None,
        }
    return result, missing


def inspect(root):
    archive = root / "arms-K-and-S-partial.tar.zst"
    with archive.open("rb") as stream:
        sha = digest(stream)
    assert sha == ARCHIVE
    members = {}
    with tarfile.open(archive, "r|zst") as tar:
        for item in tar:
            if not item.isfile():
                continue
            name = Path(item.name)
            assert not name.is_absolute() and ".." not in name.parts and item.name not in members
            with tar.extractfile(item) as member, (root / name).open("rb") as row:
                members[item.name] = digest(member)
                assert members[item.name] == digest(row)
    plan, seed = (json.loads((root / p).read_bytes()) for p in ("plan.json", "seed.json"))
    assert plan["seconds"] == DURATION and seed["facts"] == 16_245_050 and len(seed["seeds"]) == 10
    report = {"archiveSha256": sha, "members": members, "campaignSource": SOURCE, "arms": {}}
    for arm in ("1-0-K", "1-1-S"):
        directory = root / arm
        head = json.loads((directory / "header.json").read_bytes())
        option, = head["options"]
        assert head["seconds"] == DURATION and head["commit"] == SOURCE
        assert (head["head"], head["db"], head["scope"], head["seedSha"]) == (
            seed["head"], seed["db"], seed["scope"], members["seed.json"])
        assert (option["attempt"], option["database"], option["position"], option["gatewaySourceHash"]) == (
            head["nonce"], head["db"], head["head"], head["gatewaySource"])
        assert bool(option.get("subjectSave")) == arm.endswith("S") and option["commitFunctionInstalled"]
        assert option["options"]["groupCommit"] == arm.endswith("K")
        summary = directory / "summary.json"
        official = json.loads(summary.read_bytes()) if f"{arm}/summary.json" in members else None
        if official:
            complete = json.loads((directory / "complete.json").read_bytes())
            assert all(head[k] == complete[k] for k in ("commit", "slot", "nonce"))
            assert official["source"] == SOURCE and official["planSha"] == members["plan.json"]
            assert official["nonce"] == head["nonce"] and official["slot"] == head["slot"]
            for name in ("header.json", "complete.json"):
                assert official["rawSha256"][name] == members[f"{arm}/{name}"]
        cells, missing = phases(root, arm, head, plan, members, official)
        if official:
            assert not missing and complete["cut"] == list(cells.values())[-1]["after"]
        report["arms"][arm] = {"nonce": head["nonce"], "slot": head["slot"], "cells": cells,
                               "missingCells": missing, "terminalSummary": bool(official)}
    report["copiedPauseLogs"] = [name for name in members if "prep1-gc-" in name]
    report["copiedAppendTraces"] = [name for name in members if "prep1-native.ndjson" in name]
    return report


if __name__ == "__main__":
    assert __debug__
    result = inspect(Path(sys.argv[1]))
    with Path(sys.argv[2]).open("x") as stream:
        json.dump(result, stream, indent=2)
        stream.write("\n")

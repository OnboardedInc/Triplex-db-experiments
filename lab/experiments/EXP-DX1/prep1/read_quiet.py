"""Recount the quiet-account tail from the sealed ordered-S campaign."""
import datetime
import hashlib
import json
import math
import re
import subprocess
import sys
from pathlib import Path


def read(path):
    return json.loads(path.read_bytes())


def sha(path):
    with path.open("rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def p99(xs):
    return sorted(xs)[math.ceil(.99 * len(xs)) - 1]


def safepoints(data):
    for line in data.decode().splitlines():
        match = re.search(r"^\[([^\]]+)\].* Safepoint \"([^\"]+)\",.* Total: (\d+) ns", line)
        if match:
            at, kind, duration = match.groups()
            stop = datetime.datetime.fromisoformat(at).timestamp() * 1000
            yield (stop - int(duration) / 1e6, stop, kind)


def sealed_log(path, wanted):
    # [DX-PREP1] Why: an archived JVM log can have shutdown lines after the collector bound its prefix.
    # Rejected: trusting a later log with a mismatched prefix.
    data, digest, length = path.read_bytes(), hashlib.sha256(), 0
    for line in data.splitlines(keepends=True):
        length += len(line)
        digest.update(line)
        if digest.hexdigest() == wanted:
            return data[:length]
    raise ValueError(f"No sealed prefix for {path.name}")


def inspect(root, transfer_path, name):
    if not __debug__:
        raise RuntimeError("Run with evidence assertions on")
    transfer = read(transfer_path)
    archives = {key: transfer_path.parent / transfer[key]["name"] for key in ("summary", "raw")}
    for key, archive in archives.items():
        assert archive.stat().st_size == transfer[key]["bytes"] and sha(archive) == transfer[key]["sha256"]
    root = root / "campaign"
    arm = root / name
    ordered = name == "1-ordered-S"
    assert subprocess.check_output(["tar", "-xOf", str(archives["summary"]),
                                    f"campaign/{name}/summary.json"]) == (arm / "summary.json").read_bytes()
    header, terminal = read(arm / "header.json"), read(arm / "summary.json")
    finish = read(arm / "complete.json")
    plan = read(root / "plan.json")
    assert {header["commit"], terminal["source"], finish["commit"], transfer["producer"]} == {
        "df307c29c08a9045a4526769f5c917f66800eee4"
    }
    assert header["nonce"] == terminal["nonce"] == finish["nonce"]
    assert header["slot"] == terminal["slot"] == finish["slot"]
    trace = root / "engines" / header["slot"] / "trace" / "raw"
    roles = ["tx", "gw-w", "gw-r"]
    assert not header["fairCredits"] and not terminal["fairCredits"]
    assert header["options"][0].get("subjectOrderedIds", False) == ordered
    assert sha(root / "plan.json") == terminal["planSha"]
    cells = [m["cell"] for m in terminal["cells"]]
    expected, = [a for a in plan["arms"] if a["id"] == arm.name]
    assert [c["label"] for c in expected["cells"]] == cells
    cell_paths = [arm / (key + ".json") for key in cells]
    native_path = trace / "prep1-native.ndjson"
    gc = {role: trace / f"prep1-gc-{role}.log" for role in roles}
    checked = [*cell_paths, arm / "header.json", arm / "complete.json", native_path]
    for path in checked:
        assert sha(path) == terminal["rawSha256"][path.name]
    gc_data = {role: sealed_log(path, terminal["rawSha256"][path.name]) for role, path in gc.items()}
    pauses = {role: list(safepoints(data)) for role, data in gc_data.items()}
    assert all(pauses.values())

    native = {}
    ended = False
    for line in native_path.open():
        entry = json.loads(line)
        assert not ended and entry["attempt"] == header["nonce"]
        if entry.get("end") is True:
            assert entry["dropped"] == 0
            ended = True
            continue
        if entry["db"] != header["db"]:
            continue
        for member in entry["members"]:
            t = str(member["t"])
            assert t not in native
            assert 0 < member["read-at"] <= member["started-at"] <= member["applied-at"] <= entry["start"] <= entry["end"]
            native[t] = (member, entry)
    assert ended

    results = []
    previous_cut = header["head"]
    for path, recorded, spec in zip(cell_paths, terminal["cells"], expected["cells"], strict=True):
        cell = read(path)
        label, tasks = cell["label"], cell["rows"]
        if not ordered and label.endswith("-loaded"):
            assert previous_cut == cell["head"]
            previous_cut = cell["after"]
            continue
        tape = plan["tapes"][label]
        assert cell["head"] == previous_cut and cell["after"] == previous_cut + len(tasks)
        previous_cut = cell["after"]
        assert len(tasks) == len(tape) == spec["offered"] == recorded["durable"]
        assert cell["tapeSha"] == spec["tapeSha"]
        duration = cell["seconds"]
        phase0, wall0 = int(cell["phaseStartNs"]), cell["phaseWallMs"]
        blocks, quiet = {}, []
        for row, offer in zip(sorted(tasks, key=lambda r: r["ordinal"]), tape, strict=True):
            assert (row["due"], row["account"], row["person"]) == tuple(offer[:3])
            ack, receipt = row["ack"], row["receipt"]
            assert ack["operationId"] == row["id"] and ack["t"]["v"] == receipt["t"]
            assert int(ack["position"]["v"]) == receipt["p"] and ack["recordedAt"]["v"] == receipt["clock"]
            if ordered:
                assert receipt["journal"] == "_tx/" + row["orderedToken"] + "00"
            member, block = native[receipt["t"]]
            start, stop = [(block[key] - phase0) / 1e6 for key in ("start", "end")]
            read_at, apply_at, ready_at = [(member[key] - phase0) / 1e6 for key in ("read-at", "started-at", "applied-at")]
            assert row["sent"] <= read_at <= stop <= row["end"] + 2
            key = block["start"]
            assert key not in blocks or blocks[key] == (start, stop)
            blocks[key] = (start, stop)
            if row["account"]:
                continue
            # [DX-PREP1] Why: assign stages of the same quiet save which occupies rank 208 of 210.
            # Rejected: summing separately ranked p99s or adding overlapping JVM safepoints.
            stages = {
                "sender": row["sent"] - row["due"],
                "peerToNative": read_at - row["sent"],
                "nativeWait": apply_at - read_at,
                "nativeWork": ready_at - apply_at,
                "readyToAppend": start - ready_at,
                "append": stop - start,
                "postAppend": row["end"] - stop,
            }
            overlaps = {
                role: sum(max(0, min(qu, e) - max(ql, b)) for b, e, _ in pauses[role])
                for role in roles
                for ql, qu in [(wall0 + row["sent"], wall0 + row["end"])]
            }
            quiet.append({"id": row["id"], "due": row["due"], "end": row["end"], "stages": stages,
                          "readyAt": ready_at, "appendAt": start,
                          "gatewayParsedToSubmit": ack["timeline"]["submitted"] / 1000,
                          "gatewayAfterFuture": (ack["timeline"]["responsePrepared"] - ack["timeline"]["completed"]) / 1000,
                          "stampSubmitToNativeEntry": ack.get("submitToNativeEntryMs"),
                          "pauseOverlap": overlaps, "total": sum(stages.values())})
        quiet.sort(key=lambda row: row["total"])
        at = quiet[math.ceil(.99 * len(quiet)) - 1]
        assert len(quiet) == 210 and math.isclose(at["total"], recorded["accountP99Ms"]["0"])
        assert len(blocks) == recorded["appends"]
        windows = sorted(blocks.values())
        for row in quiet[-3:]:
            row["priorAppendsDuringWait"] = sum(
                max(0, min(row["appendAt"], stop) - max(row["readyAt"], start))
                for start, stop in windows if start < row["appendAt"] and stop > row["readyAt"]
            )
        appends = [e - b for b, e in windows]
        assert math.isclose(p99(appends), recorded["appendP99Ms"])
        gaps = [b2 - b1 for (b1, _), (b2, _) in zip(windows, windows[1:])]
        results.append({"cell": label, "quietP99": at, "threeSlowest": quiet[-3:],
                        "quietSteadyP99": p99([q["total"] for q in quiet if q["due"] >= 5000]),
                        "quietFirst5sP99": p99([q["total"] for q in quiet if q["due"] < 5000]),
                        "appends": len(windows), "appendsPerSecond": sum(0 <= t < duration * 1000 for t, _ in windows) / duration,
                        "savesPerAppend": len(tasks) / len(windows),
                        "appendP50": sorted(appends)[len(appends)//2], "appendP99": p99(appends), "appendMax": max(appends),
                        "appendGapP99": p99(gaps), "appendGapMax": max(gaps),
                        "pauseMaxMs": {role: max((e-b for b, e, _ in pauses[role]
                                                 if b < wall0+duration*1000 and e >= wall0), default=0)
                                        for role in roles}})
    assert finish["cut"] == previous_cut
    return {"head": header["commit"], "attempt": header["nonce"], "slot": header["slot"],
            "archives": {k: transfer[k]["sha256"] for k in ("summary", "raw")},
            "bound": {path.name: sha(path) for path in checked + list(gc.values())},
            "pauseLogBytes": {role: len(data) for role, data in gc_data.items()}, "cells": results}


if __name__ == "__main__":
    json.dump(inspect(Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]), sys.stdout, indent=2)
    print()

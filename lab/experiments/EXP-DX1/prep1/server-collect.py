"""Join one prepared-writer arm's offered tape, checked journal receipts and native append trace."""

import collections
import hashlib
import json
import math
import re
import sys
from pathlib import Path


def read(path):
    return json.loads(path.read_bytes())


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def p99(xs):
    return sorted(xs)[math.ceil(len(xs) * .99) - 1] if xs else None


def collect(plan_path, directory, native_path, allow_fixture=False):
    if not __debug__:
        raise RuntimeError("Assertions must remain enabled for evidence binding")
    plan, header, complete = (read(p) for p in (plan_path, directory / "header.json", directory / "complete.json"))
    fixture = header.get("fixture", False)
    assert fixture == allow_fixture
    for key in ("nonce", "slot", "commit"):
        assert complete[key] == header[key]
    arm = next(a for a in plan["arms"] if a["id"] == header["arm"]["id"])
    assert {k: arm[k] for k in ("id", "writers", "writer", "reverse")} == header["arm"]
    assert plan["seconds"] == header["seconds"]
    fair_credits = header.get("fairCredits", 0)
    assert fair_credits in (0, 1, 2, 6) and (not fair_credits or arm["writer"] == "S")
    assert fair_credits == (plan.get("fairCredits", 0) if arm["writer"] == "S" else 0)
    roles = ["tx", "gw-r", "gw-w"] + [f"gw-w{i}" for i in range(2, arm["writers"] + 1)]
    if not fixture:
        assert header["seconds"] == 144
        assert re.fullmatch(r"[0-9a-f]{40}", header["commit"])
        for key in ("seedSha", "dumpSha", "gatewaySource"):
            assert re.fullmatch(r"[0-9a-f]{64}", header[key])
        seal = {name: digest for digest, name in (line.split() for line in
                (directory.parent / "SEAL.sha256").read_text().splitlines())}
        assert header["seedSha"] == seal["seed.json"] == sha(directory.parent / "seed.json")
        assert header["dumpSha"] == seal["seed.pgdump"]
        assert seal["plan.json"] == sha(plan_path)
        stack = read(native_path.parents[2] / "stack.json")
        assert stack["prefix"] == header["slot"]
        assert stack["gatewaySourceSha256"] == header["gatewaySource"]
        assert all(stack["durability"][k] == "on" for k in ("fsync", "synchronous_commit", "full_page_writes"))
        assert len(header["options"]) == arm["writers"]
        for option in header["options"]:
            assert option["database"] == header["db"] and option["position"] == header["head"]
            assert option["attempt"] == header["nonce"] and option["gatewaySourceHash"] == header["gatewaySource"]
            assert bool(option.get("subjectSave")) == (arm["writer"] == "S")
            assert option["options"]["groupCommit"] == (arm["writer"] == "K")
        assert re.fullmatch(r"[0-9a-f-]{36}", (directory / "boot-id").read_text().strip())
        for role in roles:
            assert (native_path.parent / f"prep1-gc-{role}.log").stat().st_size > 0
            assert (native_path.parent / f"{role}-native-settings.json").stat().st_size > 0

    native, end, block_no = {}, False, 0
    with native_path.open() as file:
        for raw in file:
            row = json.loads(raw)
            assert not end and row["attempt"] == header["nonce"]
            if row.get("end") is True:
                assert row["dropped"] == 0
                end = True
                continue
            if row["db"] != header["db"]:
                continue
            assert len(row["members"]) == len(row["bytes"]) > 0
            assert row["start"] <= row["end"]
            block_no += 1
            for member, size in zip(row["members"], row["bytes"], strict=True):
                assert size > 0 and member["read-at"] <= member["started-at"] <= member["applied-at"] <= row["start"]
                t = str(member["t"])
                assert t not in native
                native[t] = (block_no, row, member)
    assert end

    metrics, used_native, cut, last_clock, last_turn = [], set(), header["head"], -math.inf, 0
    for expected in arm["cells"]:
        label = expected["label"]
        result = read(directory / (label + ".json"))
        tape = plan["tapes"][label]
        assert result["label"] == label and result["rate"] == expected["rate"]
        assert result["head"] == cut and result["seconds"] == header["seconds"]
        assert expected["tapeSha"] == result["tapeSha"]
        assert len(tape) == len(result["rows"]) == expected["offered"]
        rows = sorted(result["rows"], key=lambda r: r["ordinal"])
        times, counts, block_ids, joined = collections.defaultdict(list), collections.Counter(), set(), set()
        in_window, stages_by_save, flush_ms = 0, collections.defaultdict(list), {}
        turns = collections.defaultdict(list)
        turn_appends = collections.defaultdict(set)
        prepared = 0
        for i, (r, offer) in enumerate(zip(rows, tape, strict=True)):
            assert (r["ordinal"], r["id"], r["due"], r["account"], r["person"]) == (
                i, f"{label}-{i}", offer[0], offer[1], offer[2])
            counts[r["account"]] += 1
            if "sent" in r:
                assert r["sent"] >= r["due"] and r["end"] >= r["sent"]
                assert 0 <= r["peer"] < arm["writers"]
                if fair_credits:
                    turns[r["fairTurn"]].append(r)
            ack, receipt = r.get("ack"), r.get("receipt")
            if ack:
                assert receipt and not r.get("reason")
                assert (ack["operationId"], int(ack["position"]["v"]), ack["t"]["v"], ack["recordedAt"]["v"]) == (
                    r["id"], receipt["p"], receipt["t"], receipt["clock"])
                stages = ack["timeline"]
                assert stages["payloadPrepared"] <= stages["completed"] <= stages["responsePrepared"]
                stages_by_save["senderQueue"].append(r["sent"] - r["due"])
                stages_by_save["httpRoundTrip"].append(r["end"] - r["sent"])
                if ack.get("nativeComputeMs") is not None:
                    stages_by_save["nativeCompute"].append(ack["nativeComputeMs"])
                if ack.get("subjectSave"):
                    assert arm["writer"] == "S" and ack["subjectSave"] == ack["writePath"]["function"]
                    if not fixture:
                        assert ack["subjectSave"] == header["options"][r["peer"]]["subjectFunction"]
                    prepared += 1
                times[r["account"]].append(r["end"] - r["due"])
                in_window += int(r["end"] <= result["seconds"] * 1000)
            else:
                assert r.get("reason")
            if receipt:
                block, chunk, member = native[receipt["t"]]
                assert int(result["phaseStartNs"]) <= member["started-at"]
                if not fixture and ack:
                    assert chunk["end"] <= int(result["phaseStartNs"]) + math.ceil(r["end"] * 1e6) + 100000
                stages_by_save["nativeWork"].append((member["applied-at"] - member["started-at"]) / 1e6)
                stages_by_save["nativeReadyToAppend"].append((chunk["start"] - member["applied-at"]) / 1e6)
                flush_ms[block] = (chunk["end"] - chunk["start"]) / 1e6
                if fair_credits:
                    turn_appends[r["fairTurn"]].add(block)
                joined.add(receipt["t"])
                block_ids.add(block)
        assert used_native.isdisjoint(joined)
        used_native.update(joined)
        positions = sorted((r["receipt"]["p"], r["receipt"]["clock"]) for r in rows if r.get("receipt"))
        for pos, clock in positions:
            assert pos == cut + 1 and clock > last_clock
            cut, last_clock = pos, clock
        assert cut == result["after"]
        last_reply = -math.inf
        for turn, members in sorted(turns.items()):
            assert turn == last_turn + 1 and len(members) <= fair_credits
            assert min(r["sent"] for r in members) >= last_reply
            last_reply = max(r["end"] for r in members)
            last_turn = turn
        pair = {a: p99(times[a]) if counts[a] == len(times[a]) else None for a in counts}
        metrics.append({"cell": label, "offered": len(rows), "durable": len(positions), "inWindow": in_window,
                        "confirmedPerSecond": in_window / result["seconds"], "prepared": prepared,
                        "replans": sum(bool(r.get("ack", {}).get("subjectReplan")) for r in rows if r.get("ack")),
                        "missingAcks": sum(counts.values()) - sum(map(len, times.values())),
                        "outcomes": dict(collections.Counter(r.get("reason", "acked") for r in rows)),
                        "accountP99Ms": pair, "completedOnlyP99Ms": {a: p99(times[a]) for a in counts},
                        "stageP99Ms": {key: p99(samples) for key, samples in stages_by_save.items()},
                        "appendP99Ms": p99(list(flush_ms.values())),
                        "fairTurns": len(turns), "maxAppendsPerTurn": max(map(len, turn_appends.values()), default=0),
                        "nativeT": len(joined), "appends": len(block_ids),
                        "savesPerAppend": len(positions) / len(block_ids) if block_ids else None,
                        "drainMs": max(0, result["drained"] - result["seconds"] * 1000)})
    assert complete["cut"] == cut
    for m in metrics:
        if m["cell"].endswith("-loaded"):
            key = m["cell"].removesuffix("-loaded")
            alone = next(x for x in metrics if x["cell"] == key + "-alone")["accountP99Ms"][0]
            loaded = m["accountP99Ms"][0]
            m["quietP99Ratio"] = loaded / alone if loaded is not None and alone else None

    kept = [directory / "header.json", directory / "complete.json", native_path]
    kept.extend(directory / (m["cell"] + ".json") for m in metrics)
    if not fixture:
        kept.extend(native_path.parent / f"prep1-gc-{role}.log" for role in roles)
        kept.extend(native_path.parent / f"{role}-native-settings.json" for role in roles)
    return {"fixture": fixture, "source": header["commit"], "nonce": header["nonce"], "slot": header["slot"],
            "seedSha": header["seedSha"], "dumpSha": header["dumpSha"], "planSha": sha(plan_path),
            "fairCredits": fair_credits,
            "rawSha256": {path.name: sha(path) for path in kept}, "cells": metrics}


if __name__ == "__main__":
    assert len(sys.argv) in (4, 5) and (len(sys.argv) == 4 or sys.argv[4] == "--fixture")
    json.dump(collect(*(Path(arg) for arg in sys.argv[1:4]), allow_fixture=len(sys.argv) == 5), sys.stdout)
    print()

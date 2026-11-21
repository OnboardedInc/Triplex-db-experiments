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
    assert {k: v for k, v in arm.items() if k != "cells"} == header["arm"]
    assert plan["seconds"] == header["seconds"]
    campaign = plan.get("campaign", "comparison")
    assert campaign in ("comparison", "fair", "owner", "storage", "storage-ordered")
    storage = campaign in ("storage", "storage-ordered")
    ordered_ids = arm.get("orderedIds", False)
    followup = campaign != "comparison"
    fair_credits = header.get("fairCredits", 0)
    assert fair_credits in (0, 1, 2, 6) and (not fair_credits or arm["writer"] == "S")
    assert fair_credits == (arm.get("credits", plan.get("fairCredits", 0)) if arm["writer"] == "S" else 0)
    if campaign == "fair":
        assert [(a["id"], a["writers"], a["writer"], a["reverse"], a["credits"]) for a in plan["arms"]] == [
            ("1-off-S", 1, "S", False, 0), ("1-on-S", 1, "S", False, 1),
            ("2-on-S", 2, "S", True, 1), ("2-off-S", 2, "S", True, 0),
        ]
    if campaign == "owner":
        assert [(a["id"], a["writers"], a["writer"], a["reverse"], a["numericOwner"])
                for a in plan["arms"]] == [
            ("1-group-K", 1, "K", False, False), ("1-old-S", 1, "S", False, False),
            ("1-fixed-S", 1, "S", False, True),
        ]
        assert fair_credits == 0
    if storage:
        controls = [
            ("1-group-K", 1, "K", False, False, False, 2, False),
            ("1-old-S", 1, "S", False, False, False, 2, False),
            ("1-fixed-S", 1, "S", False, True, False, 2, False),
            ("1-prefetch-S", 1, "S", False, True, True, 2, False),
            ("1-cache-S", 1, "S", False, False, False, 16, False),
        ]
        ordered_arm = ("1-ordered-S", 1, "S", False, True, False, 2, True)
        expected_arms = controls + [ordered_arm] if campaign == "storage" else [ordered_arm]
        assert [(a["id"], a["writers"], a["writer"], a["reverse"], a["numericOwner"], a["prefetch"],
                 a["cacheGiB"], a.get("orderedIds", False)) for a in plan["arms"]] == expected_arms
        assert fair_credits == 0
    if followup:
        phases = ("loaded", "alone") if arm["reverse"] else ("alone", "loaded")
        assert [(c["label"], c["rate"], c["offered"]) for c in arm["cells"]] == [
            (f"r{rate}-{phase}", rate, round((3.5 if phase == "alone" else rate) * plan["seconds"]))
            for rate in (235, 394) for phase in phases
        ]
    roles = ["tx", "gw-r", "gw-w"] + [f"gw-w{i}" for i in range(2, arm["writers"] + 1)]
    if not fixture:
        assert header["seconds"] == (60 if followup else 144)
        assert re.fullmatch(r"[0-9a-f]{40}", header["commit"])
        for key in ("seedSha", "dumpSha", "gatewaySource"):
            assert re.fullmatch(r"[0-9a-f]{64}", header[key])
        seal = {name: digest for digest, name in (line.split() for line in
                (directory.parent / "SEAL.sha256").read_text().splitlines())}
        assert header["seedSha"] == seal["seed.json"] == sha(directory.parent / "seed.json")
        assert header["dumpSha"] == seal["seed.pgdump"]
        assert seal["plan.json"] == sha(plan_path)
        if followup:
            # [DX-PREP1] Why: bind each mode to the earlier immutable seed and this fresh source.
            # Rejected: comparing two restores merely because they name the same population.
            original = (directory.parent / "comparison.SEAL.sha256").read_text().splitlines()
            assert len(original) == 3 and all(re.fullmatch(r"[a-f0-9]{64}  " + re.escape(name), line)
                for line, name in zip(original, ("seed.json", "seed.pgdump", "plan.json"), strict=True))
            assert original[:2] == [
                seal[name] + "  " + name for name in ("seed.json", "seed.pgdump")
            ]
            assert header["commit"] == (directory.parent / "source").read_text().strip()
        stack = read(native_path.parents[2] / "stack.json")
        assert stack["prefix"] == header["slot"]
        assert stack["gatewaySourceSha256"] == header["gatewaySource"]
        assert all(stack["durability"][k] == "on" for k in ("fsync", "synchronous_commit", "full_page_writes"))
        assert len(header["options"]) == arm["writers"]
        for option in header["options"]:
            assert option["database"] == header["db"] and option["position"] == header["head"]
            assert option["attempt"] == header["nonce"] and option["gatewaySourceHash"] == header["gatewaySource"]
            assert bool(option.get("subjectSave")) == (arm["writer"] == "S")
            assert bool(option.get("subjectNumericOwner")) == bool(arm.get("numericOwner"))
            assert bool(option.get("subjectPrefetch")) == bool(arm.get("prefetch"))
            assert option.get("subjectOrderedIds", False) == ordered_ids
            assert option["options"]["groupCommit"] == (arm["writer"] == "K")
            if arm["writer"] == "S":
                assert re.fullmatch(r":triplex\.subject/v-[0-9a-f]{24}", option["subjectFunction"])
                assert re.fullmatch(r"[1-9][0-9]*", option["subjectFunctionTx"])
        assert re.fullmatch(r"[0-9a-f-]{36}", (directory / "boot-id").read_text().strip())
        for role in roles:
            assert (native_path.parent / f"prep1-gc-{role}.log").stat().st_size > 0
            assert (native_path.parent / f"{role}-native-settings.json").stat().st_size > 0
        if storage:
            tx_jvm = read(native_path.parent / "tx-native-settings.json")
            assert (tx_jvm["run"], tx_jvm["slot"], tx_jvm["source"], tx_jvm["process"]) == (
                header["slot"], header["slot"], header["commit"], "tx")
            assert tx_jvm["jvm"]["objectCacheMax"] == f'{arm["cacheGiB"]}g'
            assert tx_jvm["jvm"]["prefetchProbes"] == "true" and tx_jvm["jvm"]["prefetchEnabled"] is True
            assert 23 << 30 <= tx_jvm["jvm"]["maxHeapBytes"] <= 24 << 30
            tx_container, = [container for container in stack["containers"] if container["name"] == header["slot"] + "-tx"]
            assert tx_container["memory"] == 30 << 30

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
    ordered_tokens = set()
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
        prepared, hinted = 0, 0
        ordered_before = len(ordered_tokens)
        native_io = collections.defaultdict(list)
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
            token = r.get("orderedToken")
            assert bool(token) == (ordered_ids and "sent" in r)
            if token:
                # [DX-PREP1] Why: verify the producer's allocated token against the journal actually read.
                # Rejected: accepting an ordered-writer flag without binding it to the submitted identity.
                assert re.fullmatch(r"[0-7][0-9A-HJKMNP-TV-Z]{23}", token) and token not in ordered_tokens
                ordered_tokens.add(token)
                if receipt:
                    assert receipt["journal"] == "_tx/" + token + "00"
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
                if "subjectHintsStarted" in stages:
                    assert arm.get("prefetch")
                    assert stages["payloadPrepared"] <= stages["subjectHintsStarted"] <= stages["subjectHintsFinished"] <= stages["submitted"]
                    stages_by_save["hintPreparationMs"].append((stages["subjectHintsFinished"] - stages["subjectHintsStarted"]) / 1000)
                if ack.get("subjectHintsAttached"):
                    assert arm.get("prefetch") and ack.get("subjectSave") and "subjectHintsFinished" in stages
                    hinted += 1
                if storage and not fixture:
                    reads = ack["nativeIoStats"]["reads"]
                    width = ack.get("groupSize", 1)
                    assert 1 <= width <= 8
                    native_io["applyMs"].append(ack["nativeComputeMs"] / width)
                    for counter in ("sql", "sql-ms", "deserialize-ms", "eavt-load", "aevt-load", "avet-load"):
                        native_io[counter].append(reads.get(counter, 0) / width)
                if ack.get("subjectSave"):
                    assert arm["writer"] == "S" and ack["subjectSave"] == ack["writePath"]["function"]
                    if not fixture:
                        assert ack["subjectSave"] == header["options"][r["peer"]]["subjectFunction"]
                    prepared += 1
                assert ack.get("subjectOrderedIds", False) == (ordered_ids and bool(ack.get("subjectSave")))
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
        if followup and fair_credits:
            assert all(len(blocks) == 1 for blocks in turn_appends.values())
        pair = {a: p99(times[a]) if counts[a] == len(times[a]) else None for a in counts}
        metrics.append({"cell": label, "offered": len(rows), "durable": len(positions), "inWindow": in_window,
                        "confirmedPerSecond": in_window / result["seconds"], "prepared": prepared,
                        "replans": sum(bool(r.get("ack", {}).get("subjectReplan")) for r in rows if r.get("ack")),
                        "missingAcks": sum(counts.values()) - sum(map(len, times.values())),
                        "outcomes": dict(collections.Counter(r.get("reason", "acked") for r in rows)),
                        "accountP99Ms": pair, "completedOnlyP99Ms": {a: p99(times[a]) for a in counts},
                        "worstAccountP99Ms": max(pair.values()) if all(v is not None for v in pair.values()) else None,
                        "stageP99Ms": {key: p99(samples) for key, samples in stages_by_save.items()},
                        "hintsAttached": hinted,
                        "orderedSubmitted": len(ordered_tokens) - ordered_before,
                        "orderedPrepared": prepared if ordered_ids else 0,
                        "nativeIoPerSave": {key: {"mean": sum(samples) / len(samples), "p99": p99(samples)}
                                            for key, samples in native_io.items()},
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
        if followup:
            kept.extend(directory.parent / name for name in ("comparison.SEAL.sha256", "SEAL.sha256", "source"))
    return {"fixture": fixture, "source": header["commit"], "nonce": header["nonce"], "slot": header["slot"],
            "seedSha": header["seedSha"], "dumpSha": header["dumpSha"], "planSha": sha(plan_path),
            "fairCredits": fair_credits, "numericOwner": bool(arm.get("numericOwner")),
            "prefetch": bool(arm.get("prefetch")), "cacheGiB": arm.get("cacheGiB"), "orderedIds": ordered_ids,
            "rawSha256": {path.name: sha(path) for path in kept}, "cells": metrics}


if __name__ == "__main__":
    assert len(sys.argv) in (4, 5) and (len(sys.argv) == 4 or sys.argv[4] == "--fixture")
    json.dump(collect(*(Path(arg) for arg in sys.argv[1:4]), allow_fixture=len(sys.argv) == 5), sys.stdout)
    print()

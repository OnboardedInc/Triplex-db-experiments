"""Join each diagnostic receipt to the native apply in the same restored arm."""

import hashlib
import json
import math
import os
import statistics
import sys
from collections import defaultdict
from pathlib import Path


def read(file):
    return json.loads(file.read_text())


def events(file, attempt):
    terminal = False
    with file.open() as stream:
        for line in stream:
            event = json.loads(line)
            assert not terminal and event["attempt"] == attempt
            if event.get("end") is True:
                assert event == {"attempt": attempt, "end": True, "dropped": 0}
                terminal = True
            else:
                yield event
    assert terminal, file


def dist(xs):
    xs = sorted(xs)
    assert len(xs) > 0
    return {"mean": statistics.mean(xs), "p99": xs[math.ceil(0.99 * len(xs)) - 1]}


def summarize(root, slot, attempt, source, age, credit_mode):
    run = read(root / "attempt.json")
    assert (run["slot"], run["attempt"], run["source"]) == (slot, attempt, source)
    trace = root / "engines" / slot / "trace/raw"
    joins = {}
    for block in events(trace / "prep1-native.ndjson", attempt):
        for row in block["members"]:
            key = (block["db"], str(row["t"]))
            assert key not in joins
            assert row["read-at"] <= row["started-at"] <= row["applied-at"] <= block["start"] <= block["end"]
            joins[key] = {**row, "durable-at": block["end"]}
    sampled = defaultdict(lambda: {"calls": 0, "sql": 0, "wallNs": 0})
    unknown = defaultdict(int)
    sample_keys, unjoined = set(), 0
    wanted_databases = set()
    output = []
    rates, seconds = ((394, 620), 300) if age == "fresh" else ((50, 235), 120)
    half_seconds = seconds // 2
    for rate in rates:
        window = root / str(rate)
        header = read(window / "arm.json")
        assert (header["slot"], header["attempt"], header["source"]) == (slot, attempt, source)
        # [DX-INT1] agedHead is the aged bundle's head on the 1 billion copy and the seed cut on the fresh copy.
        aged_head = header["retirement"].get("agedHead", header["firstCut"])
        assert header["retirement"] == {"rate": rate, "append": root.name == "append", "seconds": seconds,
                                        **({"agedHead": aged_head} if "agedHead" in header["retirement"] else {})}
        assert isinstance(aged_head, int) and aged_head <= header["firstCut"]
        assert header["settings"]["creditMode"] == credit_mode
        # [Opus W1] Why: the same summary serves the covering owner root pair (DX_W1_PAIR_OPTION=owner-head).
        treatment = "subjectOwnerHead" if os.environ.get("DX_W1_PAIR_OPTION") == "owner-head" else "subjectAppendRetirement"
        receipt_flag = "subjectOwnerHeadBytes" if treatment == "subjectOwnerHead" else "subjectAppendRetirement"
        assert bool(header["settings"]["observed"].get(treatment)) == header["retirement"]["append"]
        raw = (window / "operations.json").read_bytes()
        assert hashlib.sha256(raw).hexdigest() == header["observationsSha256"]
        ops = json.loads(raw)
        groups = ops.get("ownerGroups") or {}
        assert not groups or all(f'{e["account"]}/{e["subject"]}' in groups for e in ops["tape"])
        # [DX-W1] Why: exact tape and journal identities bind each measured ACK to this copy and window.
        # Rejected: timing native background transactions or passing empty producer output.
        assert len(ops["tape"]) == len(ops["writes"]) == rate * seconds
        feed = {row["position"]: row for row in ops["journal"]}
        saved = [row for row in ops["writes"] if row.get("receipt")]
        assert sorted(feed) == list(range(header["firstCut"] + 1, header["terminal"] + 1))
        assert len(feed) == len(saved) == len({row["receipt"]["p"] for row in saved})
        offered = {(r["account"], r["ordinal"]): r for r in ops["tape"]}
        assert len(offered) == len(ops["tape"])
        for row in ops["writes"]:
            event = offered.pop((row["account"], row["ordinal"]))
            assert (row["id"], row["subject"], row["width"], row["due"]) == (
                attempt + "-" + event["version"].replace("/", "-"), event["subject"],
                event["width"], header["start"] + event["ms"])
        assert not offered
        anchor = header["serialAnchor"]
        before, after = int(anchor["before"]), int(anchor["after"])
        assert 0 <= after - before < 10_000_000
        mid = (before + after) // 2
        durable = [(joins[(r["db"], r["receipt"]["t"])]["durable-at"], r) for r in saved]
        for at, row in durable:
            ack = row["receipt"]
            journal = feed[ack["p"]]
            assert (row["db"], row["id"], ack["tx"], ack["digest"], ack["clock"]) == (
                journal["db"], journal["id"], journal["tx"], journal["digest"], journal["clock"])
            if row["status"] == "acked":
                observed = anchor["wall"] + (at - mid) / 1_000_000
                assert row["sent"] - 2 <= observed <= row["end"] + 2
                assert bool(row["stage"].get(receipt_flag)) == header["retirement"]["append"]
        halves = []
        for half in range(2):
            lo = header["start"] + half * half_seconds * 1000
            hi = lo + half_seconds * 1000
            # [DX-W1] Why: on bare metal Node hrtime and JVM nanoTime use the same boot clock.
            # Rejected: treating the ACK or the application record clock as the durable append time.
            native_lo = mid + round((lo - anchor["wall"]) * 1_000_000)
            native_hi = native_lo + half_seconds * 1_000_000_000
            ready = [row for at, row in durable if native_lo <= at < native_hi]
            edge = (after - before) // 2 + 1000
            ambiguous = sum(min(abs(at - native_lo), abs(at - native_hi)) <= edge for at, _ in durable)
            apply, io, validate, plan = [], [], [], []
            by_group = defaultdict(list)
            for row in ready:
                ack = row["receipt"]
                key = (row["db"], ack["t"])
                native = joins[key]
                wanted_databases.add(row["db"])
                sample_keys.add(key)
                apply.append((native["applied-at"] - native["started-at"]) / 1_000_000)
                if row["status"] == "acked":
                    stage = row["stage"]
                    assert stage["subjectSave"] == header["settings"]["observed"]["subjectFunction"]
                    io.append(stage["nativeIoStats"]["reads"])
                    if groups:
                        by_group[groups[f'{row["account"]}/{row["subject"]}']].append(stage["nativeIoStats"]["reads"])
                    clocks = stage["timeline"]
                    assert 0 <= clocks["payloadValidated"] <= clocks["payloadPrepared"]
                    validate.append(clocks["payloadValidated"] / 1000)
                    plan.append((clocks["payloadPrepared"] - clocks["payloadValidated"]) / 1000)
            halves.append({"storedPerSecond": len(ready) / half_seconds, "boundaryUncertain": ambiguous,
                           "durableAckPerSecond": sum(r["status"] == "acked" and lo <= r["end"] < hi
                                                      for r in saved) / half_seconds, "applyMs": dist(apply),
                           "sqlReadsPerSave": dist(row.get("sql", 0) for row in io), "sqlSamples": len(io),
                           "indexLoadsPerSave": {index: dist(row.get(index + "-load", 0) for row in io)
                                                 for index in ("eavt", "aevt", "avet", "vaet")},
                           "validateMs": dist(validate), "planMs": dist(plan),
                           "quietAckMs": dist(row["end"] - row["due"] for row in ready if row["account"] == 0),
                           # [DX-INT1] Reads per acknowledged save for people the aging loader edited and people it did not.
                           "byOwnerGroup": {group: {"saves": len(rows), "sqlReadsPerSave": dist(r.get("sql", 0) for r in rows),
                                                    "aevtLoadsPerSave": dist(r.get("aevt-load", 0) for r in rows),
                                                    "eavtLoadsPerSave": dist(r.get("eavt-load", 0) for r in rows)}
                                            for group, rows in sorted(by_group.items())} if groups else None})
        output.append({"rate": rate, "halves": halves, "tapeSha256": header["tapeSha256"],
                       "firstCut": header["firstCut"], "terminal": header["terminal"],
                       "refusedOrExpired": len(ops["writes"]) - len(saved), "agedHead": aged_head,
                       "ownerGroupPeople": header.get("ownerGroupPeople"),
                       "pinnedRead": (ops.get("p6") or {}).get("read"),
                       # [Opus W1] Why: reads of people this window's tape saved (migrated in the owner-head arm).
                       "migratedReads": {phase: {kind: {k: (header["migratedReads"][phase][kind] or {}).get(k)
                                                        for k in ("count", "p50Ms", "p99Ms")}
                                                 for kind in ("current", "pinned")}
                                         | {"attempted": header["migratedReads"][phase]["attempted"],
                                            "errors": len(header["migratedReads"][phase]["errors"])}
                                         for phase in ("loaded", "settled")} if header.get("migratedReads") else None,
                       "function": header["settings"]["observed"]["subjectFunction"]})

    assert len(wanted_databases) == 1
    db = next(iter(wanted_databases))
    nm = 0
    for event in events(trace / "prep1-lookups.ndjson", attempt):
        assert event["kind"] == "PREP1_LOOKUPS" and event["sampleEvery"] == 64
        key = (event["db"] or db, event["t"])
        if key not in sample_keys:
            unjoined += 1
            continue
        native = joins[key]
        assert native["started-at"] <= event["start"] <= event["end"] <= native["applied-at"]
        assert event["lookupCount"] <= event["lookupLimit"]
        nm += 1
        for label, data in event["lookups"].items():
            value = sampled[label]
            value["calls"] += data["calls"]
            value["sql"] += (data.get("reads") or {}).get("sql", 0)
            value["wallNs"] += data["wallNs"]
        for stack, n in event["outsideSql"].items():
            unknown[stack] += n
    assert nm > 0
    with (root / "retirement-diagnostic.json").open("x") as stream:
        json.dump({"source": source, "slot": slot, "attempt": attempt, "age": age, "creditMode": credit_mode, "windows": output,
                   "lookupSamples": nm, "outOfWindowOrUnjoined": unjoined,
                   "lookupTotals": sampled, "outsideSql": unknown}, stream, indent=2)
        stream.write("\n")


if __name__ == "__main__":
    assert __debug__
    directory, slot, attempt, source, age, credit_mode = sys.argv[1:]
    assert age in ("fresh", "1B")
    summarize(Path(directory), slot, attempt, source, age, credit_mode)

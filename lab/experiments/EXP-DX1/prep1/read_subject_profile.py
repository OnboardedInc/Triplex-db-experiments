"""Reconcile the prepared-subject Mac comparison to the actual native log blocks."""

import base64
from collections import defaultdict
import json
from pathlib import Path
from statistics import median
import sys

from read_probe import distribution, managed_events, ms


def matched_ratios(rows):
    metrics = ("savesPerAppend", "nativeApplyMsPerSave", "nativeCpuMsPerSave", "appendMsPerSave",
               "medianPeerPreparationMs", "closedLoopSavesPerSec")
    pairs = defaultdict(lambda: {"A": [], "B": []})
    for cell in rows:
        key = (int(cell["arm"][1]), cell["width"], cell["outstanding"])
        pairs[key][cell["arm"][0]].append(cell)
    result = []
    for (peers, width, outstanding), arms in sorted(pairs.items()):
        assert len(arms["A"]) == len(arms["B"]) == 2
        ratios = {}
        for key in metrics:
            grouped, prepared = ([cell[key] for cell in arms[arm]] for arm in "AB")
            # [DX-PREP1] Why: each ratio uses both repeats from the same offer shape and peer cap.
            # Rejected: dividing two pooled medians or treating missing native CPU as zero.
            ratios[key] = (median(prepared) / median(grouped)
                           if all(value is not None for value in grouped + prepared)
                           and median(grouped) > 0 else None)
        result.append({"peers": peers, "width": width, "outstanding": outstanding,
                       "preparedOverGrouped": ratios})
    return result


def profile(root):
    if not __debug__:
        raise RuntimeError("Assertions are required for source and transaction binding")
    inputs, terminal, events = managed_events(root)
    assert inputs["mode"] == "subject-profile"
    attempt = inputs["attempt"]
    lines = (root / terminal["log"]).read_text().splitlines()
    assert inputs["timings"] == terminal["timings"] == "diagnostic"
    assert "PREP1_SQL_REPLICA streaming sync fsync=on" in lines
    native = {}
    for block in events("PREP1_NATIVE "):
        assert len(block["members"]) == len(block["bytes"])
        for i, member in enumerate(block["members"]):
            key = (block["db"], str(member["t"]))
            assert key not in native
            native[key] = (block, member, block["bytes"][i])
    cpu = {}
    for row in events("PREP1_SUBJECT_APPLY "):
        key = (row["db"], row["t"])
        if key in cpu:
            cpu[key] = None
        else:
            cpu[key] = row
    pressure = sorted(events("PREP1_CPU "), key=lambda row: row["at"])
    probes = defaultdict(list)
    for row in events("PREP1_PROBE "):
        probes[row["arm"]].append(row)
    expected_arms = [f"{cell}{peers}-{step}"
                     for step, (peers, cell) in enumerate((p, a) for p in (1, 2, 4) for a in "ABBA")]
    assert list(probes) == expected_arms
    rows = []
    for arm in expected_arms:
        observed, seed, idle, *cells, finished = probes[arm]
        assert [observed["kind"], seed["kind"], idle["kind"], finished["kind"]] == ["writers", "seed", "idle", "finished"]
        origin = seed["data"]
        expected_scope = json.loads(origin["scope"])
        assert expected_scope == ["triplex-scope-v1", "test", "prep1", f"{attempt}-{arm}", 0]
        db = "s2-" + base64.urlsafe_b64encode(origin["scope"].encode()).decode().rstrip("=")
        assert origin["db"] == finished["data"]["db"] == db
        assert idle["data"]["db"] == db and int(idle["data"]["elapsedNs"]) >= 30_000_000_000
        assert (origin["subjects"], origin["facts"], origin["position"]) == (360, 57600, 45)
        assert finished["data"]["head"] == origin["position"] + 360
        assert len(observed["data"]) == int(arm[1])
        assert all(w["database"] == db and w["position"] == 45 and bool(w.get("subjectSave")) == arm.startswith("B")
                   for w in observed["data"])
        subjects = {w["subjectFunction"] for w in observed["data"] if w.get("subjectSave")}
        for i, (cell, outstanding) in enumerate(zip(cells, (1, 1, 1, 2, 2, 2, 4, 4, 4, 6, 6, 6), strict=True)):
            assert cell["kind"] == "block"
            cell = cell["data"]
            width = 1 + i % 3
            head = origin["position"] + i * 30
            assert (cell["db"], cell["block"], cell["outstanding"], cell["width"], cell["head"]) == (db, i, outstanding, width, head)
            assert len(cell["rows"]) == 30
            assert {row["index"] for row in cell["rows"]} == set(range(30))
            applies = {}
            appends = {}
            prepared = 0
            replans = 0
            prior_clock = float("-inf")
            for j, row in enumerate(cell["rows"]):
                ack = row["ack"]
                assert ack["operationId"] == f"edit-{i * 30 + row['index']}"
                assert int(ack["position"]["v"]) == head + j + 1
                assert ack["recordedAt"]["v"] > prior_clock
                prior_clock = ack["recordedAt"]["v"]
                assert row["peer"] == row["index"] % int(arm[1])
                assert not (ack.get("subjectSave") and ack.get("subjectReplan"))
                if ack.get("subjectSave"):
                    assert ack["subjectSave"] in subjects and ack["writePath"]["function"] == ack["subjectSave"]
                    prepared += 1
                if ack.get("subjectReplan"):
                    assert arm.startswith("B")
                    replans += 1
                key = (db, ack["t"]["v"])
                append, member, nbytes = native[key]
                assert int(row["begin"]) <= member["started-at"] <= member["applied-at"] <= append["start"]
                assert append["start"] <= append["end"] <= int(row["end"])
                assert ack["datoms"] == member["datom-count"]
                applies[key] = (member, nbytes, ack.get("nativeIoStats"))
                appends[(append["start"], append["end"])] = append
            assert {member["t"] for block in appends.values() for member in block["members"]} == {
                int(t) for _, t in applies
            }
            apply_start = min(m["started-at"] for m, _, _ in applies.values())
            append_end = max(end for _, end in appends)
            cgroup = [p for p in pressure if apply_start <= p["at"] <= append_end]
            if not cgroup:
                cgroup = [min(pressure, key=lambda p: abs(p["at"] - apply_start))]
            duration = int(cell["end"]) - int(cell["start"])
            matched_cpu = [cpu.get(key) for key in applies]
            assert all(not sample or (sample["start"] <= sample["end"] and sample["cpuNs"] >= 0)
                       for sample in matched_cpu)
            rows.append({
                "arm": arm, "width": width, "outstanding": outstanding, "saves": 30,
                "firstReplyAfterIdleMs": ms(int(cell["rows"][0]["end"]) - int(cell["rows"][0]["begin"]))
                if i == 0 and cell["afterIdle"] is True else None,
                "prepared": prepared, "replanned": replans, "nativeTransactions": len(applies),
                "logAppends": len(appends), "savesPerAppend": 30 / len(appends),
                "nativeApplyMsPerSave": ms(sum(m["applied-at"] - m["started-at"] for m, _, _ in applies.values())) / 30,
                "nativeCpuMsPerSave": (ms(sum(s["cpuNs"] for s in matched_cpu)) / 30
                                        if all(matched_cpu) else None),
                "appendMsPerSave": ms(sum(end - start for start, end in appends)) / 30,
                "nativeIoByTransaction": [io for _, _, io in applies.values()],
                "meanLogBytesPerSave": sum(nbytes for _, nbytes, _ in applies.values()) / 30,
                "medianPeerPreparationMs": median(row["ack"]["timeline"]["payloadPrepared"] / 1000 for row in cell["rows"]),
                "closedLoopSavesPerSec": 30 * 1e9 / duration,
                "replyDistributionMs": distribution([ms(int(row["end"]) - int(row["begin"])) for row in cell["rows"]]),
                "cpuPressure": cgroup,
            })
    wal = {}
    for line in lines:
        if line.startswith("PREP1_SQL_WAL "):
            _, arm, edge, node, payload = line.split(maxsplit=4)
            stats = wal.setdefault((arm, node), {})
            assert edge not in stats
            stats[edge] = json.loads(payload)
    assert len(wal) == 2 * len(expected_arms)
    whole_arm_wal = {}
    for (arm, node), edges in wal.items():
        assert set(edges) == {"before", "after"} and edges["before"]["stats_reset"] == edges["after"]["stats_reset"]
        whole_arm_wal[f"{arm}/{node}"] = {k: float(edges["after"][k]) - float(edges["before"][k])
                                         for k in ("wal_sync", "wal_sync_time", "wal_write", "wal_bytes")}
    return {"attempt": attempt, "image": terminal["image"], "head": inputs["head"],
            "cells": rows, "matchedRatios": matched_ratios(rows),
            "wholeArmWalIncludingSeedReadbackAndCleanup": whole_arm_wal,
            "above1_6msPerSave": [{"arm": r["arm"], "width": r["width"], "outstanding": r["outstanding"],
                                  "apply": r["nativeApplyMsPerSave"] > 1.6,
                                  "append": r["appendMsPerSave"] > 1.6}
                                 for r in rows if r["arm"].startswith("B")
                                 and max(r["nativeApplyMsPerSave"], r["appendMsPerSave"]) > 1.6]}


if __name__ == "__main__":
    with Path(sys.argv[2]).open("x") as output:
        json.dump(profile(Path(sys.argv[1])), output, indent=2)
        output.write("\n")

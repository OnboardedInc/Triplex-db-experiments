"""Join W1's peer stages to the measured append and apply for each native t."""

import base64
from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path
from statistics import mean
import sys


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text())


def distribution(samples):
    ordered = sorted(samples)
    return [round(value, 3) for value in (
        mean(ordered), ordered[math.ceil(len(ordered) * .5) - 1],
        ordered[math.ceil(len(ordered) * .99) - 1],
    )]


def ms(nanos):
    return nanos / 1_000_000


def frozen_inputs(out):
    inputs = read(out / "inputs.json")
    image = read(out / "image.json")
    attempt = inputs["attempt"]
    for path, digest in inputs["stage"].items():
        assert sha(out / "stage" / path) == digest
    for key, root in [("config", "lab/config/datomic"), ("gateway", "packages/datomic/gateway")]:
        actual = {root + "/" + f["path"]: f["sha256"] for f in image["sources"][key]}
        assert actual == {p: digest for p, digest in inputs["stage"].items() if p.startswith(root + "/")}
    assert image["sources"]["codec"]["sha256"] == inputs["stage"]["packages/datomic/src/codec-spec.json"]
    assert (out / "stage/lab/config/datomic/attempt").read_text().strip() == attempt
    return inputs, image


def managed_events(out):
    inputs, image = frozen_inputs(out)
    terminal = read(out / "terminal.json")
    assert terminal["attempt"] == inputs["attempt"] and terminal["exit"] == 0
    assert terminal["holder"] == "DX-PREP1" and terminal["slot"] == "tx2-datomic-selftest"
    assert terminal["image"] == image["imageId"]
    raw = out / terminal["log"]
    assert sha(raw) == terminal["sha256"]
    return inputs, terminal, run_events(inputs, raw.read_text().splitlines())


def run_events(inputs, lines):
    attempt = inputs["attempt"]
    boots = {"recovery": 2, "subject-recovery": 2, "rolling-recovery": 3}.get(inputs["mode"], 1)
    assert [line for line in lines if line.startswith("PREP1_SQL ")] == [
        f"PREP1_SQL {key} on" for key in ("fsync", "synchronous_commit", "full_page_writes")
    ] * boots

    def events(prefix):
        rows = [json.loads(line[len(prefix):]) for line in lines if line.startswith(prefix)]
        assert rows and all(r["attempt"] == attempt for r in rows)
        return rows

    assert events("PREP1_NATIVE_END ") == [{"attempt": attempt, "dropped": 0}] * boots
    return events


def extract(out):
    inputs, terminal, events = managed_events(out)
    attempt = inputs["attempt"]
    probe = events("PREP1_PROBE ")
    assert [e["kind"] for e in probe] == ["seed"] + ["block"] * 6 + ["finished"]
    seed, *blocks, finished = [e["data"] for e in probe]
    scope = seed["scope"]
    assert json.loads(scope) == ["triplex-scope-v1", "test", "prep1", attempt, 0]
    db = "s2-" + base64.urlsafe_b64encode(scope.encode()).decode().rstrip("=")
    assert seed["db"] == finished["db"] == db
    assert (seed["subjects"], seed["facts"], seed["position"]) == (1152, 184320, 144)
    assert finished["head"] == seed["position"] + 1152
    native = {}
    for append in events("PREP1_NATIVE "):
        if append["db"] != db:
            continue
        assert len(append["members"]) == len(append["bytes"]) == 1
        member = append["members"][0]
        t = str(member["t"])
        assert t not in native
        native[t] = (append, member)
    stages = []
    for n, (block, outstanding) in enumerate(zip(blocks, (1, 8, 32, 32, 8, 1), strict=True)):
        head = seed["position"] + n * 192
        assert (block["db"], block["block"], block["outstanding"], block["head"]) == (db, n, outstanding, head)
        assert len(block["rows"]) == 192
        groups = defaultdict(list)
        clock = -math.inf
        indices = set()
        for j, item in enumerate(block["rows"]):
            a = item["ack"]
            assert item["index"] not in indices and 0 <= item["index"] < 192
            indices.add(item["index"])
            assert a["operationId"] == f"edit-{n * 192 + item['index']}"
            assert int(a["position"]["v"]) == head + j + 1 and a["recordedAt"]["v"] > clock
            clock = a["recordedAt"]["v"]
            groups[a["t"]["v"]].append(item)
        for t, group in groups.items():
            append, member = native.pop(t)
            start, end = int(append["start"]), int(append["end"])
            read_at, apply_start, applied = (int(member[k]) for k in ("read-at", "started-at", "applied-at"))
            first_offer = min(int(r["begin"]) for r in group)
            last_offer = max(int(r["begin"]) for r in group)
            first_ack = min(int(r["end"]) for r in group)
            last_ack = max(int(r["end"]) for r in group)
            assert int(block["start"]) <= first_offer <= last_offer <= read_at <= apply_start <= applied <= start <= end
            assert end <= first_ack <= last_ack <= int(block["end"])
            samples = [r["ack"] for r in group]
            assert 1 <= len(group) <= min(8, outstanding)
            assert all(a["groupSize"] == len(group) and a["datoms"] == member["datom-count"]
                       for a in samples)
            assert all(a["groupStages"] == samples[0]["groupStages"] for a in samples)
            s = samples[0]["groupStages"]
            assert (s is None) == (len(group) == 1)
            row = {
                "block": n, "outstanding": outstanding, "t": t, "count": len(group),
                "applyMs": ms(applied - apply_start), "appendMs": ms(end - start),
                "encodeAndHandoffMs": ms(start - applied), "readToApplyMs": ms(apply_start - read_at),
                "applyNativeApiMs": samples[0]["nativeComputeMs"],
                "appendToFirstAckMs": ms(first_ack - end), "appendToLastAckMs": ms(last_ack - end),
                "appendBytes": append["bytes"][0], "requestBytes": sum(a["requestBytes"] for a in samples),
                "meanRequestPreparationMs": mean(a["timeline"]["payloadPrepared"] / 1000
                                                  for a in samples),
            }
            assert row["appendBytes"] > 0 and row["requestBytes"] > 0
            if s is not None:
                assert s["prepareMicros"] + s["speculativeMicros"] <= s["evaluateMicros"]
                row.update({
                    "evaluateMs": s["evaluateMicros"] / 1000, "compileMs": s["prepareMicros"] / 1000,
                    "speculateMs": s["speculativeMicros"] / 1000, "materializeMs": s["materializeMicros"] / 1000,
                    "awaitMs": s["awaitMicros"] / 1000,
                    "gateMs": (s["evaluateMicros"] + s["materializeMicros"] + s["awaitMicros"]) / 1000,
                    "prepMs": (s["evaluateMicros"] + s["materializeMicros"]) / 1000,
                })
            stages.append(row)
    cells = []
    for rate in (1, 8, 32):
        for members in (1, 2, 3, 4, 5, 6, 7, 8):
            rows = [r for r in stages if r["outstanding"] == rate and r["count"] == members]
            if not rows:
                continue
            stages_for_cell = sorted(set(rows[0]) - {"block", "outstanding", "t", "count"})
            cell = {"outstanding": rate, "members": members, "groups": len(rows),
                    "measures": {k: distribution(r[k] for r in rows) for k in stages_for_cell}}
            if members > 1:
                cell["gatePrepShare"] = sum(r["prepMs"] for r in rows) / sum(r["gateMs"] for r in rows)
            cells.append(cell)
    return {"attempt": attempt, "source": inputs["head"], "image": terminal["image"], "slot": terminal["slot"],
            "runSha256": terminal["sha256"], "inputSha256": sha(out / "inputs.json"), "seed": seed,
            "cells": cells, "groups": stages}


def window(out):
    inputs, terminal, events = managed_events(out)
    attempt, mode = inputs["attempt"], inputs["mode"]
    assert mode in ("prepare", "two")
    assert (out / "stage/lab/config/datomic/mode").read_text().strip() == mode
    probe = events("PREP1_PROBE ")
    assert [e["kind"] for e in probe] == ["seed", "block", "block", "finished"]
    seed, *phases, done = [e["data"] for e in probe]
    scope = seed["scope"]
    assert json.loads(scope) == ["triplex-scope-v1", "test", "prep1", attempt, 0]
    db = "s2-" + base64.urlsafe_b64encode(scope.encode()).decode().rstrip("=")
    assert db == seed["db"] == done["db"] and seed["position"] == 48 and seed["subjects"] == 384
    assert seed["facts"] == 61440 and done["head"] == 432
    commits = {}
    for append in events("PREP1_NATIVE "):
        if append["db"] == db:
            assert len(append["bytes"]) == len(append["members"])
            for member, bytes_ in zip(append["members"], append["bytes"], strict=True):
                t = str(member["t"])
                assert t not in commits and bytes_ > 0
                commits[t] = (append["start"], append["end"], member["read-at"], member["datom-count"])
    counts = defaultdict(int)
    attempts = {}
    operations = {}
    details = []
    for block, phase in enumerate(phases):
        assert (phase["block"], phase["outstanding"], phase["db"], phase["head"]) == (block, 32, db, 48 + 192 * block)
        groups = defaultdict(list)
        assert len(phase["rows"]) == 192
        assert {r["index"] for r in phase["rows"]} == set(range(192))
        for i, item in enumerate(phase["rows"]):
            ack = item["ack"]
            assert int(ack["position"]["v"]) == phase["head"] + i + 1
            assert ack["operationId"] == f"edit-{block * 192 + item['index']}"
            groups[ack["t"]["v"]].append(item)
        for t, rows in groups.items():
            a = [r["ack"] for r in rows]
            stats = a[0].get("preparedStats")
            append_start, append_end, read_at, datoms = commits[t]
            assert all(x["datoms"] == datoms and x["groupSize"] == len(rows) for x in a)
            assert int(phase["start"]) <= min(int(r["begin"]) for r in rows) <= read_at
            assert read_at <= append_start <= append_end <= min(int(r["end"]) for r in rows) <= int(phase["end"])
            assert all(x.get("preparedStats") == stats for x in a)
            counts["physical"] += 1
            if stats:
                submitted = int(stats["submittedNs"])
                rendered = int(stats["renderedNs"])
                assert rendered <= submitted <= int(stats["observedNs"])
                assert stats["path"] in ("prepared", "reference")
                assert stats["replays"] == int(stats["path"] == "reference")
                previous = attempts.setdefault(submitted, stats)
                assert previous == stats
                if stats["path"] == "prepared":
                    counts["preparedPhysical"] += 1
                    counts["preparedMembers"] += len(rows)
                    predecessor = stats["afterOperation"]
                    if predecessor:
                        prior = operations[predecessor]
                        assert int(prior["position"]["v"]) < int(a[0]["position"]["v"])
                        prev_start, prev_end, _, _ = commits[prior["t"]["v"]]
                        before_durability = int(prior["preparedStats"]["submittedNs"]) <= rendered < prev_end
                        during_append = prev_start <= rendered < prev_end
                        concurrent_submit = submitted < prev_end
                        concurrent_native = read_at < prev_end
                        assert mode == "two" or not concurrent_submit
                        counts["linkedGroups"] += 1
                        counts["renderedBeforePredecessorDurable"] += int(before_durability)
                        counts["renderedDuringAppend"] += int(during_append)
                        counts["secondSubmittedBeforePredecessorDurable"] += int(concurrent_submit)
                        counts["secondNativeReadBeforePredecessorDurable"] += int(concurrent_native)
                        details.append({"previous": prior["t"]["v"], "next": t, "renderedNs": rendered,
                                        "submittedNs": submitted, "appendStartNs": prev_start,
                                        "appendEndNs": prev_end, "nativeReadNs": read_at})
            for ack in a:
                operations[ack["operationId"]] = ack
    counts["preparedAttempts"] = len(attempts)
    counts["definitiveReplays"] = sum(r["replays"] for r in attempts.values())
    return {"attempt": attempt, "mode": mode, "source": inputs["head"], "image": terminal["image"],
            "slot": terminal["slot"], "inputSha256": sha(out / "inputs.json"), "runSha256": terminal["sha256"],
            "counts": counts, "overlaps": details}


if __name__ == "__main__":
    if not __debug__:
        raise SystemExit("Verification requires enabled assertions")
    path = Path(sys.argv[1])
    mode = read(path / "inputs.json").get("mode", "ortho")
    result = extract(path) if mode == "ortho" else window(path)
    with (path / ("stages.json" if mode == "ortho" else "window.json")).open("x") as out:
        json.dump(result, out, indent=2)
        out.write("\n")

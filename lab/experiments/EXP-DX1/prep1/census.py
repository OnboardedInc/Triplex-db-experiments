"""Check the saved and fresh decision census against real native receipts."""

from collections import Counter, defaultdict
import json
from pathlib import Path
import re
import sys

from read_guard import read, scoped_db
from read_probe import managed_events, sha


def fresh(out, inputs, terminal, events):
    attempt = inputs["attempt"]
    scope, db = scoped_db(attempt, "cheap")
    seed, block, finish = events("PREP1_PROBE ")
    assert [r["kind"] for r in (seed, block, finish)] == ["seed", "block", "finished"]
    assert all(r["arm"] == "cheap" and r["data"]["db"] == db for r in (seed, block, finish))
    assert seed["data"] == {"db": db, "scope": scope, "position": 150, "subjects": 1200, "facts": 192000}
    block = block["data"]
    assert block["head"] == 150 and block["outstanding"] == 8 and finish["data"]["head"] == 246
    native = {}
    for entry in events("PREP1_NATIVE "):
        if entry["db"] != db:
            continue
        for member in entry["members"]:
            t = str(member["t"])
            assert t not in native
            assert member["started-at"] <= member["applied-at"] <= entry["start"] <= entry["end"]
            native[t] = (member, entry)
    rows = {}
    by_t = defaultdict(list)
    prior_clock = float("-inf")
    for p, row in enumerate(block["rows"], 151):
        ack = row["ack"]
        op = ack["operationId"]
        assert op == f"edit-{row['index']}" and op not in rows
        assert int(ack["position"]["v"]) == p and ack["recordedAt"]["v"] > prior_clock
        prior_clock = ack["recordedAt"]["v"]
        member, entry = native[ack["t"]["v"]]
        assert int(row["begin"]) <= member["read-at"] <= member["started-at"]
        assert entry["end"] <= int(row["end"])
        if row.get("recovered"):
            assert set(ack) == {"operationId", "position", "recordedAt", "t"}
        else:
            assert ack["datoms"] == member["datom-count"]
        rows[op] = row
        by_t[ack["t"]["v"]].append(row)

    reasons, routes = Counter(), Counter()
    decisions = {}
    replays = 0
    for event in events("PREP1_DECISION "):
        route = event["route"]
        members = event["members"]
        ids = {member["operation"] for member in members}
        if all(op.startswith("seed-") for op in ids):
            continue
        assert ids <= rows.keys() and ids.isdisjoint(decisions) and len(ids) == len(members)
        assert route in {"reference", "prepared", "native-refusal", "uncertain-result"}
        if route == "native-refusal":
            replays += 1
        routes[route] += len(members)
        for member in members:
            op = member["operation"]
            row = rows[op]
            ack = row["ack"]
            if route == "prepared":
                assert row.get("recovered") or ack["preparedStats"]["guard"] == "basis"
            else:
                assert member["reasons"]
                reasons.update(set(member["reasons"]))
            final_route = "reference" if route == "native-refusal" else route
            decisions[op] = {"route": final_route, "decision": route, "reasons": member["reasons"],
                             "t": ack["t"]["v"], "recovered": bool(row.get("recovered"))}
    assert decisions.keys() == rows.keys() == {f"edit-{i}" for i in range(96)}
    turns = []
    for t, group in by_t.items():
        path, = {decisions[r["ack"]["operationId"]]["route"] for r in group}
        assert all(r.get("recovered") or r["ack"]["groupSize"] == len(group) for r in group)
        turns.append({"t": t, "size": len(group), "path": path})

    raw = (out / terminal["log"]).read_text().splitlines()
    seed_replies = [json.loads(line.removeprefix("PREP1_SEED_RECOVERED "))
                    for line in raw if line.startswith("PREP1_SEED_RECOVERED ")]
    ids = set()
    for row in seed_replies:
        receipt = row["stored"]
        position = int(receipt["position"]["v"])
        assert row["attempt"] == attempt and row["db"] == db and row["arm"] == "cheap"
        assert 1 <= position <= 150 and receipt["status"] == "committed"
        assert receipt["operationId"] == f"seed-{8 * (position - 1)}" and position not in ids
        assert receipt["t"]["v"] in native
        ids.add(position)
    return {"physicalWrites": len(turns), "receipts": len(rows), "certifiedSaves": routes["prepared"],
            "submittedReplays": replays, "turns": turns, "routes": routes, "reasons": reasons,
            "seedRepliesRecovered": len(seed_replies),
            "editRepliesRecovered": sum(r["recovered"] for r in decisions.values()),
            "decisions": decisions}


def census(out):
    inputs, terminal, events = managed_events(out)
    saved = inputs["mode"] == "profile"
    assert saved or inputs["mode"] == "census"
    # [DX-PREP1] Why: bind the scope, 96 edit operations and native positions to this exact staged tape.
    # Rejected: inventing an ACK or a replay from one route label.
    assert re.search(r"\(?offer \* 67\)? % subjectCount", (
        out / "stage/lab/config/datomic/probe.mjs").read_text())
    assert len({(67 * i) % 1200 for i in range(96)}) == 96
    result = {"attempt": inputs["attempt"], "source": inputs["head"], "image": terminal["image"],
              "slot": terminal["slot"], "logSha256": terminal["sha256"], "verifierSha256": sha(Path(__file__)),
              "distinctSubjects": 96}
    if not saved:
        assert inputs["timings"] == terminal["timings"] == "diagnostic"
        return dict(result, **fresh(out, inputs, terminal, events))

    arm = read(out)["arms"]["cheap"]
    physical = arm["physical"]
    assert terminal["sha256"] == "bf45f9219878c2305a1e3eeb60483240d4a4ad85283182d4452f51703e099844"
    assert [(p["size"], p["path"]) for p in physical] == [(1, "reference")] + [(8, "reference")] * 10 + [
        (8, "prepared"), (7, "prepared")]
    assert sum(p["replays"] for p in physical) == 0
    return dict(result, physicalWrites=13, receipts=96, certifiedSaves=15,
                submittedReplays=0, turns=physical, reasons=None)


if __name__ == "__main__":
    assert __debug__
    output = Path(sys.argv[1])
    summary = census(Path(sys.argv[2]))
    with output.open("x") as file:
        json.dump(summary, file, indent=2)
        file.write("\n")

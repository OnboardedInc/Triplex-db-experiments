"""Join the saved and instrumented basis arms to native appends and receipts."""

from collections import Counter
import json
from pathlib import Path
import re
import sys

from read_guard import read
from read_probe import managed_events, sha


def census(out):
    inputs, terminal, events = managed_events(out)
    saved = inputs["mode"] == "profile"
    assert saved or inputs["mode"] == "census"
    guard = read(out)
    arm = guard["arms"]["cheap"]
    block, = [event["data"] for event in events("PREP1_PROBE ")
              if event["arm"] == "cheap" and event["kind"] == "block"]
    offered = {f"edit-{i}" for i in range(96)}
    rows = {row["ack"]["operationId"]: row["ack"] for row in block["rows"]}
    assert len(rows) == len(block["rows"]) == 96 and set(rows) == offered
    # [DX-PREP1] Why: bind the saved cohort to the retained input algorithm as well as the observed receipts.
    # Rejected: counting every reference result as a native CAS failure.
    assert re.search(r"\(?offer \* 67\)? % subjectCount", (
        out / "stage/lab/config/datomic/probe.mjs").read_text())
    assert len({(67 * i) % 1200 for i in range(96)}) == 96
    physical = arm["physical"]
    result = {"attempt": inputs["attempt"], "source": inputs["head"], "image": terminal["image"],
              "slot": terminal["slot"], "logSha256": terminal["sha256"], "verifierSha256": sha(Path(__file__)),
              "physicalWrites": len(physical), "receipts": len(rows), "distinctSubjects": 96,
              "seedRepliesRecovered": guard["seedRepliesRecovered"],
              "certifiedSaves": sum(p["size"] for p in physical if p["variant"] == "basis" and not p["replays"]),
              "submittedReplays": sum(p["replays"] for p in physical), "turns": physical}
    if saved:
        assert terminal["sha256"] == "bf45f9219878c2305a1e3eeb60483240d4a4ad85283182d4452f51703e099844"
        assert [(p["size"], p["path"]) for p in physical] == [(1, "reference")] + [(8, "reference")] * 10 + [
            (8, "prepared"), (7, "prepared")]
        assert all(row["preparedStats"]["history"] == "points" for row in rows.values() if row.get("preparedStats"))
        assert (result["physicalWrites"], result["certifiedSaves"], result["submittedReplays"]) == (13, 15, 0)
        result["reasons"] = None
    else:
        reasons = Counter()
        routes = Counter()
        observed = set()
        decisions = {}
        for event in events("PREP1_DECISION "):
            members = event["members"]
            ids = {member["operation"] for member in members}
            if ids.isdisjoint(offered):
                assert all(op.startswith("seed-") for op in ids)
                continue
            assert ids <= offered and ids.isdisjoint(observed) and len(ids) == len(members)
            observed.update(ids)
            route = event["route"]
            assert route in {"reference", "prepared", "native-refusal", "uncertain-result"}
            routes[route] += len(members)
            decisions.update({m["operation"]: {"route": route, "reasons": m["reasons"],
                                               "t": rows[m["operation"]]["t"]["v"]}
                              for m in members})
            if route == "prepared":
                assert all(rows[op]["preparedStats"]["guard"] == "basis" for op in ids)
            else:
                assert all(member["reasons"] for member in members)
                for member in members:
                    reasons.update(set(member["reasons"]))
        assert observed == offered and routes["prepared"] == result["certifiedSaves"]
        result.update(routes=routes, reasons=reasons, decisions=decisions)
    return result


if __name__ == "__main__":
    if not __debug__:
        raise SystemExit("Assertions are required")
    output = Path(sys.argv[1])
    summary = census(Path(sys.argv[2]))
    with output.open("x") as f:
        json.dump(summary, f, indent=2)
        f.write("\n")

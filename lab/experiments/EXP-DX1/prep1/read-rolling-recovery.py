"""Verify exact receipts and append order from both fresh rolling SQL restart fixtures."""

import base64
import json
from pathlib import Path
import sys

from read_probe import managed_events, sha


def check(root):
    assert __debug__
    inputs, terminal, events = managed_events(root)
    assert inputs["mode"] == "rolling-recovery" and inputs["timings"] == "diagnostic"
    assert all(inputs[k] for k in ("subject", "numericOwner", "orderedIds"))
    repository = Path(__file__).resolve().parents[4]
    for name in ("prep1/rolling-gate.ts", "prep1/rolling-credits.ts",
                 "prep1/stack.sh", "prep1/observe.clj", "scale1/decision/writes.ts"):
        path = "lab/experiments/EXP-DX1/" + name
        assert inputs["runner"][path] == sha(repository / path)
    if inputs.get("freshFirst"):
        path = "lab/experiments/EXP-DX1/prep1/deadline-order.ts"
        assert inputs["runner"][path] == sha(repository / path)
        assert "lab/config/datomic/fresh-first" in inputs["stage"]
    attempt = terminal["attempt"]
    denied = events("PREP1_ROLLING_DENIED ")
    records = events("PREP1_ROLLING ")
    assert len(denied) == len(records) == 2
    native = events("PREP1_NATIVE ")
    output = []
    for width, record, refusal in zip((6,16), records, denied, strict=True):
        nonce = f"{attempt}-{width}"
        scope = json.dumps(["triplex-scope-v1", "test", "rolling", nonce, 0], separators=(",", ":"))
        db = "s2-" + base64.urlsafe_b64encode(scope.encode()).decode().rstrip("=")
        assert record["db"] == refusal["db"] == db
        assert record.get("freshFirst", False) == inputs.get("freshFirst", False)
        pressure = 4 if record.get("freshFirst") else 0
        assert (record["credits"], record["head"], record["durable"], record["refused"]) == (
            width, 51 + width + pressure, 50 + width + pressure, width)
        expected = set(f"{nonce}-{phase}-{n}" for phase, length in
                       (("healthy", 50), ("pressure", pressure), ("lost", width)) for n in range(length))
        assert {r["id"] for r in record["checked"]} == expected
        assert sorted(r["p"] for r in record["checked"]) == list(range(2, 52 + width + pressure))
        lost = record["lost"]
        original = {k: lost[k] for k in ("id", "p", "t", "clock", "replyNs")}
        assert original["id"] == f"{nonce}-lost-{width-1}" and original in record["checked"]
        appended = {}
        for block in native:
            if block["db"] != db:
                continue
            for member in block["members"]:
                t = str(member["t"])
                assert t not in appended
                assert member["read-at"] <= member["started-at"] <= member["applied-at"] <= block["start"] <= block["end"]
                appended[t] = block["end"]
        for receipt in record["checked"]:
            assert receipt["clock"] > 0 and appended[receipt["t"]] <= int(receipt["replyNs"])
        assert len({r["t"] for r in record["checked"]}) == len(expected)
        output.append(dict(credits=width, durable=record["durable"], refused=width, original=lost))
    return dict(attempt=attempt, source=inputs["head"], freshFirst=inputs.get("freshFirst", False),
                slot=terminal["slot"], image=terminal["image"],
                rawSha256=terminal["sha256"], cases=output)


if __name__ == "__main__":
    result = check(Path(sys.argv[1]))
    with Path(sys.argv[2]).open("x") as output:
        json.dump(result, output, indent=2)
        output.write("\n")

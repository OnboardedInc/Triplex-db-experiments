"""Verify exact receipts and append order from both fresh rolling SQL restart fixtures."""

import base64
import hashlib
import json
from pathlib import Path
import subprocess
import sys

from read_probe import managed_events


def check(root):
    assert __debug__
    inputs, terminal, events = managed_events(root)
    assert inputs["mode"] == "rolling-recovery" and inputs["timings"] == "diagnostic"
    ordered, serial = inputs["orderedIds"], inputs["serialApply"]
    assert inputs["subject"] == inputs["numericOwner"] == ordered
    assert not serial or ordered
    repository = Path.cwd()
    assert subprocess.check_output(["git", "rev-parse", inputs["head"] + "^{commit}"], cwd=repository, text=True).strip() == inputs["head"]
    for name in ("prep1/rolling-gate.ts", "prep1/rolling-credits.ts",
                 "prep1/stack.sh", "prep1/observe.clj", "scale1/decision/writes.ts"):
        path = "lab/experiments/EXP-DX1/" + name
        actual = subprocess.check_output(["git", "show", inputs["head"] + ":" + path], cwd=repository)
        assert inputs["runner"][path] == hashlib.sha256(actual).hexdigest()
    attempt = terminal["attempt"]
    denied = events("PREP1_ROLLING_DENIED ")
    records = events("PREP1_ROLLING ")
    modes = ["rolling6"] if serial else ["barrier6", "rolling6", "rolling12"]
    assert len(denied) == len(records) == len(modes)
    if inputs.get("appendRetirement"):
        assert all(r["appendRetirement"] is True for r in records)
        replayed, = events("DX_CHK1_FULL_REPLAY ")
        assert replayed == {"attempt": attempt, "db": records[0]["db"], "positions": 57, "recovered": 56}
    native = events("PREP1_NATIVE ")
    output = []
    for mode, record, refusal in zip(modes, records, denied, strict=True):
        width = int(mode.removeprefix("barrier").removeprefix("rolling"))
        assert (record["mode"], record["ordered"], record["serial"], record["immediate"]) == (mode, ordered, serial, 50)
        submitted = 1 if mode == "barrier6" else width
        assert record.get("submitted", width) == submitted
        nonce = f"{attempt}-{mode}"
        scope = json.dumps(["triplex-scope-v1", "test", "rolling", nonce, 0], separators=(",", ":"))
        db = "s2-" + base64.urlsafe_b64encode(scope.encode()).decode().rstrip("=")
        assert record["db"] == refusal["db"] == db
        assert (record["credits"], record["head"], record["durable"], record["refused"]) == (width, 51+width, 50+width, width)
        expected = set(f"{nonce}-{phase}-{n}" for phase, length in (("healthy", 50), ("lost", width)) for n in range(length))
        assert {r["id"] for r in record["checked"]} == expected
        assert sorted(r["p"] for r in record["checked"]) == list(range(2, 52+width))
        lost = record["lost"]
        original = {k: lost[k] for k in ("id", "p", "t", "clock", "replyNs")}
        assert original["id"] == f"{nonce}-lost-{width-1}"
        checked, = [r for r in record["checked"] if r["id"] == original["id"]]
        assert {k: checked[k] for k in original} == original
        appended = {}
        for block in native:
            if block["db"] != db:
                continue
            for member in block["members"]:
                t = str(member["t"])
                assert t not in appended
                assert member["read-at"] <= member["started-at"] <= member["applied-at"] <= block["start"] <= block["end"]
                appended[t] = (member, block)
        for receipt in record["checked"]:
            assert receipt["clock"] > 0 and appended[receipt["t"]][1]["end"] <= int(receipt["replyNs"])
        if ordered:
            assert len({r["t"] for r in record["checked"]}) == len(expected)
        output.append(dict(mode=mode, credits=width, submitted=submitted, durable=record["durable"], refused=width, original=lost))
    raw = (root / terminal["log"]).read_text()
    sampled = 0
    if inputs["lookupEvery"]:
        receipts = {r["t"] for record in records for r in record["checked"]}
        # [DX-W1] Why: apply can be on a native thread without a named writer database.
        # Rejected: guessing the database from the sample ordinal or matching only a recycled transaction number.
        lookup_rows = []
        for r in events("PREP1_LOOKUPS "):
            if r["t"] not in receipts:
                continue
            member, block = appended[r["t"]]
            if member["started-at"] <= r["start"] <= r["end"] <= member["applied-at"] <= block["start"]:
                assert r["db"] in (None, block["db"])
                lookup_rows.append(r)
        assert len({r["t"] for r in lookup_rows}) == len(lookup_rows)
        assert lookup_rows
        assert all(r["sampleEvery"] == inputs["lookupEvery"] and int(r["beforeT"]) < int(r["t"])
                   and r["start"] <= r["end"] and isinstance(r["outsideSql"], dict) for r in lookup_rows)
        assert any("api/datoms :aevt :triplex.entity/rev" in row["lookups"] for row in lookup_rows)
        sampled = len(lookup_rows)
    else:
        assert "PREP1_LOOKUPS " not in raw
    return dict(attempt=attempt, source=inputs["head"], slot=terminal["slot"], image=terminal["image"],
                rawSha256=terminal["sha256"], ordered=ordered, serial=serial, sampled=sampled, cases=output)


if __name__ == "__main__":
    result = check(Path(sys.argv[1]))
    with Path(sys.argv[2]).open("x") as output:
        json.dump(result, output, indent=2)
        output.write("\n")

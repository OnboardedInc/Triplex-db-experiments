"""Verify the managed restart and record the observed limits of lean excision."""

import base64
import json
from pathlib import Path
import sys

from read_probe import managed_events, sha


def scope_db(attempt, suffix):
    text = json.dumps(["triplex-scope-v1", "test", "prep1-gate", f"{attempt}-{suffix}", 0], separators=(",", ":"))
    return text, "s2-" + base64.urlsafe_b64encode(text.encode()).decode().rstrip("=")


def read(out):
    inputs, terminal, events = managed_events(out)
    attempt = inputs["attempt"]
    assert inputs["mode"] == (out / "stage/lab/config/datomic/mode").read_text().strip() == "recovery"
    raw = (out / terminal["log"]).read_text().splitlines()
    stop, = [n for n, line in enumerate(raw) if line.startswith("PREP1_STOP ")]
    assert json.loads(raw[stop][11:]) == {"attempt": attempt, "gatewayExit": 137}
    first_end, _ = [n for n, line in enumerate(raw) if line.startswith("PREP1_NATIVE_END ")]
    assert stop < first_end
    records = events("PREP1_RECOVERY ")
    assert [row["kind"] for row in records] == ["held", "recovered", "erasure", "erasure"]
    held, restarted, *erasures = [row["data"] for row in records]
    scope, db = scope_db(attempt, "restart")
    t = int(held["t"])
    assert (held["attempt"], held["scope"], held["db"], held["guard"], held["replies"], held["head"]) == (
        attempt, scope, db, "basis", 0, 10)
    assert (restarted["db"], restarted["t"], restarted["head"]) == (db, str(t), 10)
    appended, = [member for line in raw[stop:first_end] if line.startswith("PREP1_NATIVE ")
                 for append in [json.loads(line[13:])] if append["db"] == db
                 for member in append["members"] if member["t"] == t]
    assert appended["datom-count"] > 0
    assert restarted["reads"] == [
        [["fact-seed-0"], ["fact-seed-1"]], [["fact-a"], ["fact-seed-1"]], [["fact-a"], ["fact-b"]],
    ]
    assert restarted["resumed"] == [restarted["feed"][1]]
    for i, id in enumerate(("a", "b")):
        position, clock = 9 + i, 1008 + i
        offer, original, retry = held["offers"][i], held["claims"][i], restarted["retries"][i]
        assert offer["operationId"] == retry["id"] == original["commandId"] == id
        assert original == retry["claim"]
        assert retry["exact"] == [409, "OperationDuplicate"] and retry["resend"] == [409, "CommandConflict"]
        assert original["txId"] == "_tx/" + id
        receipt = original["receipt"]
        assert (receipt["status"], receipt["operationId"]) == ("committed", id)
        assert int(receipt["position"]["v"]) == position and receipt["recordedAt"]["v"] == clock
        assert receipt["t"]["v"] == str(t)
        tx, p, changes = restarted["feed"][i]
        assert (tx, p) == (original["txId"], position)
        assert changes["assert"]["tripleId"] == "fact-" + id and changes["assert"]["recordedAt"] == clock
        assert changes["retract"]["value"] == {"type": "string", "value": f"fact-seed-{i}"}
        assert changes["retract"]["assertionTxId"] == f"_tx/seed-{i}"
        assert changes["retract"]["recordedAt"] == 1000 + i and changes["retract"]["retractedAt"] == clock
    for moved, row in zip((False, True), erasures, strict=True):
        assert row["db"] == scope_db(attempt, f"erase-{str(moved).lower()}")[1]
        assert row["movedOwner"] == moved
        assert row["watermark"] >= row["excisionT"]
        assert row["protectedInNative"] is False and row["certificateAfterExcision"] is False
        published = row["receipt"]["status"] == "committed"
        assert row["headBefore"] == 11 and row["headAfter"] == 11 + int(published)
        assert (row["retry"][0] == 200) == published
    return {"attempt": attempt, "source": inputs["head"], "inputSha256": sha(out / "inputs.json"),
            "rawSha256": terminal["sha256"], "image": terminal["image"], "slot": terminal["slot"],
            "verifierSha256": sha(Path(__file__)), "restart": restarted, "erasure": erasures}


if __name__ == "__main__":
    if not __debug__:
        raise SystemExit("Verification requires enabled assertions")
    out = Path(sys.argv[1])
    result = read(out)
    with (out / "recovery-summary.json").open("x") as stream:
        json.dump(result, stream, indent=2)
        stream.write("\n")

"""Check fresh PostgreSQL restart or public query evidence for either subject setting."""

import base64
import json
from pathlib import Path
import re
import sys

from read_probe import managed_events


def inspect(root):
    if not __debug__:
        raise RuntimeError("Assertions are required for source and transaction binding")
    inputs, terminal, events = managed_events(root)
    assert inputs["timings"] == terminal["timings"] == "diagnostic"
    attempt = inputs["attempt"]
    scope = json.dumps(["triplex-scope-v1", "test", "subject-recovery", attempt, 0], separators=(",", ":"))
    db = "s2-" + base64.urlsafe_b64encode(scope.encode()).decode().rstrip("=")
    records = events("PREP1_SUBJECT_RECOVERY ")
    values = [row["value"] for row in records]
    labels = [row["label"] for row in records]
    result = {"attempt": attempt, "head": inputs["head"], "image": terminal["image"],
              "subject": inputs["subject"], "mode": inputs["mode"], "logSha256": terminal["sha256"]}
    if inputs["mode"] == "subject-query":
        assert labels == ["queries"]
        proof, = values
        before, after = proof["held"], proof["observed"]
    else:
        assert inputs["mode"] == "subject-recovery"
        assert labels == ["tests", "blocked-before-reply", "reopened"]
        tests, before, after = values
        assert tests["test"] == 7 and tests["pass"] > 6 and tests["fail"] == tests["error"] == 0
        assert events("PREP1_STOP ") == [{"attempt": attempt, "gatewayExit": 137}]
        lines = (root / terminal["log"]).read_text().splitlines()
        assert lines.count("PREP1_SQL_REPLICA streaming sync fsync=on") == 2
        flushes = [line for line in lines if line.startswith("PREP1_SQL_REPLICA durable-through ")]
        assert len(flushes) == 2 and all(
            re.fullmatch(r"PREP1_SQL_REPLICA durable-through [0-9A-F]+/[0-9A-F]+", line)
            for line in flushes)
        stop = next(i for i, line in enumerate(lines) if line.startswith("PREP1_STOP "))
        boots = [i for i, line in enumerate(lines) if line.startswith("PREP1_NATIVE_END ")]
        reads = [next(i for i, line in enumerate(lines) if line.startswith("PREP1_SUBJECT_RECOVERY ") and label in line)
                 for label in ("blocked-before-reply", "reopened")]
        assert reads[0] < stop < boots[0] < reads[1] < boots[1]
        assert after["originalOperation"] == [409, "OperationDuplicate"]
        assert after["newOperation"] == [409, "CommandConflict"]
        result.update(nativeTests=tests, replicaFlushes=flushes)

    assert before["attempt"] == attempt and before["db"] == db and before["prepared"] == inputs["subject"]
    assert before.get("numericOwner", False) == inputs.get("numericOwner", False)
    if inputs["subject"]:
        assert re.fullmatch(r":triplex\.subject/v-[0-9a-f]{24}", before["function"])
        assert int(before["functionTx"]) > 0
    else:
        assert before["function"].startswith((":triplex/commit", ":triplex.write/v-"))
        assert before["functionTx"] is None
    assert before["nativeT"] == after["nativeT"] == before["receipt"]["t"]["v"]
    assert before["receipt"] == after["claim"]["receipt"]
    assert before["planOperation"] == before["receipt"]["operationId"] == "edit-a"
    assert before["receipt"]["position"]["v"] == "2"
    assert before["receipt"]["recordedAt"]["v"] == 1001.0
    assert after["feed"][:2] == ["_tx/edit-a", 2]
    assert [r["status"] for r in after["nativeQueries"]] == [200, 200, 200]
    assert [[v[0]["v"] for v in r["body"]["rows"]] for r in after["nativeQueries"]] == [
        ["old"], ["middle"], [],
    ]
    assert after["nativeLog"]["t"] == before["nativeT"]
    assert {(r["op"], r["assertionId"], r["attribute"])
            for r in after["nativeLog"]["transaction"]["changes"]} == {
                ("retract", "old", ":v"), ("assert", "middle", ":v"),
            }
    committed = [member for block in events("PREP1_NATIVE ") if block["db"] == db
                 for member in block["members"] if str(member["t"]) == before["nativeT"]]
    assert len(committed) == 1
    return dict(result, held=before, observed=after)


if __name__ == "__main__":
    observed = inspect(Path(sys.argv[1]))
    with Path(sys.argv[2]).open("x") as output:
        json.dump(observed, output, indent=2)
        output.write("\n")

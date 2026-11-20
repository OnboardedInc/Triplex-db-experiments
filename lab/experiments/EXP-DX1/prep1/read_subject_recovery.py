"""Check the loss-of-reply and native erasure observations from the managed stack."""

import json
from pathlib import Path
import re
import sys

from read_probe import managed_events


def inspect(root):
    inputs, terminal, events = managed_events(root)
    attempt = inputs["attempt"]
    assert inputs["mode"] == "subject-recovery"
    tests, held, reopened, erase = events("PREP1_SUBJECT_RECOVERY ")
    assert [row["label"] for row in (tests, held, reopened, erase)] == [
        "tests", "blocked-before-reply", "reopened", "erase-observation"
    ]
    result = tests["value"]
    assert result["test"] > 0 and result["pass"] > 6 and result["fail"] == result["error"] == 0
    before, after = held["value"], reopened["value"]
    assert before["attempt"] == attempt
    assert re.fullmatch(r":triplex\.subject/v-[0-9a-f]{24}", before["function"])
    assert int(before["functionTx"]) > 0
    assert before["nativeT"] == after["nativeT"] == before["receipt"]["t"]["v"]
    assert before["receipt"] == after["claim"]["receipt"]
    assert before["planOperation"] == before["receipt"]["operationId"] == "edit-a"
    assert before["receipt"]["position"]["v"] == "2"
    assert before["receipt"]["recordedAt"]["v"] == 1001.0
    assert after["feed"][:2] == ["_tx/edit-a", 2]
    assert after["originalOperation"] == [409, "OperationDuplicate"]
    assert after["newOperation"] == [409, "CommandConflict"]
    assert events("PREP1_STOP ") == [{"attempt": attempt, "gatewayExit": 137}]
    lines = (root / terminal["log"]).read_text().splitlines()
    assert lines.count("PREP1_SQL_REPLICA streaming sync fsync=on") == 2
    flushes = [line for line in lines if line.startswith("PREP1_SQL_REPLICA durable-through ")]
    assert len(flushes) == 2 and all(
        re.fullmatch(r"PREP1_SQL_REPLICA durable-through [0-9A-F]+/[0-9A-F]+", line) for line in flushes)
    stop = next(i for i, line in enumerate(lines) if line.startswith("PREP1_STOP "))
    boots = [i for i, line in enumerate(lines) if line.startswith("PREP1_NATIVE_END ")]
    reads = [next(i for i, line in enumerate(lines) if line.startswith("PREP1_SUBJECT_RECOVERY ") and label in line)
             for label in ("blocked-before-reply", "reopened")]
    assert reads[0] < stop < boots[0] < reads[1] < boots[1]
    committed = [member for block in events("PREP1_NATIVE ") if block["db"] == before["db"]
                 for member in block["members"] if str(member["t"]) == before["nativeT"]]
    assert len(committed) == 1
    observed = erase["value"]
    assert observed["db"] != before["db"] and int(observed["nativeT"]) > 0
    assert observed["assertion"] == "protected-id"
    assert observed["nativeValuePresent"] is False
    assert observed["builtSubjectFunction"] == before["function"]
    return {"attempt": attempt, "head": inputs["head"], "image": terminal["image"],
            "nativeTests": result, "held": before, "reopened": after, "replicaFlushes": flushes,
            "eraseObservation": observed}


if __name__ == "__main__":
    with Path(sys.argv[2]).open("x") as output:
        json.dump(inspect(Path(sys.argv[1])), output, indent=2)
        output.write("\n")

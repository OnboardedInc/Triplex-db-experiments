"""Compare the native predecessor gate's pinned reads with independent O-REPLAY."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys

from archive import write_json


def verify(out, oracle_cli):
    capture = json.loads((out / "receipt-native.json").read_bytes())
    case = out / "receipt-case.json"
    write_json(case, capture["case"])
    expected = out / "receipt-expected.json"
    assert not expected.exists()
    subprocess.run(["python3", "-I", oracle_cli, case, "-o", expected], check=True, timeout=30)
    oracle = json.loads(expected.read_bytes())
    assert oracle["caseId"] == capture["case"]["caseId"]
    assert oracle["caseSha256"] == hashlib.sha256(case.read_bytes()).hexdigest()
    assert oracle["verdict"] == "PASS" and oracle["receiptConsistency"]["status"] == "PASS"
    assert oracle["commandOutcomes"][4]["expected"]["category"] == "transaction-conflict"
    assert len(oracle["queries"]) == len(capture["reads"]) == 5
    for reply, observed in zip(oracle["queries"], capture["reads"]):
        assert reply["id"] == observed["id"]
        rows = [[row["id"], row["entityId"], row["attribute"], row["value"]["type"], row["value"]["value"]]
                for row in reply["result"]["raw"]]
        assert sorted(rows) == sorted(observed["rows"]), observed["id"]


if __name__ == "__main__":
    verify(Path(sys.argv[1]), Path(sys.argv[2]))

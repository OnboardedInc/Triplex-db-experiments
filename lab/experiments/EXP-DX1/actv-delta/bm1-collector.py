"""Small-envelope gate using the exact BM1 item-6 parser at c07040e4b (3f64655de235880b7a8b0062cd372b89c6107ea5110469a7b617b0f00ed6f3be)."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile


def get(path):
    return json.loads(path.read_bytes())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def delta_output(folder, binding, subjects, offers, releases):
    # [DX-BM1] Why: agree with checkSolo on the R1 setup reference followed by R2 and R3.
    # Rejected: counting only the two measured sweep arms and rejecting the full producer receipt.
    result=get(folder/"result.json")
    request=get(folder/"request.json")
    assert request==binding==result["binding"]
    assert re.fullmatch("[a-f0-9]{40}",binding["source"]) and re.fullmatch("[a-f0-9-]{36}",binding["nonce"])
    assert result["subjects"]==result["target"]["people"]==subjects
    assert len(result["accounts"])==1 and result["loaded"]["count"]==offers
    reference=result["reference"]
    assert [row["release"] for row in reference]==[releases[key] for key in ("R1","R2","R3")]
    assert all(row["people"]==subjects and row["receipts"]>0 and row["position"]>0 and row["end"]>=row["position"] for row in reference)
    assert all(a["position"]<b["position"] for a,b in zip(reference,reference[1:]))
    loaded=folder/"loaded.json"
    assert result["loaded"]["sha"]==digest(loaded)
    tape=get(loaded)["offers"]
    with (folder/"offers.ndjson").open() as stream:
        rows=[json.loads(line) for line in stream]
    assert len(tape)==offers and rows==[{"nonce":binding["nonce"],**row} for row in tape]
    return result

if __name__ == "__main__":
    folder = Path(sys.argv[1])
    n, count = map(int, sys.argv[2:4])
    req = json.load(sys.stdin)
    actual = delta_output(folder, req["binding"], n, count, req["releases"])
    if actual.get("format") == "activation-clock/2":
        # [DX-ACT2] Why: use BM1's independent timing reader on the same seals that the producer compared. Rejected: checking compatible release order while the two processes score different first reads.
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bm1"))
        from activation_clock import activation_modes
        activation_modes(folder, actual, (folder / "request.json").stat().st_mtime)
    with tempfile.TemporaryDirectory(prefix="delta-collector-") as scratch:
        root = Path(scratch)
        for name in ("request.json", "loaded.json", "offers.ndjson"):
            shutil.copyfile(folder / name, root / name)
        refs = actual["reference"]
        for altered in (refs[1:], refs[::-1], [refs[0], refs[1], refs[1]]):
            (root / "result.json").write_text(json.dumps({**actual, "reference": altered}))
            try:
                delta_output(root, req["binding"], n, count, req["releases"])
            except AssertionError:
                continue
            raise AssertionError("the collector accepted the wrong reference identity or order")
    print(json.dumps(actual))

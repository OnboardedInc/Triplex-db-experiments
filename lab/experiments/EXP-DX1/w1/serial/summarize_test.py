"""[DX-INT1] A synthetic 1 billion owner-head arm through summarize.py: per-group reads per save and the aged head.

Run: DX_W1_PAIR_OPTION=owner-head python3 -I lab/experiments/EXP-DX1/w1/serial/summarize_test.py
"""

import hashlib
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import summarize  # noqa: E402

ATTEMPT, SLOT, SOURCE = "a" * 36, "tx2-dxscale1-v01-aaaaaaaaaaaa", "f" * 40


def window(root, rate, first_cut, aged_head, groups, native, lookups, t0):
    seconds, wall, start = 120, 1_000_000, 1_001_200
    tape, writes, journal = [], [], []
    mid = 5_000_000_000
    for i in range(rate * seconds):
        account, subject = i % 10, i
        ms = i * 1000 // rate
        event = {"account": account, "ordinal": i, "subject": subject, "width": 1, "ms": ms, "version": f"serial-{rate}/{i}"}
        tape.append(event)
        groups[f"{account}/{subject}"] = "loader" if subject % 7 == 0 else "seed"
        position, t = first_cut + i + 1, t0 + i
        due = start + ms
        receipt = {"p": position, "t": str(t), "tx": f"tx{t}", "digest": "d", "clock": 1.0 + i}
        stage = {"subjectSave": ":triplex.subject/v-x", "subjectOwnerHeadBytes": 90,
                 "nativeIoStats": {"reads": {"sql": 2 if subject % 7 == 0 else 1, "aevt-load": 1, "eavt-load": 0}},
                 "timeline": {"payloadValidated": 10, "payloadPrepared": 30}}
        writes.append({"account": account, "ordinal": i, "id": ATTEMPT + "-" + event["version"].replace("/", "-"),
                       "subject": subject, "width": 1, "due": due, "db": "s-db", "receipt": receipt, "status": "acked",
                       "sent": due, "end": due + 5, "stage": stage})
        journal.append({"position": position, "db": "s-db", "id": writes[-1]["id"], "tx": f"tx{t}", "digest": "d", "clock": 1.0 + i})
        at = mid + (due - wall) * 1_000_000
        native.append({"db": "s-db", "start": at, "end": at, "members": [{"t": t, "read-at": at - 3, "started-at": at - 2, "applied-at": at - 1}]})
        if i % 64 == 0:
            lookups.append({"attempt": ATTEMPT, "kind": "PREP1_LOOKUPS", "sampleEvery": 64, "db": "s-db", "t": str(t), "start": at - 2,
                            "end": at - 1, "lookupCount": 1, "lookupLimit": 4, "lookups": {"p": {"calls": 1, "reads": {"sql": 1}, "wallNs": 5}},
                            "outsideSql": {}})
    ops = {"writes": writes, "journal": journal, "tape": tape, "ownerGroups": {k: groups[k] for k in (f"{e['account']}/{e['subject']}" for e in tape)}}
    folder = root / str(rate)
    folder.mkdir()
    raw = json.dumps(ops).encode()
    (folder / "operations.json").write_bytes(raw)
    header = {"slot": SLOT, "attempt": ATTEMPT, "source": SOURCE, "start": start, "firstCut": first_cut, "terminal": first_cut + rate * seconds,
              "retirement": {"rate": rate, "append": True, "seconds": seconds, "agedHead": aged_head},
              "settings": {"creditMode": "rolling6", "observed": {"subjectOwnerHead": True, "subjectFunction": ":triplex.subject/v-x"}},
              "observationsSha256": hashlib.sha256(raw).hexdigest(), "tapeSha256": "0" * 64,
              "serialAnchor": {"wall": wall, "before": str(mid - 10), "after": str(mid + 10)}, "ownerGroupPeople": {"loader": 1, "seed": 1}}
    (folder / "arm.json").write_text(json.dumps(header))
    return first_cut + rate * seconds, t0 + rate * seconds


def main():
    assert os.environ.get("DX_W1_PAIR_OPTION") == "owner-head"
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory) / "append"
        (root / "engines" / SLOT / "trace/raw").mkdir(parents=True)
        (root / "attempt.json").write_text(json.dumps({"slot": SLOT, "attempt": ATTEMPT, "source": SOURCE}))
        native, lookups, groups = [], [], {}
        aged_head = 28_309_866
        cut, t = window(root, 50, aged_head, aged_head, groups, native, lookups, 100)
        window(root, 235, cut, aged_head, groups, native, lookups, t)
        trace = root / "engines" / SLOT / "trace/raw"
        with (trace / "prep1-native.ndjson").open("w") as f:
            for block in native:
                f.write(json.dumps({"attempt": ATTEMPT, **block}) + "\n")
            f.write(json.dumps({"attempt": ATTEMPT, "end": True, "dropped": 0}) + "\n")
        with (trace / "prep1-lookups.ndjson").open("w") as f:
            for event in lookups:
                f.write(json.dumps(event) + "\n")
            f.write(json.dumps({"attempt": ATTEMPT, "end": True, "dropped": 0}) + "\n")
        summarize.summarize(root, SLOT, ATTEMPT, SOURCE, "1B", "rolling6")
        result = json.loads((root / "retirement-diagnostic.json").read_text())
        for w in result["windows"]:
            assert w["agedHead"] == aged_head
            late = w["halves"][1]["byOwnerGroup"]
            assert set(late) == {"loader", "seed"}
            assert late["loader"]["sqlReadsPerSave"]["mean"] == 2 and late["seed"]["sqlReadsPerSave"]["mean"] == 1
            assert late["loader"]["saves"] + late["seed"]["saves"] == w["halves"][1]["sqlSamples"]
        print("summarize per-group test passed", [(w["rate"], {g: v["saves"] for g, v in w["halves"][1]["byOwnerGroup"].items()}) for w in result["windows"]])


if __name__ == "__main__":
    main()

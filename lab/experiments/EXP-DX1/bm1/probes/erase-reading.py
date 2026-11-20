"""Compare the ERASE1 producer's numbers with its bound native observations."""

import hashlib
import json
import math
from pathlib import Path
import sys


def read(path):
    return json.loads(path.read_bytes())


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def samples(rows):
    values = sorted(row["ms"] for row in rows)
    assert values and all(math.isfinite(v) and v >= 0 for v in values)
    n = len(values)
    return {"n": n, "p50": values[math.ceil(n*.50)-1], "p99": values[math.ceil(n*.99)-1]}


def check(folder, producer, staged=None, source=None):
    root = Path(folder)
    native = read(root/"native.json")
    outcome = read(root/"result.json")
    assert native == {key:value for key,value in outcome.items() if key!="data"}
    assert read(root/"driver-exit.json") == {"code":0,"signal":None}
    assert producer["people"] == native["people"] and producer["facts"] == outcome["data"]["facts"]
    count = 8 if native["mode"] == "smoke" else 500
    if staged:
        stage = read(staged)
        assert native["slot"] == "prepared" and native["stageSha256"] == sha(staged)
        assert stage["source"] == native["source"] == source
        assert stage["nonce"] == native["nonce"] and stage["builds"] == native["builds"]
        assert stage["people"] == native["people"] == 100_000
        assert (root/"native.json").stat().st_mtime >= staged.stat().st_mtime
    else:
        assert native["mode"] == "smoke" and native["people"] == 24
        cleanup = read(root/"cleanup.json")
        assert cleanup["nonce"] == native["nonce"] and cleanup["released"] and not cleanup["errors"]
        assert set(cleanup["removedContainers"]) == set(native["containers"].values())

    def data(name):
        record = read(root/f"{name}.json")
        assert {key:value for key,value in record.items() if key!="data"} == native
        return record["data"]

    # [DX-BM1] Why: fresh native readbacks and the matched raw blocks must agree with both displayed timings.
    # Rejected: counting a successful stage or bare archive as an erasure measurement.
    results = []
    assert len(producer["entries"]) == len(outcome["data"]["arms"]) == 2
    for i, (published, arm) in enumerate(zip(producer["entries"], outcome["data"]["arms"])):
        req = arm["erase"]
        plan, fresh = data(f"plan-{i}"), data(f"fresh-{i}")
        assert len(plan["group"]["people"]) == published["people"]
        assert req["t"] == fresh["t"] == published["t"]
        assert fresh["snapshot"]["basis"] >= req["t"] and req["requestToSyncMs"] == published["syncMs"]
        assert abs(req["ackMs"] + req["ackToSyncMs"] - req["requestToSyncMs"]) < .001
        assert not any(fresh["snapshot"]["values"]) and not any(fresh["snapshot"]["atPin"])
        assert not any(fresh["snapshot"]["inHistory"]) and all(r["selected"] == 0 for r in fresh["log"])
        assert all(fresh["snapshot"][k]["datoms"] == 0 for k in ("domain","journal","domainHistory","journalHistory"))
        control, live = data(f"traffic-control-{i}"), data(f"traffic-erase-{i}")
        assert live["result"] == req
        assert len(control["saved"]) == len(live["saved"]) == count
        for family in ("saved","reads"):
            assert published["samples"][family]["control"] == samples(control[family])
            assert published["samples"][family]["whole"] == samples(live[family])
        results.append({"people":published["people"], "t":req["t"], "syncMs":published["syncMs"],
                        "indexMs":published["indexMs"], "samples":published["samples"]})
    return {"source":source,"nonce":native["nonce"],"binding":native["binding"],"people":native["people"],
            "resultSha256":sha(root/"result.json"),"nativeLogSha256":sha(root/"tx.log"),"entries":results}


if __name__ == "__main__":
    report = Path(sys.argv[2])
    stage, source = (Path(sys.argv[3]), sys.argv[4]) if len(sys.argv) == 5 else (None, None)
    result = check(Path(sys.argv[1]), read(report), stage, source)
    print(json.dumps({**result, "producerSha256":sha(report)}, indent=2))

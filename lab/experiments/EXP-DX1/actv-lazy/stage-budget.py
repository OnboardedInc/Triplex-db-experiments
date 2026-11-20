"""Reconstruct additive first-read budgets from a sealed local timing attempt."""
import hashlib
import json
import re
import statistics
import sys
from pathlib import Path


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def summarize(directory):
    verified = json.loads((directory / "verified.json").read_text())
    attempt = json.loads((directory / "attempt.json").read_text())
    assert {k: verified[k] for k in attempt} == attempt
    assert attempt["mode"] == "--timing" and digest(directory / "inputs.json") == attempt["inputs"]
    assert digest(directory / "owner.json") == attempt["owner"]
    for file, expected in verified["outputs"].items():
        assert digest(directory / file) == expected, file
    result = {}
    for fmt in ("w0", "act2-deep"):
        data = json.loads((directory / (fmt + "-stages.json")).read_text())
        assert data["format"] == fmt and data["path"] == attempt["size"]
        result[fmt] = scopes = {}
        for load in ("quiet", "saves"):
            cpu = json.loads((directory / (fmt + "-" + load + ".json")).read_text())
            a, b = cpu
            assert all((c["volume"], c["slot"]) == (attempt["volume"], attempt["slot"]) for c in cpu)
            us = (b["at"] - a["at"]) * 1000
            fields = [list(map(int, c["stat"].splitlines()[0].split()[1:9])) for c in cpu]
            diff = [y-x for x, y in zip(*fields)]
            def counter(pattern):
                x, y = [int(re.search(pattern, c["stat"], re.M)[1]) for c in cpu]
                return y-x
            scopes[load] = groups = {"cpu": {
                "guestBusyPct": (sum(diff)-diff[3]-diff[4])*100/sum(diff),
                "guestRunnablePct": counter(r"^some .*total=(\d+)")*100/us,
                "slotCores": counter(r"^usage_usec (\d+)")/us,
                "slotThrottles": counter(r"^nr_throttled (\d+)"),
            }}
            for fresh in (False, True):
                samples = []
                for row in data["rows"]:
                    if row["fresh"] != fresh or row["load"] != load:
                        continue
                    s, r, repeat = row["setup"], row["read"], row["repeat"]
                    assert r["scope"] == data["scope"] and r["basis"]["tx"] >= row["p"]
                    mark = lambda name: next(v["at"] for v in r["stamps"] if v["phase"] == name)
                    after = row["returned"]
                    budget = {
                        "publish": row["nativeAck"] - row["offer"],
                        "receipt": after-row["nativeAck"],
                        "driver": (s["launch"] if fresh else r["requested"])-after,
                        "spawn": s["entry"]-s["launch"] if fresh else 0,
                        "imports": s["imported"]-s["entry"] if fresh else 0,
                        "open": s["connected"]-s["opening"] if fresh else 0,
                        "ipc": (r["requested"]-s["connected"]+s["opening"]-s["imported"] if fresh else 0) + r["begin"]-r["requested"]+r["received"]-r["done"]+mark("head")-r["begin"]+r["done"]-mark("return"),
                        "head": mark("pin")-mark("head"),
                        "pin": mark("controls")-mark("pin"),
                        "controls": mark("erasure-before")-mark("controls"),
                        "precheck": mark("memo")-mark("erasure-before"),
                        "memo": mark("world")-mark("memo"),
                        "pull": mark("kernel")-mark("world"),
                        "evaluate": mark("erasure-after")-mark("kernel"),
                        "postcheck": mark("return")-mark("erasure-after"),
                    }
                    assert min(budget.values()) >= -0.002
                    assert abs(sum(budget.values()) - (r["received"]-row["offer"])) < 0.01
                    def overlap(q, lo, hi):
                        return max(0, min(hi,q["ack"])-max(lo,q["transmit"])) if q else 0
                    samples.append({**budget, "offerToRead":r["received"]-row["offer"], "afterDurable":r["received"]-row["nativeAck"],
                        "first":r["done"]-r["begin"], "repeat":repeat["done"]-repeat["begin"],
                        "firstHttp":len(r["requests"]), "repeatHttp":len(repeat["requests"]),
                        "socketQueue":sum(q["socket"]-q["start"] for q in r["requests"]),
                        "publishOverlap":overlap(row["publishSave"],row["offer"],row["nativeAck"]),
                        "readOverlap":overlap(row["readSave"],r["begin"],r["done"])})
                assert len(samples) == 4
                groups["fresh" if fresh else "connected"] = {measure: {k: round(fn(x[k] for x in samples),3) for k in samples[0]}
                    for measure, fn in (("mean",statistics.mean),("median",statistics.median),("max",max))}
    return {"source":attempt["source"], "nonce":attempt["nonce"], "path":attempt["size"], "groups":result}


if __name__ == "__main__":
    print(json.dumps(summarize(Path(sys.argv[1])), indent=2))

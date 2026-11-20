"""Price complete dispatch windows against the same offered prefix of each control."""
from pathlib import Path
import argparse
from datetime import datetime
from hashlib import sha256
import importlib.util
import json
import math
import re

spec = importlib.util.spec_from_file_location("notice_analysis", Path(__file__).with_name("rate-analysis.py"))
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)


def read_tail(a, raw_reads, rows):
    """Bind the exact p99 read only when its cut and wall interval isolate a single request."""
    r = sorted(raw_reads, key=lambda q:q["latency"])[math.ceil(.99 * len(raw_reads))-1]
    at = a["startedAt"] + r["beganMs"]
    end = at + r["latency"]
    candidates=[q for q in rows if q["kind"]=="pinned" and q.get("cut")==r["position"] and q["start"] >= at-.001 and q["end"] <= end+.002]
    # The first operation is the actual public read; ambiguities are retained as missing.
    if len(candidates)!=1: return {"latency":r["latency"], "matches":len(candidates)}
    q=candidates[0]; requests=q["samples"]
    result={"latency":r["latency"],"matches":1,"cut":r["position"],"trace":q.get("trace"),"clientScheduledWait":r["beganMs"]-r["atMs"],"pinnedMs":q["end"]-q["start"],"httpMs":sum(s["wallMs"] for s in requests),"gatewayReportedMs":sum(s["gatewayMicros"] for s in requests if s["gatewayMicros"] is not None)/1000}
    if "socket" in q: result["socket"]=q["socket"]
    if requests and all("waitedForBasis" in s for s in requests):
        result["basisWaits"] = sum(s["waitedForBasis"] for s in requests)
    return result


def price(a, obs, control_dir):
    b, raw = analysis.arm(control_dir)
    assert b["mode"] == "baseline" and a["duration"] <= b["duration"]
    # The paired baseline has no sender. Moving only the sender can reuse it.
    assert (a.get("route","source") == "source") == (b.get("route","source") == "source")
    assert a.get("releases",1) == b.get("releases",1)
    assert a.get("savePeriodMs",625) == b.get("savePeriodMs",625)
    assert a["shape"] == b["shape"] and a["n"] == b["n"] and a["readers"] == b["readers"]
    assert a["scope"] != b["scope"] and a["receiver"] != b["receiver"] and a["sourceClock"] == b["sourceClock"]
    assert a["pins"] == b["pins"] and a["binding"]["slot"] == b["binding"]["slot"]
    reads = [s for s in raw["reads"] if s["atMs"] < a["duration"]]
    saves = [s for s in raw["saves"] if s["atMs"] < a["duration"]]
    def offers(rows): return [(s["seq"], s["atMs"]) for s in rows]
    assert offers(saves) == offers(obs["saves"]) and len(saves)>0
    if a["shape"] == "fixture":
        def reads_at(rows): return sorted((s["ordinal"],s["atMs"],s["subject"]) for s in rows)
        assert reads_at(reads) == reads_at(obs["reads"])
    pr = analysis.p99([s["latency"] for s in reads])
    pw = analysis.p99([s["ackMs"] for s in saves])
    baseTail = read_tail(b,reads,analysis.data(control_dir,"foreground",b)) if b["profiled"] else None
    live_reads = lambda rows: sum(r["beganMs"] + r["latency"] <= a["duration"] for r in rows)
    live_saves = lambda rows: sum(r["atMs"] + r["ackMs"] <= a["duration"] for r in rows)
    enoughReads = min(live_reads(reads), live_reads(obs["reads"])) >= 500
    enoughSaves = min(live_saves(saves), live_saves(obs["saves"])) >= 500
    return dict(baseReadTail=baseTail,control=control_dir.name, readP99=pr,saveP99=pw,readRatio=a["readP99"]/pr,saveRatio=a["saveP99"]/pw,enoughReads=enoughReads,enoughSaves=enoughSaves,liveReads=[live_reads(obs["reads"]),live_reads(reads)],liveSaves=[live_saves(obs["saves"]),live_saves(saves)],withinBoth=enoughReads and enoughSaves and a["readP99"]<=1.5*pr and a["saveP99"]<=1.5*pw,reads=len(reads),saves=len(saves))


def pauses(directory, arm, raw):
    result = {}
    for role, digest in (arm.get("gatewayGc") or {}).items():
        data = (directory / f"{role}-gc.log").read_bytes()
        assert sha256(data).hexdigest() == digest
        events = []
        for line in data.decode().splitlines():
            match = re.search(r"^\[([^]]+)\].*GC\(\d+\) Pause .* (\d+\.\d+)ms$", line)
            if match:
                end = datetime.fromisoformat(match[1]).timestamp() * 1000 - arm["startedAt"]
                if 0 <= end <= arm["duration"]:
                    events.append((end - float(match[2]), end))
        summary = dict(count=len(events), pauseMs=sum(end - start for start, end in events))
        for field, latency in [("reads", "latency"), ("saves", "ackMs")]:
            rows = sorted(raw[field], key=lambda x: -x[latency])[:50]
            end = (lambda r: r["beganMs"] + r[latency]) if field == "reads" else (lambda r: r["atMs"] + r[latency])
            summary[field + "Slow50Overlap"] = sum(any(r["beganMs"] < b and end(r) > a for a, b in events) for r in rows)
        result[role] = summary
    return result


if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--controls",nargs="+",type=Path,required=True)
    p.add_argument("--active",nargs="+",type=Path,required=True)
    args=p.parse_args()
    results=[]
    for d in args.active:
        a,obs=analysis.arm(d)
        assert a["mode"]=="active"
        tail=read_tail(a,obs["reads"],analysis.data(d,"foreground",a)) if a["profiled"] else None
        results.append(dict(readTail=tail,gatewayGc=pauses(d,a,obs),name=d.name,route=a.get("route","source"),pages=a["batchPages"],rate=a["deliveriesPerSecond"],effects=a["proof"]["effects"],release=a["dispatch"]["deliveries"],readP99=a["readP99"],saveP99=a["saveP99"],reads=a["readCount"],saves=a["saveCount"],comparisons=[price(a,obs,c) for c in args.controls]))
    print(json.dumps(results,indent=2))

"""Price complete dispatch windows against the same offered prefix of each control."""
from pathlib import Path
import argparse
import importlib.util
import json
import math

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
    return result


def price(a, obs, control_dir):
    b, raw = analysis.arm(control_dir)
    assert b["mode"] == "baseline" and a["duration"] <= b["duration"]
    assert a.get("route","source") == b.get("route","source") and a.get("releases",1) == b.get("releases",1)
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
    return dict(baseReadTail=baseTail,control=control_dir.name, readP99=pr,saveP99=pw,readRatio=a["readP99"]/pr,saveRatio=a["saveP99"]/pw,withinBoth=a["readP99"]<=1.5*pr and a["saveP99"]<=1.5*pw,reads=len(reads),saves=len(saves))


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
        results.append(dict(readTail=tail,name=d.name,pages=a["batchPages"],rate=a["deliveriesPerSecond"],effects=a["proof"]["effects"],release=a["dispatch"]["deliveries"],readP99=a["readP99"],saveP99=a["saveP99"],reads=a["readCount"],saves=a["saveCount"],comparisons=[price(a,obs,c) for c in args.controls]))
    print(json.dumps(results,indent=2))

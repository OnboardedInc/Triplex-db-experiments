"""Recompute notification costs from the same admitted traffic, receipts and native timelines."""
import argparse
import collections
import gzip
import hashlib
import json
import math
import re
import subprocess
from pathlib import Path


def digest(b):
    return hashlib.sha256(b).hexdigest()


def get(p):
    return json.loads(gzip.decompress(p.read_bytes()) if p.suffix == ".gz" else p.read_bytes())


def p99(xs):
    return sorted(xs)[math.ceil(.99 * len(xs)) - 1] if xs else None


def arm(d):
    a = get(d / "arm.json")
    b = get(d / "binding.json")
    assert b == a["binding"] and digest((d / "owner.json").read_bytes()) == b["owner"]
    assert get(d / "owner.json")["container"] == b["slot"] and a["epoch"] == b["nonce"]
    assert a["scope"] == "notice-" + a["epoch"] and a["receiver"] == "act1-notify-" + a["epoch"]
    assert a["raw"] == digest((d / "traffic.json.gz").read_bytes())
    for file, sha in a["pins"].items():
        assert re.fullmatch(r"[a-z-]+\.(ts|py)", file) and re.fullmatch("[a-f0-9]{40}", b["source"])
        assert digest(subprocess.check_output(["git","show",b["source"]+":lab/experiments/EXP-DX1/notify1/"+file])) == sha
    raw = get(d / "traffic.json.gz")
    assert a["activation"]["txId"] == raw["history"][1]["receipt"]["txId"] and a["activation"]["operations"] == 4
    assert len(raw["reads"]) == a["readCount"] and len(raw["saves"]) == a["saveCount"]
    assert p99([s["ackMs"] for s in raw["saves"]]) == a["saveP99"]
    assert p99([s["latency"] for s in raw["reads"]]) == a["readP99"]
    if a["mode"] != "baseline":
        p = a["proof"]
        assert p["subjects"] == p["receiverStates"] == p["ledgerStates"] == a["n"] and sum(p["eventCounts"]) == p["effects"]
        assert a["dispatch"]["deliveries"] == p["eventCounts"][1] > 0
        assert a["deliveriesPerSecond"] == 1000*a["dispatch"]["deliveries"]/a["duration"]
    return a,raw


def cpu(a):
    old,new = a["cpuBefore"],a["cpuAfter"]
    assert old["owner"] == new["owner"] == a["sourceClock"] and new["slot"] == old["slot"] == a["binding"]["slot"]
    sec=(new["at"]-old["at"])/1000
    assert sec>0 and new["quota"] == old["quota"]
    def busy(x,y):
        delta=[b-a for a,b in zip(x,y,strict=True)]
        assert min(delta)>=0
        return (sum(delta)-delta[3]-delta[4])/sum(delta)
    return dict(seconds=sec,cores=(new["groupUsec"]-old["groupUsec"])/1e6/sec,quota=new["quota"],vmBusy=[busy(x,y) for x,y in zip(old["cpu"],new["cpu"],strict=True)],pressure=(new["psiUsec"]-old["psiUsec"])/1e6/sec,throttledSeconds=(new["throttledUsec"]-old["throttledUsec"])/1e6,appCores=sum(a["processCpu"].values())/1e6/sec)


def data(d,role,a):
    o=get(d / (role+"-budget.json.gz"))
    assert o["epoch"]==a["epoch"] and o["role"]==role
    return o["rows"]


def partition(rows,start,duration):
    changes=[(start,False,""),(start+duration,False,"")]
    categories=["sleep","foreground-grant","kernel","publish-and-pack","source-derive","source-ack","receiver-write","receiver-state","source-ledger","source-data","source-metadata"]
    for r in rows:
        k=r["kind"]
        if k=="write": k="receiver-write" if r["role"]=="receiver" else "source-ack" if r["operation"]=="cursor" else "source-derive"
        if k in ("head","pinned","lookup"):
            if r["role"]=="receiver": k="receiver-state"
            elif r.get("key")=="ledger": k="source-ledger"
            elif r.get("key") in ("notice-fixture","pl","plact","placement"): k="source-data"
            else:k="source-metadata"
        if k not in categories:continue
        l=max(start,r["start"]);h=min(start+duration,r["end"])
        if h<=l:continue
        changes.extend([(l,True,k),(h,False,k)])
    running=collections.Counter(); totals=collections.Counter();t=start
    for at,begin,k in sorted(changes):
        if at>t: totals[next((c for c in categories if running[c]),"startup-other")]+=at-t
        if k:running[k]+=1 if begin else -1
        t=at
    assert abs(sum(totals.values())-duration)<.01 and not any(running.values())
    return totals


def stats(d):
    a,raw=arm(d); out=dict(name=d.name,mode=a["mode"],source=a["binding"]["source"],epoch=a["epoch"],cpu=cpu(a),duration=a["duration"],reads=a["readCount"],saves=a["saveCount"],readP99=a["readP99"],saveP99=a["saveP99"])
    if not a["profiled"]:return out
    fg=data(d,"foreground",a)
    saves={s["txId"]:s for s in raw["saves"]}
    written={r["txId"]:r for r in fg if r["kind"]=="write"}
    assert set(written)==set(saves)
    if saves:
        tail=max(saves.values(),key=lambda s:s["ackMs"]) if len(saves)<100 else sorted(saves.values(),key=lambda s:s["ackMs"])[math.ceil(.99*len(saves))-1]
        w=written[tail["txId"]]
        assert w["position"]==tail["position"]
        out["saveTail"]={"ack":tail["ackMs"],"scheduledWait":tail["beganMs"]-tail["atMs"],"beforeAppend":tail["appendMs"]-tail["beganMs"],"storeCommit":w["end"]-w["start"],"native":w["samples"],"clientOrderWait":sum(z["orderWaitMs"] or 0 for c in w["commits"] for z in c["attempts"])}
    if a["mode"]=="baseline":return out
    rows=data(d,"worker",a);m=a["dispatch"];ds=m["deliveries"]
    writes=[r for r in rows if r["kind"]=="write"]
    assert len({(r["role"],r["txId"]) for r in writes})==len(writes)
    assert sum(r["role"]=="source" for r in writes)==m["sourceWrites"] and sum(r["role"]=="receiver" for r in writes)==m["sinkWrites"]
    out["rate"]=ds*1000/a["duration"]
    out["counts"]=counts={}
    for role in ["source","receiver"]:
        rr=[r for r in rows if r.get("role")==role]
        samples=[s for r in rr for s in r["samples"]]
        counts[role]={"writes":sum(r["kind"]=="write" for r in rr),"pinned":sum(r["kind"]=="pinned" for r in rr),"roots":sum(r.get("roots",0) for r in rr),"heads":sum(r["kind"]=="head" for r in rr),"lookups":sum(r["kind"]=="lookup" for r in rr),"http":sum(r["requests"] for r in rr),"httpSamples":len(samples),"wireIn":sum(q["requestBytes"] for q in samples),"wireOut":sum(q["responseBytes"] for q in samples),"opBytes":sum(r.get("opBytes",0) for r in rr)}
        assert counts[role]["http"]==len(samples)
    packets=[r for r in rows if r["kind"]=="deliveries"]
    assert sum(r["count"] for r in packets)==ds and len({r["batch"] for r in packets})==m["packets"]
    counts.update(deliveries=ds,evaluations=sum(r["evaluations"] for r in rows if r["kind"]=="kernel"),payloadBytes=sum(r["payloadBytes"] for r in packets),deliveryBytes=sum(r["deliveryBytes"] for r in packets))
    assert counts["evaluations"]==m["evaluations"]
    out["ms"]=partition(rows,a["startedAt"],a["duration"])
    out["gateway"]={}
    for role,ops in [("dispatch",[r for r in writes if r["role"]=="source"]),("saves",list(written.values()))]:
        timeline=[q["timeline"] for r in ops for q in r["samples"] if q.get("timeline")]
        assert len(timeline)==len(ops)
        out["gateway"][role]={"count":len(ops),"clientOrderedSamples":sum(z["orderWaitMs"] is not None for r in ops for c in r["commits"] for z in c["attempts"]),"clientOrderMs":sum(z["orderWaitMs"] or 0 for r in ops for c in r["commits"] for z in c["attempts"]),"predecessorMs":sum(t["predecessorReady"]-t["payloadPrepared"] for t in timeline)/1000,"peerAfterSubmitMs":sum(t["completed"]-t["submitted"] for t in timeline)/1000}
    return out


if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("arms",nargs="+",type=Path)
    print(json.dumps([stats(d) for d in p.parse_args().arms],indent=2))

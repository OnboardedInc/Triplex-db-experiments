"""Join a gateway submission and a native transaction function by trace, parent and guest clock."""
import argparse
import importlib.util
import collections
import gzip
import hashlib
import json
import subprocess
from pathlib import Path

spec = importlib.util.spec_from_file_location("notice_analysis", Path(__file__).with_name("rate-analysis.py"))
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)


def get(p):
    return json.loads(p.read_bytes())


def lines(p):
    if not p.is_file():
        p = p.with_name(p.name + ".gz")
    with (gzip.open(p, "rt") if p.suffix == ".gz" else p.open()) as f:
        for line in f:
            if line.strip():yield json.loads(line)


def coverage(spans):
    end=-float("inf");total=0
    for a,b in sorted(spans):
        if b>max(a,end):total+=b-max(a,end)
        end=max(b,end)
    return total


def native(d, trace):
    a,raw=analysis.arm(d)
    cfg=get(d/"allocation.json")["slots"]["datomic"]["stg1"]
    binding=a["binding"]
    for component in ["lab/bin/engine.mjs","lab/config/datomic","packages/datomic/gateway"]:
        def object_id(revision):
            return subprocess.check_output(["git","rev-parse",revision+":"+component]).strip()
        assert object_id(cfg["traceSource"]) == object_id(binding["source"])
    receipt=next(lines(trace/"tx.jfr-complete.jsonl"))
    assert receipt["fileSha256"]==hashlib.sha256((trace/"tx.jfr").read_bytes()).hexdigest()
    check=lambda r:r["source"]==cfg["traceSource"] and r["run"]==cfg["traceRun"] and r["slot"]==binding["slot"]
    assert check(receipt)
    wanted={}
    for role,file in [("live","foreground"),("dispatch","worker")]:
        path=d/(file+"-budget.json.gz")
        if not path.exists():
            assert role=="dispatch" and a["mode"]=="baseline";continue
        b=json.loads(gzip.decompress(path.read_bytes()));assert b["epoch"]==a["epoch"]
        for op in b["rows"]:
            if op["kind"]!="write" or op["role"]=="receiver":continue
            assert op["trace"] and op["trace"] not in wanted and op["txId"];wanted[op["trace"]]=(role,op)
    assert {op["txId"] for role,op in wanted.values() if role=="live"}=={s["txId"] for s in raw["saves"]}
    assert sum(role=="dispatch" for role,op in wanted.values())==a["dispatch"]["sourceWrites"]
    gateway={};fn={}
    for r in lines(trace/"gateway.jsonl"):
        if r.get("traceId") in wanted and r["name"].endswith("/transact") and r["attributes"].get("status")==200:
            assert check(r) and not r["truncated"] and r["traceId"] not in gateway;gateway[r["traceId"]]=r
    for r in lines(trace/"tx.jfr.jsonl"):
        if r.get("traceId") in wanted and r.get("name")=="transactor.triplex-function":
            assert check(r) and r["traceId"] not in fn;fn[r["traceId"]]=r
    assert set(wanted)==set(gateway)==set(fn), (len(wanted),len(gateway),len(fn))
    commits=[]
    for key,(role,o) in wanted.items():
        g=gateway[key]; f=fn[key]
        assert g["clock"]["bootId"]==f["clock"]["bootId"] and f["clock"]["crossProcessQualified"]
        parent=next(s for s in g["spans"] if s["id"]==f["parent"])
        sub=next(s for s in g["spans"] if s["name"]=="d/transact-async")
        assert parent["name"].startswith("peer.transact-await")
        gc=g["clock"]["offsetMs"];fc=f["clock"]["offsetMs"]
        commits.append(dict(role=role,pos=o["position"],trace=key,submit=sub["end"]-gc,entry=f["start"]-fc,exit=f["end"]-fc,end=parent["end"]-gc,uncertainty=g["clock"]["uncertaintyMs"]+f["clock"]["uncertaintyMs"]))
    assert len(set(q["pos"] for q in commits))==len(commits)
    out={}
    for role in ["live","dispatch"]:
        rs=[r for r in commits if r["role"]==role]
        if not rs:continue
        lower=upper=before=total=0
        for q in rs:
            t0=q["submit"];t1=max(t0,q["entry"])
            older=[r for r in commits if r["pos"]<q["pos"] and r["role"]!=role]
            lower+=coverage([(max(t0,r["entry"]),min(t1,r["exit"])) for r in older if min(t1,r["exit"])>max(t0,r["entry"])])
            upper+=coverage([(max(t0,r["submit"]),min(t1,r["end"])) for r in older if min(t1,r["end"])>max(t0,r["submit"])])
            before+=t1-t0;total+=q["end"]-t0
        out[role]=dict(commits=len(rs),preFunctionMs=before,functionMs=sum(q["exit"]-q["entry"] for q in rs),postFunctionMs=sum(q["end"]-q["exit"] for q in rs),submitToAckMs=total,overlapPriorOtherFunctionMs=lower,overlapPriorOtherOutstandingMs=upper,maxClockUncertaintyMs=max(q["uncertainty"] for q in rs))
    return dict(name=d.name,source=binding["source"],nonce=a["epoch"],native=out)

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("trace",type=Path);p.add_argument("arms",nargs="+",type=Path);args=p.parse_args()
    print(json.dumps([native(d,args.trace) for d in args.arms],indent=2))

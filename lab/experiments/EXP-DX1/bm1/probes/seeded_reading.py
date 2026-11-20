"""Verify and summarize the per-offer, per-transaction and PostgreSQL records."""
import hashlib
import json
from collections import Counter, defaultdict
import math
from pathlib import Path


def get(path):
    return json.loads(path.read_bytes())


def sha(path):
    with path.open("rb") as f:
        return hashlib.file_digest(f,"sha256").hexdigest()


def rows(path):
    with path.open() as f:
        for line in f:
            yield json.loads(line)


def pct(xs,p):
    if not xs:return None
    assert all(math.isfinite(x) and x>=0 for x in xs)
    return sorted(xs)[(p*len(xs)+99)//100-1]


def dist(values):
    return {"n":len(values),"p50":pct(values,50),"p99":pct(values,99)}


def summarize(directory,mode,source,checkpoint,small=False):
    # [DX-BM1] Why: count scheduled offers and unresolved outcomes before deriving any phase ratio.
    # Rejected: dividing by surviving ACKs or borrowing a native counter from a nearby transaction.
    result=get(directory/"result.json")
    proof=get(directory/"attempt.json")
    plan=get(directory/"plan.json")
    clock=get(directory/"clock.json")
    assert plan==result["plan"] and plan["source"]==proof["source"]==clock["source"]==source
    assert plan["slot"]==proof["slot"]==clock["slot"] and plan["nonce"]==proof["nonce"]==clock["nonce"]
    assert plan["stage"]==mode and plan["seed"]==sha(checkpoint) and plan["smoke"] is small
    assert get(directory/"cleanup.json")=={"slot":proof["slot"],"source":source,"remaining":[]}
    assert sha(directory/"offers.jsonl")==result["tapeSha256"] and sha(directory/"outcomes.jsonl")==result["outcomesSha256"]
    offers=list(rows(directory/"offers.jsonl"))
    observations=list(rows(directory/"outcomes.jsonl"))
    assert len(offers)==len(observations)==plan["offers"]
    by_offer={x["ordinal"]:x for x in offers}
    assert set(by_offer)==set(range(plan["offers"]))=={x["ordinal"] for x in observations}
    dispositions=Counter(o["disposition"] for o in observations)
    assert dispositions==Counter(result["dispositions"])
    assert set(dispositions)<={"ack","expired-before-submit","unsent-at-cutoff","submitted-without-ack"}
    for r in observations:
        assert all(r[k]==v for k,v in by_offer[r["ordinal"]].items())
        if r["disposition"]=="ack":
            assert r["offset"]<=r["submitted"]<=r["firstPacket"]<=r["ackAt"]
    successful=[r for r in observations if r["disposition"]=="ack"]
    assert len(successful)==result["found"] and len({r["pos"] for r in successful})==len(successful)
    own={r["t"] for r in successful}
    raw=directory/"engines"/plan["slot"]/"trace/raw"
    proof_trace=get(raw/"tx.jfr-complete.jsonl")
    assert proof_trace["source"]==source and proof_trace["slot"]==plan["slot"] and proof_trace["fileSha256"]==sha(raw/"tx.jfr")
    assert proof_trace["recordingStart"]<=clock["startAt"]<=proof_trace["at"]
    dbhash=hashlib.sha256(plan["db"].encode()).hexdigest()
    native={}
    for e in rows(raw/"tx.jfr.jsonl"):
        if e.get("nativeType")!="triplex.NativeTransaction" or e["databaseHash"]!=dbhash or e["datomicT"] not in own:continue
        assert e["process"]=="tx" and e["source"]==source and e["slot"]==e["run"]==plan["slot"] and e["clock"]["bootId"]==proof_trace["clock"]["bootId"]
        assert e["datomicT"] not in native
        native[e["datomicT"]]=e["nativeStats"]
    # Preserve a diagnostic sample if the recorder stops before exporting each native turn.
    cells=[]
    for i,w in enumerate(plan["intervals"]):
        n=[r for r in observations if r["cell"]==i]
        confirmed=[r for r in n if r["disposition"]=="ack"]
        joined={r["t"]:native[r["t"]] for r in confirmed if r["t"] in native}
        durations=[r["ackAt"]-r["offset"] for r in confirmed]
        group=Counter(r["t"] for r in confirmed)
        clocks=[r["prepare"] for r in confirmed if r.get("prepare") is not None]
        staged={r["t"]:r["stages"] for r in confirmed if r.get("stages") is not None}
        cells.append({"rate":w["rate"],"offered":len(n),"ack":len(confirmed),
                      "inWindow":sum(w["from"]*1000<=r["ackAt"]<(w["from"]+w["seconds"])*1000 for r in confirmed),
                      "goal50":sum(x<=50 for x in durations),
                      "outcomes":Counter(r["disposition"] for r in n),"p50":pct(durations,50),"p99":pct(durations,99),
                      "firstPacketP99":pct([r["firstPacket"]-r["offset"] for r in confirmed],99),
                      "physicalTurns":len(group),"observedGroupSizes":Counter(group.values()),
                      "gatewayPrepareMs":dist([r["payloadPrepared"]/1000 for r in clocks]),
                      "groupPrepareMs":dist([r["prepareMicros"]/1000 for r in staged.values()]),
                      "groupMaterializeMs":dist([r["materializeMicros"]/1000 for r in staged.values()]),
                      "groupSpeculateMs":dist([r["speculativeMicros"]/1000 for r in staged.values()]),
                      "nativeTurns":len(joined),"nativeApplyMs":dist([r["apply-msec"] for r in joined.values()]),
                      "nativeTotalMs":dist([r["msec"] for r in joined.values()]),
                      "storageReads":sum(r.get("io-stats",{}).get("reads",{}).get("sql",0) for r in joined.values())})
    measurement={"source":source,"slot":plan["slot"],"nonce":plan["nonce"],"setting":plan["setting"],
                 "resultSha256":sha(directory/"result.json"),"nativeSha256":proof_trace["fileSha256"],
                 "dispositions":dispositions,"checkpointSha256":plan["seed"],"directory":directory.name,"cells":cells,
                 "recovered":len(result["recovered"]),"completed":len(own)==len(native) and dispositions=={"ack":len(offers)}}
    if mode=="ceil":
        assert result["readSha256"]==sha(directory/"reads.jsonl")
        read=list(rows(directory/"reads.jsonl"))
        assert len({(x["worker"],x["j"]) for x in read})==len(read)
        measurement["reads"]={"planned":result["scheduledReads"],"observed":len(read),
                              "matched":sum(x["disposition"]=="matched" for x in read)}
        measurement["completed"] &= measurement["reads"]["matched"]==result["scheduledReads"]==len(read)
        start=get(directory/"before-counters.json")["postgres"]["wal"]
        end=get(directory/"after-counters.json")["postgres"]["wal"]
        assert start["stats_reset"]==end["stats_reset"]
        measurement["blockWal"]={key:end[key]-start[key] for key in ("wal_write","wal_sync","wal_write_time","wal_sync_time","wal_bytes")}
        assert all(x>=0 for x in measurement["blockWal"].values())
    if mode=="size":
        before=get(directory/("before-size.json" if small else "baseline-size.json"))
        after=get(directory/"after-size.json")
        index=get(directory/"index.json") if (directory/"index.json").is_file() else None
        initial=get(directory/"index-before.json")
        suffix=get(directory/"log-suffix.json")
        known=successful+result["recovered"]
        assert suffix["nonce"]==plan["nonce"] and {(r["t"],r["position"]) for r in suffix["commits"]}=={(r["t"],r["pos"]) for r in known}
        assert len(suffix["commits"])==len(known) and int(suffix["high"])>=max(int(r["t"]) for r in known)>int(suffix["low"])
        for reading,position in ((initial,result["headBefore"]),(index,result["last"])):
            assert [reading[k] for k in ("nonce","source","slot","position")]==[plan["nonce"],source,plan["slot"],position]
            assert reading["receipt"]["completed"] is True and reading["receipt"]["database"]==plan["db"]
        indexed=get(directory/"indexed-size.json") if (directory/"indexed-size.json").is_file() else None
        turns=defaultdict(set)
        for r in successful:
            if r.get("datoms") is not None:turns[r["t"]].add(r["datoms"])
        assert all(len(v)==1 for v in turns.values())
        def lsn(x):
            a,b=x.split("/")
            return (int(a,16)<<32)+int(b,16)
        measurement["size"]={"nativeDatoms":sum(next(iter(v)) for v in turns.values()),"nativeScope":len(turns),
                             "widths":Counter(r["width"] for r in successful),"before":before,"after":after,
                             "indexed":indexed,"index":index,"walBytes":lsn(after["walInsert"])-lsn(before["walInsert"]),
                             "nativeLogEntries":len(suffix["commits"]),"nativeOtherEntries":suffix["nonTriplex"],
                             "feedChanges":sum(r["changes"] for r in suffix["commits"])}
        measurement["completed"] &= len(turns)==len(own) and index is not None and indexed is not None
    if mode=="pred":
        assert all("readProfile" in r and "reads" in r["readProfile"] for r in successful)
        measurement["nativeProfile"]=Counter({k:sum(r["readProfile"]["reads"].get(k,0) for r in successful)
          for k in {k for r in successful for k in r["readProfile"]["reads"]}})
    return measurement

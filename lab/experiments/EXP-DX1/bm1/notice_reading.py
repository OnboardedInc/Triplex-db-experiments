"""Reconcile the STG1 producer result with the saved schedule and oracle."""

import hashlib
import json
import math
import re

from producer_readings import digest, get


def notice_reading(root, source, slot, subjects, start):
    # [DX-BM1] Why: the paired read and save clocks must match their own raw schedules and native cuts.
    # Rejected: trusting a within-limits flag without adjudicating the paired outputs and copy workload.
    small=subjects==1000
    assert small or subjects==100000
    parent=get(root/("attempt.json" if (root/"attempt.json").is_file() else "binding.json"))
    receipt=get(root/"preflight-receipt.json")
    binding={"source":source,"slot":slot,"nonce":parent["nonce"]}
    assert [parent[k] for k in binding]==list(binding.values()) and receipt["binding"]==binding
    assert re.fullmatch(r"[a-f0-9]{40}",source) and re.fullmatch(r"[a-f0-9-]{36}",binding["nonce"])
    assert receipt["subjects"]==1000
    guard=get(root/"act2-preflight/preflight.json")
    assert guard["oracleSha256"]==receipt["oracle"] and guard["binding"]==receipt["windowIdentity"]
    folder=root/("notice-preflight" if small else "deep")
    file=folder/"result.json"
    assert start-2<=file.stat().st_mtime
    result=get(file)
    nonce=receipt["noticeAttempt"] if small else binding["nonce"]
    assert [result[k] for k in ("source","slot","n","nonce")]==[source,slot,subjects,nonce]
    assert result["inputs"]==receipt["inputPins"]
    route=receipt.get("recipient")
    if route:
        assert route=={"route":"copied","pages":16,"intervalMs":0,"copyWorkers":4}
        assert route==parent["recipient"] and result["copyWorkers"]==4
    live=[]
    raw_hash={}
    plan=[]
    for name in ("dispatch","baseline"):
        actual=result[name]
        assert actual==get(folder/(name+".json"))
        file=folder/(name+"-raw.json")
        assert start-2<=file.stat().st_mtime
        raw_hash[name]=digest(file)
        raw=get(file)
        assert actual["scope"]=="notice-"+nonce+"-"+name and actual["epoch"]==nonce+"-"+name
        assert [actual["readCount"],actual["saveCount"]]==[len(raw["reads"]),len(raw["saves"])]
        native=[entry["receipt"]["position"] for entry in raw["history"]]
        assert all(a<b for a,b in zip(native,native[1:])) and actual["activation"]["position"]==native[1]
        assert actual["activation"]["txId"]==raw["history"][1]["receipt"]["txId"]
        assert all(row["position"] in native[2:] for row in raw["saves"])
        arm={}
        for plural,latency,schedule,point in (("reads","latency","atMs","readP99"),("saves","ackMs","atMs","saveP99")):
            rows=raw[plural]
            values=sorted(row[latency] for row in rows)
            assert values and all(math.isfinite(v) and v>=0 for v in values)
            assert actual[point]==values[math.ceil(.99*len(values))-1]
            if plural=="reads" and route:
                assert all("beganMs" in row for row in rows)
            onset="beganMs" if plural=="reads" and "beganMs" in rows[0] else schedule
            arm[plural]=sum(row[onset]+row[latency]<=actual["duration"] for row in rows)
        offer_plan=[[row["seq"],row["atMs"]] for row in raw["saves"]]
        assert len({tuple(row) for row in offer_plan})==len(offer_plan)
        assert len({(row["seq"],row["position"]) for row in raw["saves"]})==len({row[0] for row in offer_plan})
        assert actual["offerDigest"]==hashlib.sha256(json.dumps(offer_plan,separators=(",",":")).encode()).hexdigest()
        plan.append(offer_plan)
        live.append(arm)
    assert plan[0]==plan[1]
    dispatch,baseline=result["dispatch"],result["baseline"]
    proof=dispatch["proof"]
    assert proof["subjects"]==proof["receiverStates"]==proof["ledgerStates"]==subjects
    assert sum(proof["eventCounts"])==proof["effects"] and proof["eventCounts"][1]==dispatch["dispatch"]["deliveries"]>0
    archive=get(folder/"archive.json")
    assert [archive[k] for k in ("scope","source","nonce","subjects")]==[dispatch["scope"],source,nonce,subjects]
    assert archive["orderedEffectSha256"]==proof["orderedEffectSha256"] and archive["orderedEffects"]==proof["effects"]
    if small:
        assert receipt["noticeDigest"]==proof["orderedEffectSha256"] and receipt["offers"]==dispatch["saveCount"]
    if route:
        for arm in (dispatch,baseline):
            assert arm["senderReadPeer"]=="dedicated" and arm["sourceAdvances"]==arm["foregroundCommits"]
        assert dispatch["dispatch"]["copy"]["captures"]>0 and dispatch["dispatch"]["copy"]["evaluated"]>0
    read,write=(dispatch[k]/baseline[k] for k in ("readP99","saveP99"))
    assert result["ratios"]=={"read":read,"commit":write}
    rate=dispatch["dispatch"]["deliveries"]*1000/dispatch["duration"]
    assert rate==dispatch["deliveriesPerSecond"]
    return {"source":source,"slot":slot,"nonce":nonce,"subjects":subjects,"reportSha256":digest(folder/"result.json"),
            "preflightSha256":digest(root/"preflight-receipt.json"),"rawSha256":raw_hash,
            "oracleDigest":proof["orderedEffectSha256"],"oracleEffects":proof["effects"],
            "noticesPerSecond":rate,"readRatio":read,"commitRatio":write,"live":live,
            "withinBoth":all(min(arm.values())>=500 for arm in live) and read<=1.5 and write<=1.5}

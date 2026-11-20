"""Verify and summarize the per-offer, per-transaction and PostgreSQL records."""
import hashlib
import json
from collections import Counter
import math
from pathlib import Path
import re


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


def storage_accounts(report):
    # [DX-BM1] Why: native with-io-stats includes child counts in their ancestors, as checked by W1's two same-basis lookups.
    # Rejected: adding the parent and child I/O counters or inferring them from function wall time.
    function=report["nested"]["function"]
    parts=function["nested"]
    assert set(parts)<={"new-id","new-range","old-live","retirement","retract","owner","revision"}
    assert {"old-live","retirement"}<=set(parts)
    assert all(part["io-context"]==name and part["api"]=="lookup" for name,part in parts.items())
    assert function["io-context"]=="function" and function["api"]=="lookup"
    counts={name:part["reads"] for name,part in parts.items()}
    metrics=("sql","avet","eavt","aevt","avet-load","eavt-load","aevt-load","deserialize")
    total=report["reads"]
    parent=function["reads"]
    result={name:{k:row.get(k,0) for k in (*metrics,"w1-calls","sql-ms","deserialize-ms")} for name,row in counts.items()}
    for key in metrics:
        child=sum(row.get(key,0) for row in counts.values())
        inside=parent.get(key,0)
        full=total.get(key,0)
        assert 0<=child<=inside<=full, (key,child,inside,full)
        result.setdefault("functionOther",{})[key]=inside-child
        result.setdefault("nativeOutsideFunction",{})[key]=full-inside
        result.setdefault("total",{})[key]=full
    return result


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
    options=get(directory/"writer-options.json")
    expected=get(directory/"writer-expectation.json")
    observed=options["observed"]
    variant=mode in ("pred","growth") and plan["setting"]=="candidate"
    assert options["expected"]==expected and options["historyRange"] is (mode=="growth" and variant)
    assert [expected[k] for k in ("source","slot","attempt")]==[source,plan["slot"],plan["nonce"]]
    assert observed["options"]==expected["options"] and observed["options"]["predecessorLookup"] is variant
    assert observed["position"]==clock["head"] and observed["database"]==plan["db"] and observed["attempt"]==plan["nonce"]
    gateway=directory/"engines"/plan["slot"]/"gateway-files.json"
    assert observed["gatewaySourceHash"]==expected["gatewaySourceHash"]==sha(gateway)
    assert observed["strictRecordClocks"] is True and observed["commitFunctionInstalled"] is True
    assert re.fullmatch(r":triplex\.write/v-[a-f0-9]{24}" if variant else ":triplex/commit",observed["commitFunction"])
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
    if get(checkpoint).get("kind")=="scale1-single":
        readback=directory/"field-readback.json"
        assert sha(readback)==result["readbackSha256"]
        checked=get(readback)
        assert [checked[k] for k in ("source","slot","nonce","db","oldCut","newCut")]==[
            source,plan["slot"],plan["nonce"],plan["db"],result["headBefore"],result["last"]]
        excluded={by_offer[int(r["id"].rsplit("-",1)[1])]["entity"] for r in result["recovered"]}
        assert checked["excludedAfterRecoveredCommit"]==len(excluded)
        changed={row["entity"] for row in successful}-excluded
        series=sorted(changed)
        expected=series if small else series[::max(1,len(series)//24)]
        assert checked["subjects"]==expected
        locals_by_entity={o["entity"]:o["local"] for o in successful}
        latest={}
        for row in sorted(successful,key=lambda o:o["pos"]):
            for field in range(row["width"]):
                latest[row["entity"],field]=row
        for cut,key in ((result["headBefore"],"before"),(result["last"],"after")):
            assert [r["entity"] for r in checked[key]]==expected
            for row in checked[key]:
                assert row["expected"]==row["observed"]
                seq=row["observed"]
                assert [field[1] for field in seq]==[":task/field-"+str(i) for i in range(3)]
                assert all(q[0]==row["entity"] and q[2] and q[3]=="string" and q[4] and q[6]<=cut for q in seq)
                local=locals_by_entity[row["entity"]]
                for i,field in enumerate(seq):
                    save=latest.get((row["entity"],i)) if key=="after" else None
                    revision=save["ordinal"]+1 if save else 0
                    assert field[4]==hashlib.sha256(f"deep-field/{local}/0/{i}/{revision}".encode()).hexdigest()[:57]
                    if save:
                        assert field[2]==hashlib.sha256(f"{save['id']}/f{i}".encode()).hexdigest()[:26].upper()
                        assert field[6]==save["pos"]
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
        quiet=[r["ackAt"]-r["offset"] for r in confirmed if r["account"]==9]
        first=w["from"]*1000
        midpoint=first+20000
        splits=None
        if mode=="ceil" and w["rate"]==235:
            splits=[{"offered":sum(lo<=r["offset"]<hi for r in n),
                     "inWindow":sum(lo<=r["offset"]<=r["ackAt"]<hi for r in confirmed)}
                    for lo,hi in ((first,midpoint),(midpoint,first+40000))]
        cells.append({"rate":w["rate"],"offered":len(n),"ack":len(confirmed),
                      "inWindow":sum(w["from"]*1000<=r["ackAt"]<(w["from"]+w["seconds"])*1000 for r in confirmed),
                      "goal50":sum(x<=50 for x in durations),
                      "outcomes":Counter(r["disposition"] for r in n),"p50":pct(durations,50),"p99":pct(durations,99),
                      "firstPacketP99":pct([r["firstPacket"]-r["offset"] for r in confirmed],99),
                      "physicalTurns":len(group),"observedGroupSizes":Counter(map(str,group.values())),
                      "gatewayPrepareMs":dist([r["payloadPrepared"]/1000 for r in clocks]),
                      "groupPrepareMs":dist([r["prepareMicros"]/1000 for r in staged.values()]),
                      "groupMaterializeMs":dist([r["materializeMicros"]/1000 for r in staged.values()]),
                      "groupSpeculateMs":dist([r["speculativeMicros"]/1000 for r in staged.values()]),
                      "nativeTurns":len(joined),"nativeApplyMs":dist([r["apply-msec"] for r in joined.values()]),
                      "nativeTotalMs":dist([r["msec"] for r in joined.values()]),
                      "storageReads":sum(r.get("io-stats",{}).get("reads",{}).get("sql",0) for r in joined.values()),
                      "quietAckMs":dist(quiet),"subwindows20s":splits})
    measurement={"source":source,"slot":plan["slot"],"nonce":plan["nonce"],"setting":plan["setting"],
                 "resultSha256":sha(directory/"result.json"),"nativeSha256":proof_trace["fileSha256"],
                 "dispositions":dispositions,"checkpointSha256":plan["seed"],"directory":directory.name,"cells":cells,
                 "writerOptionsSha256":sha(directory/"writer-options.json"),"writerOptions":observed,
                 "recovered":len(result["recovered"]),"allAcknowledged":dispositions=={"ack":len(offers)},
                 "completed":len(own)==len(native)}
    if mode=="pulse" and not small:
        quiet=lambda n: [(o["entity"],o["accountSeq"],o["width"],o["offset"]-60_000*n)
                         for o in offers if o["cell"]==n and o["account"]==9]
        assert len(quiet(0))==600 and quiet(0)==quiet(1)
        alone,busy=[cell["quietAckMs"] for cell in cells]
        measurement["quietRatio"]=busy["p99"]/alone["p99"] if alone["n"]==busy["n"]==600 else None
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
        assert [suffix[k] for k in ("source","slot","nonce","db")]==[source,plan["slot"],plan["nonce"],plan["db"]]
        assert {(r["t"],r["position"],r["operation"]) for r in suffix["commits"]}=={(r["t"],r["pos"],r["id"]) for r in known}
        assert len(suffix["commits"])==len(known) and int(suffix["high"])>=max(int(r["t"]) for r in known)>int(suffix["low"])
        raw=directory/"native-log.stdout"
        assert suffix["nativeLogSha256"]==sha(raw) and suffix["scriptSha256"]==sha(Path(__file__).with_name("size-log.clj"))
        def native_size(file):
            row,=[line.removeprefix("BM1_SIZE_JSON ") for line in file.read_text().splitlines() if line.startswith("BM1_SIZE_JSON ")]
            return {**json.loads(row),"sha256":sha(file)}
        log=native_size(raw)
        assert log["mode"]=="log"
        assert [log[k] for k in ("database","low","high","basis")]==[plan["db"],suffix["low"],suffix["high"],suffix["basis"]]
        assert all(int(log["low"])<int(r["t"])<=int(log["high"]) for r in log["records"])
        assert all(a["t"]!=b["t"] and int(a["t"])<int(b["t"]) for a,b in zip(log["records"],log["records"][1:]))
        assert suffix["nonTriplex"]==sum(not r["claims"] for r in log["records"])
        direct=[{"t":r["t"],"datoms":r["datoms"],"adds":r["adds"],"retracts":r["retracts"],
                 "operation":c["operation"],"position":c["position"]} for r in log["records"] for c in r["claims"]]
        assert direct==suffix["commits"]
        assert all(r["datoms"]==r["adds"]+r["retracts"] for r in log["records"])
        for reading,position in ((initial,result["headBefore"]),(index,result["last"])):
            assert [reading[k] for k in ("nonce","source","slot","position")]==[plan["nonce"],source,plan["slot"],position]
            assert reading["receipt"]["completed"] is True and reading["receipt"]["database"]==plan["db"]
        indexed=get(directory/"indexed-size.json") if (directory/"indexed-size.json").is_file() else None
        index_counts={}
        for filename,mode,basis in (("before","indexed",log["low"]),
                                    ("before-barrier","current",log["high"]),
                                    ("indexed","indexed",log["high"])):
            row=native_size(directory/("native-size-"+filename+".stdout"))
            assert [row[k] for k in ("mode","database","low","high")]==[mode,plan["db"],basis,basis]
            assert int(row["basis"])>=max(int(basis),int(row["indexedT"])) and row["segments"]>0 and row["indexDatoms"]>0
            if mode=="indexed":assert int(row["indexedT"])>=int(basis)
            index_counts[filename]=row
        turns={row["t"]:row["datoms"] for row in suffix["commits"]}
        assert all(r.get("datoms") in (None,turns[r["t"]]) for r in successful)
        def lsn(x):
            a,b=x.split("/")
            return (int(a,16)<<32)+int(b,16)
        entries=len(turns)
        assert entries
        wal=lsn(after["walInsert"])-lsn(before["walInsert"])
        by_width={str(width):dist([turns[r["t"]] for r in successful if r["width"]==width])
                  for width in sorted({r["width"] for r in successful})}
        measurement["size"]={"nativeDatoms":sum(turns.values()),"nativeScope":entries,
                             "widths":Counter(str(r["width"]) for r in successful),"before":before,"after":after,
                             "indexed":indexed,"index":index,"walBytes":wal,"nativeDatomsByWidth":by_width,
                             "nativeIndexCounts":index_counts,
                             "indexedSegmentsDelta":index_counts["indexed"]["segments"]-index_counts["before"]["segments"],
                             "nativeDatomsPerSave":sum(turns.values())/entries,"walBytesPerSave":wal/entries,
                             "grossRelationBytesPerSave":(after["relationBytes"]-before["relationBytes"])/entries,
                             "indexedRelationBytesPerSave":(indexed["relationBytes"]-before["relationBytes"])/entries if indexed else None,
                             "nativeLogEntries":len(suffix["commits"]),"nativeOtherEntries":suffix["nonTriplex"],
                             "nativeAdds":sum(r["adds"] for r in direct),"nativeRetracts":sum(r["retracts"] for r in direct),
                             "nativeLogSha256":sha(raw)}
        measurement["completed"] &= len(turns)==len(own) and index is not None and indexed is not None
    if mode=="growth":
        assert all("readProfile" in r and "reads" in r["readProfile"] for r in successful)
        counts,first,decisions={},{},Counter()
        unattributed=Counter()
        visited=set()
        for row in sorted(successful,key=lambda value:value["pos"]):
            profile=row["readProfile"]
            seen=row["entity"] in visited
            visited.add(row["entity"])
            try:
                per=storage_accounts(profile)
                assert per["retirement"]["w1-calls"]==row["width"]
                if "new-range" in per:
                    assert variant and per["new-range"]["w1-calls"]==1
                    decisions["occupied" if per.get("new-id",{}).get("w1-calls") else "empty"]+=1
                else:
                    decisions["ineligible" if variant else "disabled"]+=1
                for name,vals in per.items():
                    counts.setdefault(name,Counter()).update(vals)
                    (first.setdefault("repeated" if seen else "first",{})).setdefault(name,Counter()).update(vals)
            except (AssertionError,KeyError,TypeError):
                unattributed.update(profile["reads"])
                decisions["unattributed"]+=1
        measurement["nativeProfile"]={"counts":counts,"byVisit":first,"decisions":decisions,
                                      "unattributed":unattributed,"n":len(successful)}
    return measurement

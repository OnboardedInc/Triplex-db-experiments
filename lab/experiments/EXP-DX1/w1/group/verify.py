"""Verify one managed attempt against pinned O-REPLAY and the scheduled diagnostic workload."""
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import uuid

if not __debug__:
    raise RuntimeError("Evidence verification requires enabled assertions")

out = Path(sys.argv[1]).resolve()
report = out / ("verify-" + str(uuid.uuid4()))
report.mkdir()
def digest(data):
    return hashlib.sha256(data).hexdigest()
def filehash(p):
    return digest(p.read_bytes())
def save(name, obj):
    with (report / name).open("x") as f:
        json.dump(obj, f, indent=2)
        f.write("\n")
attempt = json.loads((out / "terminal.json").read_text())
assert attempt["exit"] == 0 and attempt["slot"] == "tx2-datomic-selftest" and attempt["holder"] == "DX-W1"
raw = out / attempt["log"]
assert filehash(raw) == attempt["sha256"]
stage = out / "config"
inputs = json.loads((out / "inputs.json").read_text())
for path, expected in inputs["stage"].items():
    if path != "lab/config/slots.json":
        assert filehash(stage / path) == expected
        if path.startswith("packages/"): assert filehash(Path(path)) == expected
for name, expected in inputs["runner"].items():
    if Path(name).name in ["workload.ts","population.ts","local.ts","managed.py"]: assert filehash(Path(name))==expected
slot = json.loads((stage / "lab/config/slots.json").read_text())["lanes"]["datomic"]
build = json.loads((out / "build-1.log").read_text().split('Successfully tagged')[-1].split('\n',1)[1])
assert build["imageId"] == attempt["image"] == slot["imageId"] and build["buildInputsSha256"] == slot["buildInputsSha256"]
built = json.loads(Path(build["receipt"]).read_text())
assert built["imageId"] == slot["imageId"] and built["sources"]["sha256"] == slot["sourceInputsSha256"]
for tree, root in [("gateway","packages/datomic/gateway"),("config","lab/config/datomic")]:
    for entry in built["sources"][tree]:
        assert entry["sha256"] == inputs["stage"][root+"/"+entry["path"]]
events = [json.loads(l[8:]) for l in raw.read_text().splitlines() if l.startswith("W1_DATA ")]
assert [e["k"] for e in events] == ["sql","proof","arm","proof","arm","recovered","finished"]
nonce = (stage / "lab/config/datomic/attempt").read_text().strip()
assert {e["nonce"] for e in events} == {nonce} and events[-1]["v"] == {"nonce":nonce}
assert events[0]["v"] == [[k,"on"] for k in ["fsync","synchronous_commit","full_page_writes"]]
rev = "03d86f3346cccd6794487b77293fb56077dd020e"
oracle = report / "oracle"
for name in subprocess.check_output(["git","ls-tree","-r","--name-only",rev,"--","lab/oracles/replay"],text=True).splitlines():
    target = oracle / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(subprocess.check_output(["git","show",rev+":"+name]))
def token(s):
    return digest(s.encode())[:26].upper()
summaries = []
for n, grouped in enumerate([False, True]):
    proof, arm = events[1+n*2]["v"], events[2+n*2]["v"]
    suffix = nonce+"-"+str(grouped).lower()
    assert json.loads(proof["scope"])[3] == suffix+"-proof" and json.loads(arm["scope"])[3] == suffix+"-load"
    import base64
    for result in [proof, arm]:
        assert result["db"] == "s2-"+base64.urlsafe_b64encode(result["scope"].encode()).decode().rstrip("=")
    root = "acct/a0/pl:00000000"
    assert proof["root"] == root and len(proof["receipts"]) == len(proof["views"]) == 17
    case = {"format":"triplex-db-2/o-replay-case/1","caseId":"DX-W1-"+suffix,"defaultScope":"s1","adapter":{"schemaVersion":1},"commands":[],"queries":[],"receipts":[]}
    for i,r in enumerate(proof["receipts"]):
        id_ = "cmd"+str(i) if i<16 else "retire"
        assert r["id"] == id_ and r["txId"] == "_tx/"+token("transaction/"+id_) and r["position"] == i+1
        op = {"op":"assert","ref":id_,"entityId":root,"attribute":":proof/value","value":{"type":"string","value":"value"+str(i)},"validFrom":0} if i<16 else {"op":"retract","target":"cmd2"}
        case["commands"].append({"kind":"transact","operations":[op],"meta":{"commandId":id_},"physicalGroup":"t"+r["t"]})
        case["receipts"].append({"command":i,"outcome":"committed","position":r["position"],"instant":r["instant"],"txId":r["txId"],"assertionIds":[token(id_+"/f0") if i<16 else None]})
        case["queries"].append({"id":"p"+str(i+1),"kind":"entityTriples","entityId":root,"cut":{"position":i+1,"validAt":1}})
    assert proof["rejection"]=="CasConflict" and proof["duplicateError"]=="CommandConflict"
    stale={"kind":"transact","clock":1800000000000,"operations":[{"op":"assert","ref":"forbidden","entityId":root,"attribute":":proof/value","value":{"type":"string","value":"forbidden"},"validFrom":0}],
           "meta":{"commandId":"stale","preconditions":[{"_tag":"EntityState","entityId":root,"tripleIds":[]}]}}
    if proof["receipts"][5]["t"]==proof["receipts"][6]["t"]:
        stale["physicalGroup"]="t"+proof["receipts"][5]["t"]
    case["commands"].insert(6,stale)
    case["receipts"].insert(6,{"outcome":"rejected","error":{"_tag":"TransactionConflictError"}})
    original=proof["idempotency"]["original"]
    case["commands"].append({"kind":"transact","clock":1800000000000,"operations":[{"op":"assert","ref":"never","entityId":root,"attribute":":proof/value","value":{"type":"string","value":"must never appear"}}],"meta":{"commandId":original["commandId"]}})
    case["receipts"].append({"outcome":"rejected","error":{"_tag":"CommandAlreadyCommittedError","transactionId":original["txId"]}})
    lost=proof["idempotency"]["resolved"]
    case["commands"].append({"kind":"transact","operations":[{"op":"assert","ref":"lost","entityId":root,"attribute":":proof/value","value":{"type":"string","value":"durable"},"validFrom":0}],"meta":{"commandId":"lost-reply"}})
    case["receipts"].append({"outcome":"unknown","resolvedOutcome":"committed","position":lost["position"],"instant":lost["recordedAt"],"txId":lost["txId"],"assertionIds":[token("lost-reply/f0")]})
    case["queries"].append({"id":"p18","kind":"entityTriples","entityId":root,"cut":{"position":18,"validAt":1}})
    for index,record in enumerate(case["receipts"]): record["command"]=index
    assert (len(set(r["t"] for r in proof["receipts"]))<17)==grouped
    filename = f"oracle-case-{n}.json"
    save(filename,case)
    answer = report / f"oracle-answer-{n}.json"
    subprocess.run([sys.executable,"-I",oracle/"lab/oracles/replay/cli.py",report/filename,"-o",answer],check=True)
    doc = json.loads(answer.read_text())
    assert doc["verdict"] == "PASS" and doc["receiptConsistency"]["violations"] == []
    assert len(doc["queries"]) == 18 and len(doc["commandOutcomes"]) == 20
    assert all(item["verdict"] == "PASS" for item in doc["commandOutcomes"])
    assert doc["commandOutcomes"][6]["expected"]["errorTag"] == "TransactionConflictError"
    assert doc["commandOutcomes"][18]["expected"]["transactionId"] == original["txId"]
    for i,q in enumerate(doc["queries"]):
        assert q["id"]=="p"+str(i+1)
        expected=sorted([r["id"],r["entityId"],r["attribute"],r["value"]["value"],r["recordedPosition"]] for r in q["result"]["snapshot"])
        assert expected==sorted((proof["views"]+[proof["lostView"]])[i])
    original, resolved=proof["idempotency"]["original"], proof["idempotency"]["resolved"]
    witness=proof["witness"]
    assert [original["commandId"],original["operationId"],original["txId"],original["position"],original["recordedAt"],original["t"]]==[witness["id"],witness["id"],"_tx/"+token("transaction/"+witness["id"]),witness["p"],witness["clock"],witness["t"]]
    assert resolved["commandId"]==resolved["operationId"]=="lost-reply" and resolved["position"]==18 and resolved["txId"]=="_tx/"+token("transaction/lost-reply")
    assert arm["grouped"]==grouped and arm["nonce"]==suffix
    assert [p["name"] for p in arm["phases"]]==["1","4","16","64"]
    summary=[]
    for index,p in enumerate(arm["phases"]):
        rows=p["records"]
        assert len(rows)==len({r["id"] for r in rows})==128 and sorted(r["pos"] for r in rows)==list(range(index*128+1,(index+1)*128+1))
        assert {r["id"] for r in rows}=={f'{p["name"]}-0-{i}' for i in range(128)}
        assert p["physical"]==len(set(r["t"] for r in rows)) and all(1<=r["size"]<=8 for r in rows)
        assert all(r["size"]==sum(other["t"]==r["t"] for other in rows) for r in rows)
        assert (p["physical"] == 128) == (not grouped or p["name"] == "1")
        assert all(r["account"] == 0 and r["queue"] >= 0 and r["elapsed"] > 0 for r in rows)
        for t in {r["t"] for r in rows}:
            members = sorted(r["pos"] for r in rows if r["t"] == t)
            assert members == list(range(members[0], members[0] + len(members)))
        assert abs(p["wall"]-max(r["started"]+r["elapsed"] for r in rows))<100 and math.isclose(p["throughput"],128000/p["wall"])
        for r in rows:
            assert math.isclose(r["queue"],r["gatewayQueue"]+r["submitToNativeEntry"]) and r["submitToNativeEntry"]>=0
        for field, member in [("queueMs","queue"),("gatewayQueueMs","gatewayQueue"),("submitToNativeEntryMs","submitToNativeEntry"),("readyToNativeEntryMs","readyToNativeEntry"),("commitMs","scheduled")]:
            samples=sorted(r[member] for r in rows)
            assert p["byAccount"]["0"][field]=={k:samples[math.ceil(128*q)-1] for k,q in [("p50",.5),("p95",.95),("p99",.99),("max",1)]}
        summary.append({k:v for k,v in p.items() if k!="records"})
    summaries.append({"grouped":grouped,"phases":summary,"oracle":filehash(answer),"cuts":len(doc["queries"])})
w=events[3]["v"]["witness"]; recovered=events[5]["v"]
assert [recovered["status"],recovered["operationId"],recovered["t"]["v"],int(recovered["position"]["v"]),recovered["recordedAt"]["v"]]==["committed",w["id"],w["t"],w["p"],w["clock"]]
save("verified.json",{"attempt":nonce,"slot":attempt["slot"],"image":slot["imageId"],"inputs":filehash(out/"inputs.json"),"raw":filehash(raw),"oracleRevision":rev,"verifierSha256":filehash(Path(__file__)),"arms":summaries,"recovered":w})
print(report / "verified.json")

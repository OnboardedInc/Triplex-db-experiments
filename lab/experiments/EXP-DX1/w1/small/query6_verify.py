"""Compare public SDK, native feed and held cuts with the pinned journal oracle."""
import base64
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import uuid

if not __debug__:
    raise RuntimeError("Query evidence verification requires assertions")

out = Path(sys.argv[1]).resolve()
stage = out / "config"
terminal = json.loads((out / "terminal.json").read_text())
inputs = json.loads((out / "inputs.json").read_text())
raw = out / terminal["log"]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical(item):
    return json.dumps(item, sort_keys=True, ensure_ascii=True, separators=(",", ":"))


def numbers(item):
    # [DX-W1] Why: JavaScript's wire JSON omits the decimal point of an integral binary64.
    # Rejected: approximate comparisons that would also hide a changed integer or clock.
    if isinstance(item, float) and item.is_integer() and math.copysign(1, item) > 0:
        return int(item)
    if isinstance(item, dict):
        return {k: numbers(v) for k, v in item.items()}
    if isinstance(item, list):
        return [numbers(v) for v in item]
    return item


def compare(actual, expected):
    assert canonical(numbers(actual)) == canonical(numbers(expected)), (actual, expected)


assert terminal["exit"] == 0 and terminal["holder"] == "DX-W1" and terminal["slot"] == "tx2-datomic-selftest"
assert sha(raw) == terminal["sha256"]
for file, digest in inputs["stage"].items():
    if file != "lab/config/slots.json":
        assert sha(stage / file) == digest, file
for file, digest in inputs["bundle"].items():
    assert sha(Path(file)) == digest, file
slot = json.loads((stage / "lab/config/slots.json").read_text())["lanes"]["datomic"]
build = json.loads((out / "build-1.log").read_text().split("Successfully tagged")[-1].split("\n", 1)[1])
assert slot["imageId"] == build["imageId"] == terminal["image"]
assert slot["buildInputsSha256"] == build["buildInputsSha256"]
built = json.loads(Path(build["receipt"]).read_text())
assert built["imageId"] == slot["imageId"] and built["sources"]["sha256"] == slot["sourceInputsSha256"]
for component, root in (("gateway", "packages/datomic/gateway"), ("config", "lab/config/datomic")):
    for item in built["sources"][component]:
        assert inputs["stage"][root + "/" + item["path"]] == item["sha256"]
nonce = (stage / "lab/config/datomic/attempt").read_text().strip()
study = (stage / "lab/config/datomic/field-study").read_text()
lines = raw.read_text().splitlines()
events = [json.loads(line[8:]) for line in lines if line.startswith("W1_DATA ")]
assert all(e["nonce"] == nonce for e in events) and events[-1]["v"] == {"nonce": nonce}
assert events[0]["v"] == [[k, "on"] for k in ("fsync", "synchronous_commit", "full_page_writes")]
binding = {"slot": terminal["slot"], "image": slot["imageId"], "attempt": nonce,
           "inputs": sha(out / "inputs.json"), "raw": sha(raw), "verifier": sha(Path(__file__))}

def erasure_observation():
    (record,) = [json.loads(line[10:]) for line in lines if line.startswith("W1_ERASE6 ")]
    assert record["attempt"] == nonce and record["id"] == "canary-identity"
    key = record["db"][3:]
    assert json.loads(base64.urlsafe_b64decode(key + "=" * (-len(key) % 4)))[3] == nonce
    assert 0 < int(record["assertT"]) < int(record["eraseT"])
    assert record["pinnedCode"] == record["freshCode"] == "ErasureQueryUnsupported"
    assert record["indexCode"] == record["envelopeCode"] == "ErasureQueryUnsupported"
    assert record["feedCode"] == record["pastLogCode"] == "FeedErasureUnsupported"
    assert all(type(record[k]) is bool for k in ("heldCleartext", "historyPresent", "journalCleartext"))
    return record


def quantiles(values):
    values = sorted(values)
    return [values[math.ceil(q*len(values))-1] for q in (.5, .99)]


def summarize_cost(samples):
    return {"samples": len(samples), "saveMs": quantiles([r["saved"] for r in samples]),
            "readMs": quantiles([r["readMs"] for r in samples]),
            "requestBytes": quantiles([r["write"][0] for r in samples]),
            "ackBytes": quantiles([r["write"][1] for r in samples]),
            "readRequestBytes": quantiles([r["read"][0] for r in samples]),
            "readReplyBytes": quantiles([r["read"][1] for r in samples]),
            "datoms": sorted({r["write"][2] for r in samples})}


if study == "erase6":
    assert [e["k"] for e in events] == ["sql", "finished"]
    with (out / ("observation-" + str(uuid.uuid4()) + ".json")).open("x") as f:
        json.dump({**binding, "observation": erasure_observation()}, f, indent=2)
        print(f.name)
    sys.exit(0)

if study == "query6-cost":
    assert [e["k"] for e in events] == ["sql", *["query-cost"] * 4, "finished"]
    costs, pooled = [], {False: [], True: []}
    for i, (event, covered) in enumerate(zip(events[1:5], (False, True, True, False), strict=True)):
        arm = event["v"]
        assert arm["nonce"] == f"{nonce}-cost-{i}" and arm["layout"] == "lean" and arm["covered"] is covered
        key = arm["db"][3:]
        assert json.loads(base64.urlsafe_b64decode(key + "=" * (-len(key) % 4)))[3] == arm["nonce"]
        writer = arm["writer"]
        assert writer["database"] == arm["db"] and writer["installedDefinitionMatches"] is True
        assert writer["ledger"] is True and writer["packedJournal"] is False and writer["leanNativeQuery"] is covered
        samples = arm["samples"]
        assert len(samples) == len({r["id"] for r in samples}) == 64
        for n, sample in enumerate(samples):
            assert [sample["n"], sample["command"], sample["position"], sample["expected"]] == [
                n, f"save:{n}", n + 2, f"value:{n}"]
            assert sample["saved"] > 0 and sample["readMs"] > 0 and all(x > 0 for x in sample["read"] + sample["write"])
        pooled[covered].extend(samples)
        costs.append({"covered": covered, **summarize_cost(samples)})
    result = {**binding, "costs": costs, "pooled": {str(k): summarize_cost(v) for k, v in pooled.items()},
              "erasure": erasure_observation()}
    with (out / ("verified-" + str(uuid.uuid4()) + ".json")).open("x") as f:
        json.dump(result, f, indent=2)
        print(f.name)
    sys.exit(0)

assert study == "query6"
assert [e["k"] for e in events] == ["sql", "query-proof", "query-proof", "finished"]

legacy, lean = (e["v"] for e in events[1:3])
for layout, arm in zip(("legacy", "lean"), (legacy, lean), strict=True):
    assert arm["layout"] == layout
    scope = json.loads(base64.urlsafe_b64decode(arm["db"][3:] + "=" * (-len(arm["db"][3:]) % 4)))
    assert scope[3] == nonce + "-" + layout
    assert len({op for t, op in arm["physical"] if int(t) > 0}) == 3
    assert [op for _, op in arm["physical"]] == [row["operationId"] for row in arm["log"]]
    arm["log"] = [{k: v for k, v in row.items() if k != "operationId"} for row in arm["log"]]
compare({k: v for k, v in legacy.items() if k not in ("db", "layout", "physical")},
        {k: v for k, v in lean.items() if k not in ("db", "layout", "physical")})
assert lean["exact"] == {"binding": {"type": "integer", "value": "9007199254740993"},
                         "number": 0.30000000000000004, "negativeZeroRejected": True}
assert lean["counts"] == [2, 2]
assert lean["order"] == [[{"?s": "j:1", "?v": "four"}], [{"?s": "j:2", "?v": "three"}]]
assert lean["complete"] == lean["order"][0] + lean["order"][1]
assert lean["dependencies"] == [{"sourcePosition": 1, "nextTemporalBoundary": 10}, {"sourcePosition": 2}]
assert lean["explainBackend"] == ["datomic-datalog", "datomic-datalog"]
assert lean["recursive"] == [{"?y": "n:2"}, {"?y": "n:3"}]
assert lean["optional"] == [{"?b": None, "?subject": "j:1"}, {"?b": None, "?subject": "j:2"}]
assert lean["datalog"]["alternatives"] == [{"?subject": "j:1"}]
assert lean["datalog"]["aggregate"] == [{"?count": 2}]
assert lean["datalog"]["actor"] == [{"?actor": "client", "?v": "four"}, {"?actor": "client", "?v": "three"}]

first, second, third = lean["receipts"]
assert [r["position"] for r in (first, second, third)] == [1, 2, 3]
assert first["instant"] < second["instant"] < third["instant"]
assert len({r["txId"] for r in (first, second, third)}) == 3


def a(ref, entity, attr, v, valid_from=0):
    return {"op": "assert", "ref": ref, "entityId": entity, "attribute": attr,
            "value": {"type": "string", "value": v}, "validFrom": valid_from, "createdBy": "client"}


def r(ref):
    return {"op": "retract", "target": ref}


case = {"format": "triplex-db-2/o-replay-case/1", "caseId": "DX-W1-query-" + nonce, "defaultScope": "s",
        "adapter": {"schemaVersion": 1}, "receipts": [], "commands": [], "queries": []}
for i, (receipt, ops) in enumerate(zip((first, second), (
        [a("A1", "j:1", ":j/a", "one"), a("A2", "j:1", ":j/b", "two", 10)],
        [a("A3", "j:2", ":j/a", "three"), r("A2"), a("A4", "j:1", ":j/a", "four"), r("A1")],
), strict=True)):
    command = "c" + str(i + 1)
    ids = iter(row["id"] for row in receipt["triples"])
    case["commands"].append({"kind": "transact", "clock": receipt["instant"], "operations": ops,
                             "meta": {"commandId": command, "actor": "client"}})
    case["receipts"].append({"command": i, "outcome": "committed", "txId": receipt["txId"],
                             "position": i + 1, "instant": receipt["instant"],
                             "assertionIds": [next(ids) if op["op"] == "assert" else None for op in ops]})
assert len({a for r in case["receipts"] for a in r["assertionIds"] if a}) == 4
cut = {"position": 2, "validAt": 10**15}
for name, p, pattern in (
        ("changes", 2, {"attribute": ":_tx/change", "entityId": second["txId"]}),
        ("entities", 2, {"attribute": ":_tx/changed-entity", "entityId": second["txId"]}),
        ("app", 2, {"attribute": ":j/a"}), ("prior", 1, {"attribute": ":j/a"})):
    case["queries"].append({"id": name, "kind": "match", "cut": {**cut, "position": p}, "pattern": pattern})
case["queries"].extend([
    {"id": "one", "kind": "transaction", "txId": second["txId"]},
    {"id": "command", "kind": "transactionByCommand", "commandId": "c2"},
    {"id": "page", "kind": "transactions", "after": 1, "limit": 1},
    {"id": "ownerPage", "kind": "transactionsForEntity", "entityId": "j:1", "limit": 1, "snapshotPosition": 2},
    {"id": "older", "kind": "transactionsForEntity", "entityId": "j:1", "limit": 1, "snapshotPosition": 2,
     "beforePosition": 2},
    {"id": "feed", "kind": "transactions"},
])
attempt = out / ("verify-" + str(uuid.uuid4()))
attempt.mkdir()
# [DX-W1] Why: use the independent revision that models R-JNL-5 and queryable journal facts.
# Rejected: the older timing oracle, whose match source contains only application assertions.
revision = "45bfa59b8c10c038de73f21f831bf1fd24a5368f"
oracle = attempt / "oracle"
for name in subprocess.check_output(["git", "ls-tree", "-r", "--name-only", revision, "--", "lab/oracles/replay"], text=True).splitlines():
    target = oracle / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(subprocess.check_output(["git", "show", revision + ":" + name]))
queries, answer = attempt / "case.json", attempt / "expected.json"
queries.write_text(canonical(case) + "\n")
subprocess.run([sys.executable, "-I", oracle / "lab/oracles/replay/cli.py", queries, "-o", answer], check=True)
oracle_out = json.loads(answer.read_text())
assert oracle_out["verdict"] == "PASS" and oracle_out["receiptConsistency"]["violations"] == []
expected = {item["id"]: item["result"] for item in oracle_out["queries"]}


def bag(rows):
    return sorted(canonical(numbers(row)) for row in rows)


def fact(row, journal):
    keys = ("entityId", "attribute", "value", "validFrom", "validTo", "recordedAt", "entityType", "txId")
    if not journal:
        keys = ("id",) + keys
    out = {}
    for key in keys:
        v = row.get(key)
        if isinstance(v, dict) and v.get("_id") == "Option":
            v = v.get("value")
        out[key] = v
    return out


for k, actual in lean["matched"].items():
    journal = k in ("changes", "entities")
    compare(bag(fact(row, journal) for row in actual),
            bag(fact(row, journal) for row in expected[k]["snapshot"]))
    if journal:
        vals = [v["value"]["value"] for v in expected[k]["snapshot"]]
        compare(bag(json.loads(x["?v"]) if k == "changes" else x["?v"] for x in lean["datalog"][k]), bag(vals))


def typed(item):
    if isinstance(item, list):
        return [typed(x) for x in item]
    if isinstance(item, dict):
        return {k: typed(v) for k, v in item.items() if k != "changedEntities"}
    return item


for k, actual in lean["typed"].items():
    compare(actual, typed(expected[k]))
for row, record in zip(lean["log"][:2], expected["feed"]["transactions"], strict=True):
    def identity(c):
        return [c["op"], c["tripleId"], c["entityId"], c["attribute"], c["validFrom"], c.get("validTo")]
    compare(bag([c["op"], c["assertionId"], c["entity"], c["attribute"], c["validFrom"], c["validTo"]]
                for c in row["changes"]), bag(identity(c) for c in record["changes"]))
    assert all(set(c) == {"op", "assertionId", "entity", "attribute", "validFrom", "validTo", "position"} and
               c["position"] == str(record["position"]) for c in row["changes"])


proof = {**binding, "oracle": revision, "case": sha(queries), "expected": sha(answer),
         "implicitNumericPage": lean["implicitNumericPage"]}
(attempt / "verified.json").write_text(json.dumps(proof, indent=2) + "\n")
print(attempt / "verified.json")

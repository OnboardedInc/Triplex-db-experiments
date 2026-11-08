"""V-O04b: probe O-REPLAY 0.4.1 (a9c1327) on the held Q49a-e rulings (lab/reviews/plan-v2-round6.responses.md,
section Q49) and on the residual refusals the author lists (ruled later as Q52). Expected answers are derived by the
verifier from the ruling text and the contract, not from the oracle's tests or RULES.md.

Verdicts: MATCH, WRONG-ANSWER, REFUSES (declined where the ruling decides), DERIVED-NOTE (the oracle answers a case the
ruling does not decide explicitly: recorded, not scored as wrong). V-O04c: the seven V-O04b DERIVED-NOTE rows are now
checked rows with the Q56a-g expected answers (main lab/acceptance/RULINGS-PENDING.md, 0abc5ff), each with a planted
wrong expectation in --self-test.

Also: a plaintext-leak scan over the whole output of the erasure case (every surface queried), and a whole-journal
comparison against the same command stream without the erase commands (Q49a, ER-JOURNAL-MODULO).

  python3 -I lab/verify/O02/tools/probe_q49.py WORKDIR [--self-test] -> lab/verify/O02/v-o04b/results/probe_q49[.self-test].json
"""
import copy
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
CLI = ROOT / "lab/oracles/replay/cli.py"
WORK = Path(sys.argv[1])
SELF_TEST = "--self-test" in sys.argv
OUT = ROOT / ("lab/verify/O02/v-o04b/results/probe_q49" + (".self-test" if SELF_TEST else "") + ".json")
C = json.loads((ROOT / "lab/acceptance/obligations.json").read_text())
ERR = {r["id"]: r for r in C["errorTable"]}

S = lambda s: {"type": "string", "value": s}  # noqa: E731
I = lambda s: {"type": "integer", "value": str(s)}  # noqa: E731
R = lambda s: {"type": "ref", "value": s}  # noqa: E731
J = lambda v: {"type": "json", "value": v}  # noqa: E731
D = lambda t, p, s: {"type": "decimal", "value": t, "precision": p, "scale": s}  # noqa: E731


def marker(at):
    return {"_tag": "ErasedValue", "erasedAt": at}


def case(commands=(), queries=(), **extra):
    c = {"format": "triplex-db-2/o-replay-case/1", "caseId": "v-o04b/q49", "defaultScope": "s",
         "commands": list(commands), "queries": list(queries)}
    c.update(extra)
    return c


def cmd(ops, clock, cid=None, **extra):
    c = {"clock": clock, "meta": {"commandId": cid or f"c{clock}"}, "operations": ops}
    c.update(extra)
    return c


def asrt(ref, e, a, v, et="Person"):
    return {"op": "assert", "ref": ref, "entityId": e, "attribute": a, "value": v, "validFrom": 0, "entityType": et}


def erase(e=None, a=None, target=None):
    o = {"op": "erase"}
    if target:
        o["target"] = target
    else:
        o["entityId"] = e
        if a:
            o["attribute"] = a
    return o


SCHEMA = [{"version": 1, "entityTypes": {
    "Person": {"attributes": {
        "name": {"attribute": ":person/name", "type": "string", "cardinality": "one"},
        "ssn": {"attribute": ":person/ssn", "type": "string", "cardinality": "one"},
        "email": {"attribute": ":person/email", "type": "string", "cardinality": "one"},
        "salary": {"attribute": ":person/salary", "type": "integer", "cardinality": "one"},
        "tags": {"attribute": ":person/tags", "type": "string", "cardinality": "many"},
        "org": {"attribute": ":person/org", "type": "ref", "cardinality": "one", "target": "Org"}}},
    "Org": {"attributes": {"label": {"attribute": ":org/label", "type": "string", "cardinality": "one"}}}}}]

SSN, SAL, ORG, TAGS = ":person/ssn", ":person/salary", ":person/org", ":person/tags"

# ------------------------------------------------------------------ the MAIN history (command index = list index)
MAIN_CMDS = [
    cmd([asrt("o1", "org:1", ":org/label", S("Acme"), "Org")], 100, "c0"),
    cmd([asrt("n1", "p1", ":person/name", S("Ann")), asrt("s1", "p1", SSN, S("SECRET-AAA-111")),
         asrt("m1", "p1", ":person/email", S("ann@x")), asrt("sal1", "p1", SAL, I(987654321)),
         asrt("t1a", "p1", TAGS, S("PII-TAG-1")), asrt("t1b", "p1", TAGS, S("public")), asrt("r1", "p1", ORG, R("org:1"))], 110, "c1"),
    cmd([asrt("n2", "p2", ":person/name", S("Bob")), asrt("s2", "p2", SSN, S("SECRET-BBB-222")),
         asrt("sal2", "p2", SAL, I(50)), asrt("r2", "p2", ORG, R("org:1"))], 120, "c2"),
    cmd([asrt("n3", "p3", ":person/name", S("Cid")), asrt("s3", "p3", SSN, S("VISIBLE-CCC-333")), asrt("sal3", "p3", SAL, I(30)),
         asrt("n5", "p5", ":person/name", S("Eve")),
         asrt("n6", "p6", ":person/name", S("Fay")), asrt("a-sal6", "p6", SAL, I(876543219)),
         asrt("n7", "p7", ":person/name", S("Gus")), asrt("g1", "p7", SSN, S("SECRET-G1")), asrt("g2", "p7", SSN, S("SECRET-G2"))],
        130, "c3"),
    cmd([{"op": "retract", "target": "s1"}, asrt("s1b", "p1", SSN, S("SECRET-AAA-444"))], 140, "c4"),
    cmd([erase("p1", SSN), erase("p2", SSN), erase("p7", SSN)], 200, "c5-erase"),
    cmd([erase("p1", SSN)], 210, "c6-re-erase"),
    cmd([erase("p5", SSN)], 220, "c7-erase-nothing"),
    cmd([asrt("n4", "p4", ":person/name", S("Dee")), asrt("s4", "p4", SSN, S("LATER-555"))], 230, "c8"),
    cmd([erase("p1", SAL), erase("p6", SAL), erase("p1", ORG), erase(target="t1a")], 240, "c9-erase"),
]
ERASE_CMDS = {5, 6, 7, 9}
ERASED_AT = {"s1": 200, "s1b": 200, "s2": 200, "g1": 200, "g2": 200, "sal1": 240, "a-sal6": 240, "r1": 240, "t1a": 240}
PLAINTEXT = ["SECRET-AAA-111", "SECRET-AAA-444", "SECRET-BBB-222", "SECRET-G1", "SECRET-G2", "987654321", "876543219", "PII-TAG-1"]
V = {"validAt": 1}
PEOPLE = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"]

MAIN_QUERIES = [
    {"id": "tx5", "kind": "transaction", "txId": "tx:5"},
    {"id": "tx6", "kind": "transaction", "txId": "tx:6"},
    {"id": "tx7", "kind": "transaction", "txId": "tx:7"},
    {"id": "tx9", "kind": "transaction", "txId": "tx:9"},
    {"id": "txs", "kind": "transactions", "after": 0, "limit": 100},
    {"id": "cat", "kind": "cutCatalog"},
    {"id": "jf", "kind": "journalFacts"},
    # journal facts are valid from the commit instant (R-JNL-5, Q33g): read them at V = 1000
    {"id": "jf5", "kind": "match", "cut": {"validAt": 1000}, "pattern": {"entityId": "tx:5", "attribute": ":_tx/change"}},
    {"id": "jf5e", "kind": "match", "cut": {"validAt": 1000}, "pattern": {"entityId": "tx:5", "attribute": ":_tx/changed-entity"}},
    {"id": "jf6", "kind": "match", "cut": {"validAt": 1000}, "pattern": {"entityId": "tx:6", "attribute": ":_tx/change"}},
    {"id": "jf1", "kind": "match", "cut": {"validAt": 1000}, "pattern": {"entityId": "tx:1", "attribute": ":_tx/change"}},
    {"id": "mp1", "kind": "match", "cut": V, "pattern": {"entityId": "p1"}},
    {"id": "mall", "kind": "match", "cut": V},
    {"id": "assertions", "kind": "assertions"},
    {"id": "gp1", "kind": "get", "entityType": "Person", "entityId": "p1", "cut": V, "include": ["org"]},
    {"id": "gp2", "kind": "get", "entityType": "Person", "entityId": "p2", "cut": V, "include": ["org"]},
    {"id": "gp7", "kind": "get", "entityType": "Person", "entityId": "p7", "cut": V},
    {"id": "vs", "kind": "valueSupports", "cut": V, "pattern": {"attribute": SSN}},
    {"id": "mval", "kind": "match", "cut": V, "pattern": {"attribute": SSN, "value": S("SECRET-AAA-444")}},
    {"id": "mval3", "kind": "match", "cut": V, "pattern": {"attribute": SSN, "value": S("VISIBLE-CCC-333")}},
    {"id": "snap", "kind": "assertionSnapshot", "mode": "known-at-valid", "cut": V, "pattern": {"attribute": SSN, "value": S("SECRET-BBB-222")}},
    {"id": "feq", "kind": "find", "entityType": "Person", "cut": V, "where": [{"prop": "ssn", "op": "eq", "value": S("SECRET-AAA-444")}]},
    {"id": "fne", "kind": "find", "entityType": "Person", "cut": V, "where": [{"prop": "ssn", "op": "ne", "value": S("zzz")}]},
    {"id": "fex", "kind": "find", "entityType": "Person", "cut": V, "where": [{"prop": "ssn", "op": "exists"}]},
    {"id": "fmi", "kind": "find", "entityType": "Person", "cut": V, "where": [{"prop": "ssn", "op": "missing"}]},
    {"id": "fgt", "kind": "find", "entityType": "Person", "cut": V, "where": [{"prop": "salary", "op": "gt", "value": I(10)}]},
    {"id": "fasc", "kind": "find", "entityType": "Person", "cut": V, "where": [{"prop": "salary", "op": "exists"}],
     "orderBy": [{"prop": "salary", "direction": "asc"}]},
    {"id": "fdesc", "kind": "find", "entityType": "Person", "cut": V, "where": [{"prop": "salary", "op": "exists"}],
     "orderBy": [{"prop": "salary", "direction": "desc"}]},
    {"id": "agg", "kind": "aggregate", "cut": V, "match": {"attributes": {"v": SAL}},
     "aggregates": [{"op": "sum", "var": "v", "as": "sum"}, {"op": "min", "var": "v", "as": "min"}, {"op": "max", "var": "v", "as": "max"},
                    {"op": "avg", "var": "v", "as": "avg", "convert": "toNumber"}]},
    {"id": "grp", "kind": "aggregate", "cut": V, "match": {"attributes": {"n": ":person/name", "s": SSN}}, "groupBy": ["s"],
     "aggregates": [{"op": "count", "var": "n", "as": "c"}]},
    {"id": "hist", "kind": "history", "entityId": "p1"},
    {"id": "page", "kind": "entityPage", "entityType": "Person", "limit": 50, "cut": V},
    {"id": "tl", "kind": "timeline", "entityType": "Person", "entityId": "p1", "attribute": SSN, "cut": {}},
    {"id": "reach1", "kind": "reachability", "cut": V, "attribute": ORG, "from": "p1"},
    {"id": "reach2", "kind": "reachability", "cut": V, "attribute": ORG, "from": "p2"},
]
MAIN = case(MAIN_CMDS, MAIN_QUERIES, schemas=SCHEMA)
CONTROL = case([c for i, c in enumerate(MAIN_CMDS) if i not in ERASE_CMDS],
               [q for q in MAIN_QUERIES if q["id"] in ("txs", "jf", "mall", "assertions")], schemas=SCHEMA)


# ------------------------------------------------------------------ runner

def run(name, the_case):
    WORK.mkdir(parents=True, exist_ok=True)
    p, o = WORK / f"{name}.case.json", WORK / f"{name}.expected.json"
    p.write_text(json.dumps(the_case, indent=1) + "\n")
    if o.exists():
        o.unlink()
    proc = subprocess.run([sys.executable, "-I", str(CLI), str(p), "-o", str(o)], capture_output=True, text=True)
    if proc.returncode == 2:
        return {"refused": proc.stderr.strip(), "outputWritten": o.exists()}
    if proc.returncode not in (0, 1):
        return {"crashed": proc.returncode, "stderr": proc.stderr[-1500:]}
    return {"report": json.loads(o.read_text()), "text": o.read_text()}


def q(rep, qid):
    return next(x for x in rep["queries"] if x["id"] == qid)


def res(rep, qid):
    return q(rep, qid).get("result")


def outc(rep, i):
    return next(o for o in rep["commandOutcomes"] if o["command"] == i)["expected"]


def ids(rows):
    return sorted(r["id"] for r in rows)


def find_ids(rep, qid):
    r = res(rep, qid)
    return [i for p in r["pages"] for i in p["ids"]] if r else q(rep, qid).get("error")


def err_is(node, eid):
    row = ERR[eid]
    tag = node.get("_tag", node.get("errorTag")) if isinstance(node, dict) else None
    return isinstance(node, dict) and node.get("error") == eid and tag == row["tag"] and node.get("reason") in row["reason"].split("|")


def is_xnm(node):
    return isinstance(node, dict) and node.get("error") == "X-NOT-MODELED"


ROWS = []


def score(ruling, pid, expected, ok, got, kind="answer"):
    verdict = ("MATCH" if ok else "WRONG-ANSWER") if kind == "answer" else ("DERIVED-NOTE" if kind == "note" else kind)
    ROWS.append({"ruling": ruling, "probe": pid, "expected": expected, "verdict": verdict, "oracle": got})


def check(ruling, pid, expected, fn, rep):
    try:
        ok, got = fn(rep)
    except Exception as error:  # a probe failure must be visible
        ok, got = False, f"probe error {error!r}"
    score(ruling, pid, expected, ok, got)


# ------------------------------------------------------------------ MAIN

main = run("MAIN", MAIN)
control = run("CONTROL", CONTROL)
M = main.get("report")
if M is None:
    score("Q49a", "MAIN answered", "the erasure history is answered, not refused", False, main)
else:
    # Q49a: the erasure commit is an ordinary journal transaction with identity-only changes
    check("Q49a", "every command commits (erasures included)", "10 committed outcomes",
          lambda r: (all(outc(r, i)["outcome"] == "committed" for i in range(10)), [outc(r, i)["outcome"] for i in range(10)]), M)
    check("Q49a", "erasure commit has a position and is in cutCatalog", "positions 1..10; c5 at 6, c9 at 10",
          lambda r: ([x["position"] for x in res(r, "cat")] == list(range(1, 11)), [(x["position"], x["command"], x.get("erasure"))
                                                                                     for x in res(r, "cat")]), M)
    check("Q49a", "erasure commit in transactions()", "10 records, tx:5 and tx:9 included",
          lambda r: (len(res(r, "txs")["transactions"]) == 10 and {"tx:5", "tx:9"} <= {t["txId"] for t in res(r, "txs")["transactions"]},
                     [t["txId"] for t in res(r, "txs")["transactions"]]), M)

    def identity_only(rec, want):
        ch = rec["changes"]
        no_value = all("value" not in c and set(c) <= {"op", "entityId", "attribute", "assertionIds"} for c in ch)
        got = sorted((c["entityId"], c["attribute"], tuple(sorted(c["assertionIds"]))) for c in ch)
        return no_value and got == sorted(want), ch

    check("Q49a", "tx:5 changes are identities only", "(p1 ssn [s1 s1b]) (p2 ssn [s2]) (p7 ssn [g1 g2]); no value field",
          lambda r: identity_only(res(r, "tx5"), [("p1", SSN, ("s1", "s1b")), ("p2", SSN, ("s2",)), ("p7", SSN, ("g1", "g2"))]), M)
    check("Q49a", "tx:9 changes are identities only", "(p1 salary [sal1]) (p6 salary [a-sal6]) (p1 org [r1]) (p1 tags [t1a])",
          lambda r: identity_only(res(r, "tx9"), [("p1", SAL, ("sal1",)), ("p6", SAL, ("a-sal6",)), ("p1", ORG, ("r1",)),
                                                  ("p1", TAGS, ("t1a",))]), M)
    check("Q49a", "tx:5 has its own :_tx/ facts", "3 :_tx/change facts and changed entities {p1 p2 p7}",
          lambda r: (res(r, "jf5")["count"] == 3 and sorted(x["value"]["value"] for x in res(r, "jf5e")["raw"]) == ["p1", "p2", "p7"]
                     and sorted(res(r, "tx5")["changedEntities"]) == ["p1", "p2", "p7"],
                     [res(r, "jf5")["count"], [x["value"]["value"] for x in res(r, "jf5e")["raw"]], res(r, "tx5")["changedEntities"]]), M)
    check("Q49a", "erasure :_tx/change facts carry no value", "json content of each tx:5 change fact has no value field",
          lambda r: (all("value" not in x["value"]["value"] for x in res(r, "jf5")["raw"]), [x["value"]["value"] for x in res(r, "jf5")["raw"]]), M)
    # Q49b
    check("Q49b", "re-erase commits with an empty change list", "tx:6 committed, changes []",
          lambda r: (outc(r, 6)["outcome"] == "committed" and res(r, "tx6")["changes"] == [] and res(r, "jf6")["count"] == 0,
                     [res(r, "tx6")["changes"], res(r, "jf6")["count"]]), M)
    check("Q49b", "erase matching nothing commits with an empty change list", "tx:7 committed, changes []",
          lambda r: (outc(r, 7)["outcome"] == "committed" and res(r, "tx7")["changes"] == [], res(r, "tx7")["changes"]), M)
    check("Q49b", "first erasure sets erasedAt", "s1b erasedAt 200 (not the re-erase's 210)",
          lambda r: (next(x for x in res(r, "mp1")["raw"] if x["id"] == "s1b")["value"] == marker(200),
                     next(x for x in res(r, "mp1")["raw"] if x["id"] == "s1b")["value"]), M)
    # R-ERA-1 / TARGETS 7.1 marker everywhere, identities and intervals kept
    def markers_ok(rows, need):
        """every erased assertion in `rows` shows its marker, and every id in `need` is present (no vacuous pass)"""
        bad = [(x["id"], x["value"]) for x in rows if x["id"] in ERASED_AT and x["value"] != marker(ERASED_AT[x["id"]])]
        missing = sorted(set(need) - {x["id"] for x in rows})
        return not bad and not missing, {"wrong": bad, "missing": missing}
    LIVE = {"s1b", "s2", "g1", "g2", "sal1", "a-sal6", "r1", "t1a"}
    check("Q24/Q49a", "mall: erased values are markers", "the 8 live erased assertions show ErasedValue{erasedAt}",
          lambda r: markers_ok(res(r, "mall")["raw"], LIVE), M)
    check("Q24/Q49a", "mp1: erased values are markers", "s1b, sal1, r1, t1a show the marker",
          lambda r: markers_ok(res(r, "mp1")["raw"], {"s1b", "sal1", "r1", "t1a"}), M)
    check("Q24/Q49a", "assertions relation: markers", "all 9 erased assertions show the marker",
          lambda r: markers_ok(res(r, "assertions")["assertions"], set(ERASED_AT)), M)
    check("Q24/Q49a", "history raw lifetime: markers, retirement kept", "s1 marker with its retirement (retracted at 140)",
          lambda r: (markers_ok(res(r, "hist")["rawLifetime"], {"s1", "s1b", "sal1", "r1", "t1a"})[0]
                     and next(x for x in res(r, "hist")["rawLifetime"] if x["id"] == "s1")["retractedAt"] == 140,
                     [(x["id"], x["value"], x.get("retractedAt")) for x in res(r, "hist")["rawLifetime"]]), M)
    check("Q49a", "earlier :_tx/change facts re-rendered with markers", "tx:1's 7 change facts: s1, sal1, t1a, r1 carry markers, none carries plaintext",
          lambda r: (res(r, "jf1")["count"] == 7 and not any(t in json.dumps(res(r, "jf1")) for t in PLAINTEXT)
                     and json.dumps(res(r, "jf1")).count('"ErasedValue"') >= 4, [res(r, "jf1")["count"], json.dumps(res(r, "jf1"))[:400]]), M)
    check("Q24", "value written after the erasure is readable", "p4 ssn LATER-555 readable",
          lambda r: (any(x["id"] == "s4" and x["value"] == S("LATER-555") for x in res(r, "mall")["raw"]), "s4"), M)
    check("Q24", "timeline: markers", "s1 and s1b markers at 200",
          lambda r: (sorted((x["identity"], json.dumps(x["value"], sort_keys=True)) for x in res(r, "tl")["assertions"]) ==
                     sorted((k, json.dumps(marker(200), sort_keys=True)) for k in ("s1", "s1b")), res(r, "tl")["assertions"]), M)
    check("Q24", "entityPage bodies: markers", "the 8 live erased assertions show the marker in page bodies",
          lambda r: markers_ok([t for p in res(r, "page")["pages"] for e in p["entities"] for t in e["triples"]], LIVE), M)
    # models
    def prop(rep, qid, name):
        return res(rep, qid)["properties"].get(name)
    check("Q24/Q49c", "get p1: single-support ssn is the marker", "ssn = marker(200)",
          lambda r: (prop(r, "gp1", "ssn").get("value") == marker(200), prop(r, "gp1", "ssn")), M)
    check("Q49c", "get p1: erased reference not followed", "org = marker(240); the include returns the marker",
          lambda r: (prop(r, "gp1", "org").get("value") == marker(240) and json.dumps(res(r, "gp1").get("includes")).count("Acme") == 0,
                     [prop(r, "gp1", "org"), res(r, "gp1").get("includes")]), M)
    check("Q49c", "get p2: readable reference followed", "include org returns the org:1 document (Acme)",
          lambda r: ("Acme" in json.dumps(res(r, "gp2").get("includes")), res(r, "gp2").get("includes")), M)
    check("Q49c", "get p1: card-many keeps the readable element and the marker", "tags = {public, marker(240)}",
          lambda r: (sorted(json.dumps(v["value"], sort_keys=True) for v in prop(r, "gp1", "tags")["values"]) ==
                     sorted([json.dumps(S("public"), sort_keys=True), json.dumps(marker(240), sort_keys=True)]), prop(r, "gp1", "tags")), M)
    check("Q49c", "get p7: two erased card-one values are one marker group", "ssn = marker(200), no conflict",
          lambda r: ("error" not in q(r, "gp7") and prop(r, "gp7", "ssn").get("value") == marker(200), q(r, "gp7")), M)
    check("Q49c", "valueSupports: one marker group per (entity, attribute)", "p1 [s1b], p2 [s2], p7 [g1 g2] as markers; p3, p4 readable",
          lambda r: (sorted((x["entityId"], json.dumps(x["value"], sort_keys=True), tuple(x["assertionIds"])) for x in res(r, "vs")["supports"]) ==
                     sorted([("p1", json.dumps(marker(200), sort_keys=True), ("s1b",)), ("p2", json.dumps(marker(200), sort_keys=True), ("s2",)),
                             ("p7", json.dumps(marker(200), sort_keys=True), ("g1", "g2")), ("p3", json.dumps(S("VISIBLE-CCC-333"), sort_keys=True), ("s3",)),
                             ("p4", json.dumps(S("LATER-555"), sort_keys=True), ("s4",))]), res(r, "vs")["supports"]), M)
    # Q49c predicates
    check("Q49c", "match value pattern never matches an erased value", "match ssn = SECRET-AAA-444: no rows",
          lambda r: (res(r, "mval")["raw"] == [], ids(res(r, "mval")["raw"])), M)
    check("Q49c", "match value pattern on a readable value", "match ssn = VISIBLE-CCC-333: [s3]",
          lambda r: (ids(res(r, "mval3")["raw"]) == ["s3"], ids(res(r, "mval3")["raw"])), M)
    check("Q49c", "assertionSnapshot value pattern never matches an erased value", "no rows",
          lambda r: (res(r, "snap")["assertions"] == [], res(r, "snap")["assertions"]), M)
    check("Q49c", "find eq never selects by an erased value", "[]", lambda r: (find_ids(r, "feq") == [], find_ids(r, "feq")), M)
    check("Q49c", "find ne never selects by an erased value", "[p3, p4] (not p1, p2, p7)",
          lambda r: (sorted(find_ids(r, "fne")) == ["p3", "p4"], find_ids(r, "fne")), M)
    check("Q49c", "find exists sees an erased value", "[p1, p2, p3, p4, p7]",
          lambda r: (sorted(find_ids(r, "fex")) == ["p1", "p2", "p3", "p4", "p7"], find_ids(r, "fex")), M)
    check("Q49c", "find missing does not", "[p5, p6]", lambda r: (sorted(find_ids(r, "fmi")) == ["p5", "p6"], find_ids(r, "fmi")), M)
    check("Q49c", "find range never selects by an erased value", "salary > 10: [p2, p3]",
          lambda r: (sorted(find_ids(r, "fgt")) == ["p2", "p3"], find_ids(r, "fgt")), M)
    check("Q49c", "ORDER BY asc: erased last by assertion id", "[p3 (30), p2 (50), p6 (a-sal6), p1 (sal1)]",
          lambda r: (find_ids(r, "fasc") == ["p3", "p2", "p6", "p1"], find_ids(r, "fasc")), M)
    check("Q49c", "ORDER BY desc: erased last by assertion id", "[p2, p3, p6, p1]",
          lambda r: (find_ids(r, "fdesc") == ["p2", "p3", "p6", "p1"], find_ids(r, "fdesc")), M)
    check("Q49c", "SUM/MIN/MAX/AVG skip erased values", "sum 80, min 30, max 50, avg 40.0",
          lambda r: ((res(r, "agg")["rows"][0]["sum"], res(r, "agg")["rows"][0]["min"], res(r, "agg")["rows"][0]["max"],
                      res(r, "agg")["rows"][0]["avg"].get("bits")) == (I(80), I(30), I(50), "0x4044000000000000"), res(r, "agg")["rows"]), M)
    check("Q49c", "GROUP BY: one marker group for the attribute", "groups: marker(200) -> 3 names; VISIBLE-CCC-333 -> 1; LATER-555 -> 1",
          lambda r: (sorted((json.dumps(x["s"], sort_keys=True), x["c"]["value"]) for x in res(r, "grp")["rows"]) ==
                     sorted([(json.dumps(marker(200), sort_keys=True), "3"), (json.dumps(S("VISIBLE-CCC-333"), sort_keys=True), "1"),
                             (json.dumps(S("LATER-555"), sort_keys=True), "1")]), res(r, "grp")["rows"]), M)
    check("Q49c", "reachability does not follow an erased reference", "from p1: closure []; from p2: [org:1]",
          lambda r: (res(r, "reach1")["closure"] == [] and res(r, "reach2")["closure"] == ["org:1"],
                     [res(r, "reach1")["closure"], res(r, "reach2")["closure"]]), M)
    # plaintext scan over the whole output document
    leaks = {t: main["text"].count(t) for t in PLAINTEXT if t in main["text"]}
    score("Q49a", "no plaintext anywhere in the output", "0 occurrences of the 8 erased plaintexts (state, journal, facts, every query)",
          not leaks, leaks or "none")

# whole-journal comparison (Q49a, ER-JOURNAL-MODULO)
Cr = control.get("report")
if M is not None and Cr is not None:
    def by_command(rep, cases_cmds, skip=()):
        cid = {}
        for row in res(rep, "cat") if any(x["id"] == "cat" for x in rep["queries"]) else []:
            cid[row["txId"]] = row["command"]
        return cid
    # map control txIds/positions to MAIN's via commandId
    m_recs = {t["commandId"]: t for t in res(M, "txs")["transactions"]}
    c_recs = {t["commandId"]: t for t in res(Cr, "txs")["transactions"]}
    tx_map = {c["txId"]: m_recs[k]["txId"] for k, c in c_recs.items()}
    pos_map = {c["position"]: m_recs[k]["position"] for k, c in c_recs.items()}

    def remap(node, key=None):
        if isinstance(node, dict):
            out = {k: remap(v, k) for k, v in node.items()}
            if node.get("tripleId") in ERASED_AT and "value" in node:
                out["value"] = marker(ERASED_AT[node["tripleId"]])
            return out
        if isinstance(node, list):
            return [remap(x, key) for x in node]
        if isinstance(node, str):
            if node in tx_map:
                return tx_map[node]
            return re.sub(r"journal:(tx:\d+)", lambda m: "journal:" + tx_map.get(m.group(1), m.group(1)), node)
        if isinstance(node, int) and key in ("position", "recordedPosition", "retractedPosition", "next"):
            return pos_map.get(node, node)
        return node

    want = {k: remap(v) for k, v in c_recs.items()}
    got = {k: v for k, v in m_recs.items() if k not in ("c5-erase", "c6-re-erase", "c7-erase-nothing", "c9-erase")}
    diffs = [k for k in want if json.dumps(want[k], sort_keys=True) != json.dumps(got.get(k), sort_keys=True)]
    score("Q49a", "whole journal = control journal with markers", "non-erasure records equal the no-erasure run's after markers replace erased values",
          not diffs and set(want) == set(got), {"differingRecords": diffs, "example": diffs and [want[diffs[0]], got.get(diffs[0])]})

    def facts(rep):
        return [x for x in res(rep, "jf")["facts"]]
    m_tx_of_erase = {m_recs[k]["txId"] for k in ("c5-erase", "c6-re-erase", "c7-erase-nothing", "c9-erase")}

    def strip_canonical(node):
        if isinstance(node, dict):
            return {k: strip_canonical(v) for k, v in node.items() if k != "canonical"}
        if isinstance(node, list):
            return [strip_canonical(x) for x in node]
        return node

    def fact_key(x):
        return json.dumps(strip_canonical({k: v for k, v in x.items() if k != "id"}), sort_keys=True)
    want_f = sorted(fact_key(remap(x)) for x in facts(Cr))
    got_f = sorted(fact_key(x) for x in facts(M) if x["entityId"] not in m_tx_of_erase)
    score("Q49a", "journal facts = control facts with markers", ":_tx/ facts of non-erasure transactions equal the control's with markers",
          want_f == got_f, {"onlyControl": [x for x in want_f if x not in got_f][:3], "onlyErased": [x for x in got_f if x not in want_f][:3]})
    want_a = sorted(json.dumps(remap(x), sort_keys=True) for x in res(Cr, "assertions")["assertions"])
    got_a = sorted(json.dumps(x, sort_keys=True) for x in res(M, "assertions")["assertions"])
    # assertions carry `id` (not tripleId): replace values by id
    want_a = sorted(json.dumps(dict(remap(x), value=marker(ERASED_AT[x["id"]])) if x["id"] in ERASED_AT else remap(x), sort_keys=True)
                    for x in res(Cr, "assertions")["assertions"])
    score("Q24/Q31f", "assertion relation = control with markers (shape kept)", "identical apart from the markers",
          want_a == got_a, {"onlyControl": [x for x in want_a if x not in got_a][:2], "onlyErased": [x for x in got_a if x not in want_a][:2]})
else:
    score("Q49a", "control comparison", "both cases answered", False, {"main": main.get("refused"), "control": control.get("refused")})


# ------------------------------------------------------------------ smaller cases

def single(ruling, pid, expected, the_case, fn, refusal=False):
    out = run(re.sub(r"[^A-Za-z0-9]+", "_", pid), the_case)
    if refusal:
        msg = out.get("refused", "")
        typed = out.get("report") and fn(out["report"])
        ok = (msg.split("malformed case: ", 1)[-1].startswith("X-NOT-MODELED") and not out.get("outputWritten")) or bool(typed)
        score(ruling, pid, expected, ok, msg or (out.get("report") and fn(out["report"]) and "typed X-NOT-MODELED")
              or {"answered": out.get("report") and out["report"].get("queries")})
        return
    if "report" not in out:
        score(ruling, pid, expected, False, out, kind="REFUSES" if "refused" in out else "CRASH")
        return
    try:
        ok, got = fn(out["report"])
    except Exception as error:
        ok, got = False, f"probe error {error!r}"
    score(ruling, pid, expected, ok, got)


def note(ruling, pid, question, the_case, fn):
    out = run(re.sub(r"[^A-Za-z0-9]+", "_", pid), the_case)
    got = out.get("refused") or (fn(out["report"]) if "report" in out else out)
    score(ruling, pid, question, True, got, kind="note")


SSN_SCHEMA = SCHEMA
base = [cmd([asrt("x1", "p1", SSN, S("SECRET-X1"))], 100)]
single("Q49b", "erase of an entity that never existed", "commits with an empty change list (an erase that matches nothing still commits)",
       case(base + [cmd([erase("nobody:9", SSN)], 200)], [{"id": "t", "kind": "transaction", "txId": "tx:1"}], schemas=SCHEMA),
       lambda r: (outc(r, 1)["outcome"] == "committed" and res(r, "t")["changes"] == [], [outc(r, 1), res(r, "t")]))
single("Q49b", "erase by entity of an entity with no assertions of that attribute", "commits, empty change list",
       case(base + [cmd([erase("p1", ":person/email")], 200)], [{"id": "t", "kind": "transaction", "txId": "tx:1"}], schemas=SCHEMA),
       lambda r: (outc(r, 1)["outcome"] == "committed" and res(r, "t")["changes"] == [], [outc(r, 1), res(r, "t")]))
single("Q49b", "erase by entity (every value of the entity)", "both p1 assertions erased; change list names them",
       case([cmd([asrt("x1", "p1", SSN, S("SECRET-X1")), asrt("x2", "p1", ":person/name", S("SECRET-NAME"))], 100),
             cmd([erase("p1")], 200)],
            [{"id": "m", "kind": "match", "cut": V, "pattern": {"entityId": "p1"}}, {"id": "t", "kind": "transaction", "txId": "tx:1"}],
            schemas=SCHEMA),
       lambda r: (all(x["value"] == marker(200) for x in res(r, "m")["raw"]) and
                  sorted(i for c in res(r, "t")["changes"] for i in c["assertionIds"]) == ["x1", "x2"], [res(r, "m")["raw"], res(r, "t")]))
single("Q49c", "retract-pattern never matches an erased value", "commits, retracts nothing; the erased assertion stays live",
       case(base + [cmd([erase("p1", SSN)], 200), cmd([{"op": "retract-pattern", "pattern": {"attribute": SSN, "value": S("SECRET-X1")}}], 300)],
            [{"id": "t", "kind": "transaction", "txId": "tx:2"}, {"id": "m", "kind": "match", "cut": V, "pattern": {"entityId": "p1"}}],
            schemas=SCHEMA),
       lambda r: (outc(r, 2)["outcome"] == "committed" and res(r, "t")["changes"] == [] and res(r, "m")["raw"][0]["retractedAt"] is None,
                  [outc(r, 2), res(r, "t")["changes"], res(r, "m")["raw"]]))
UNIQ_SCHEMA = copy.deepcopy(SCHEMA)
UNIQ_SCHEMA[0]["entityTypes"]["Person"]["attributes"]["ssn"]["unique"] = True
uniq_rule = {"enforce": {"fromSchema": 1}}
for erased, want in ((True, "committed"), (False, "rejected")):
    cmds = [cmd([asrt("u1", "p1", SSN, S("SECRET-U1"))], 100)] + ([cmd([erase("p1", SSN)], 200)] if erased else []) + \
           [dict(cmd([asrt("u2", "p2", SSN, S("SECRET-U1"))], 300), meta={"commandId": "u", "enforce": {"fromSchema": 1}})]
    single("Q49c", f"Unique {'ignores an erased value' if erased else 'control (no erasure)'}",
           f"a second SECRET-U1 is {want}", case(cmds, [], schemas=UNIQ_SCHEMA),
           lambda r, n=len(cmds) - 1, want=want: (outc(r, n)["outcome"] == want and (want == "committed" or err_is(outc(r, n), "E-CONSTRAINT")),
                                                  outc(r, n)))
single("Q49c", "COUNT counts one erased value", "count of salary values with one erased among 50, 30: 3",
       case([cmd([asrt("c1", "p1", SAL, I(111)), asrt("c2", "p2", SAL, I(50)), asrt("c3", "p3", SAL, I(30))], 100),
             cmd([erase("p1", SAL)], 200)],
            [{"id": "q", "kind": "aggregate", "cut": V, "match": {"attributes": {"v": SAL}}, "aggregates": [{"op": "count", "var": "v", "as": "c"}]}],
            schemas=SCHEMA),
       lambda r: (res(r, "q")["rows"][0]["c"]["value"] == "3", res(r, "q")["rows"]))
single("Q49c", "SUM over only erased values", "SUM skips every value: null (as AG-EMPTY-UNGROUPED); COUNT 1 is the residual-free form",
       case([cmd([asrt("c1", "p1", SAL, I(111))], 100), cmd([erase("p1", SAL)], 200)],
            [{"id": "q", "kind": "aggregate", "cut": V, "match": {"attributes": {"v": SAL}}, "aggregates": [{"op": "sum", "var": "v", "as": "s"}]}],
            schemas=SCHEMA),
       lambda r: (res(r, "q")["rows"] == [{"s": None}], res(r, "q")["rows"]))
# Q49d in flight
inflight = [cmd([asrt("f1", "p1", SSN, S("OLD-VALUE-1"))], 100), cmd([erase("p1", SSN)], 200)]
single("Q49d", "in-flight read accepts the old value or the marker", "readStart before the erase: InFlightErasure [old, marker(200)]",
       case(inflight, [{"id": "m", "kind": "match", "cut": V, "pattern": {"entityId": "p1"}, "readStart": {"afterCommand": 0}}], schemas=SCHEMA),
       lambda r: (res(r, "m")["raw"][0]["value"].get("_tag") == "InFlightErasure" and
                  res(r, "m")["raw"][0]["value"]["acceptable"] == [S("OLD-VALUE-1"), marker(200)], res(r, "m")["raw"][0]["value"]))
single("Q49d", "read started after the erase published", "readStart after the erase: the marker only",
       case(inflight, [{"id": "m", "kind": "match", "cut": V, "pattern": {"entityId": "p1"}, "readStart": {"afterCommand": 1}}], schemas=SCHEMA),
       lambda r: (res(r, "m")["raw"][0]["value"] == marker(200), res(r, "m")["raw"][0]["value"]))
single("Q24", "pre-erasure basis read after publication shows the marker", "cut at position 1 (before the erase): marker",
       case(inflight, [{"id": "m", "kind": "match", "cut": {"position": 1, "validAt": 1}, "pattern": {"entityId": "p1"}}], schemas=SCHEMA),
       lambda r: (res(r, "m")["raw"][0]["value"] == marker(200), res(r, "m")["raw"][0]["value"]))
# Q49e JSON number to decimal from the as-written reading
for js, p, s, want in ((0.1, 2, 1, "0.1"), (0.1, 20, 18, "0.100000000000000000"), (0.30000000000000004, 18, 17, "0.30000000000000004"),
                       (1.5, 3, 2, "1.50"), (100, 3, 0, "100")):
    single("Q49e", f"toDecimal(json {js!r}, {p}, {s})", f"{want} (as written, never the binary64 expansion)",
           case(queries=[{"id": "q", "kind": "expr", "expr": ["toDecimal", J(js), p, s]}]),
           lambda r, want=want: ((res(r, "q") or {}).get("value") == want, res(r, "q") or q(r, "q").get("error")))
for js, p, s, eid in (("1.5", 2, 1, "E-INVALID-VALUE"), (1.55, 2, 1, "E-DECIMAL-FRACTION"), (1234.5, 4, 1, "E-DECIMAL-OVERFLOW")):
    single("Q49e", f"toDecimal(json {js!r}, {p}, {s})", eid, case(queries=[{"id": "q", "kind": "expr", "expr": ["toDecimal", J(js), p, s]}]),
           lambda r, eid=eid: (err_is(q(r, "q").get("error"), eid), q(r, "q").get("error") or res(r, "q")))

# V-O04b DERIVED-NOTE rows, ruled as Q56 (main lab/acceptance/RULINGS-PENDING.md, 0abc5ff): now checked rows
GET_P8 = [{"id": "g", "kind": "get", "entityType": "Person", "entityId": "p8", "cut": V}]
GET_P9 = [{"id": "g", "kind": "get", "entityType": "Person", "entityId": "p9", "cut": V}]
Q56B = case([cmd([asrt("h1", "p8", SSN, S("SECRET-H1")), asrt("h2", "p8", SSN, S("VISIBLE-H2"))], 100), cmd([erase(target="h1")], 200)],
            GET_P8, schemas=SCHEMA)
single("Q56b", "card-one: readable value plus an erased value", "get is E-CONFLICTING-VALUES", Q56B,
       lambda r: (err_is(q(r, "g").get("error"), "E-CONFLICTING-VALUES"), q(r, "g").get("error") or res(r, "g")))
Q56C_CMDS = [cmd([asrt("e1", "p9", SSN, S("SAME")), asrt("e2", "p9", SSN, S("SAME"))], 100)]
Q56C = case(Q56C_CMDS + [cmd([erase(target="e1")], 200)], GET_P9, schemas=SCHEMA)
single("Q56c", "card-one: equal values, one support erased", "get is E-CONFLICTING-VALUES (answers never depend on the erased value)", Q56C,
       lambda r: (err_is(q(r, "g").get("error"), "E-CONFLICTING-VALUES"), q(r, "g").get("error") or res(r, "g")))
single("Q56c", "control: the same history without the erase", "one value SAME with supports [e1, e2], no error",
       case(Q56C_CMDS, GET_P9, schemas=SCHEMA),
       lambda r: (res(r, "g")["properties"]["ssn"] == {"value": S("SAME"), "supports": ["e1", "e2"]}, q(r, "g").get("error") or res(r, "g")))
Q56A_T = case(base + [cmd([erase(target="no-such-id")], 200)], [], schemas=SCHEMA)
single("Q56a", "erase by an unknown assertion id (target)", "rejected E-INVALID-VALUE, as for retract (Q33f)", Q56A_T,
       lambda r: (err_is(outc(r, 1), "E-INVALID-VALUE"), outc(r, 1)))

# two erased tags (kz asserted before ka) between readable ones; one marker group per attribute (Q49c grouping)
GET_P1 = [{"id": "g", "kind": "get", "entityType": "Person", "entityId": "p1", "cut": V}]
Q56D = case([cmd([asrt("kz", "p1", TAGS, S("SECRET-Z")), asrt("k1", "p1", TAGS, S("zeta")), asrt("ka", "p1", TAGS, S("SECRET-A")),
                  asrt("k3", "p1", TAGS, S("alpha"))], 100), cmd([erase(target="kz"), erase(target="ka")], 200)], GET_P1, schemas=SCHEMA)
single("Q56d", "card-many: markers after the readable elements", "[alpha, zeta, marker(200)]; the marker group's supports are {ka, kz}", Q56D,
       lambda r: ([v["value"] for v in res(r, "g")["properties"]["tags"]["values"]] == [S("alpha"), S("zeta"), marker(200)]
                  and sorted(res(r, "g")["properties"]["tags"]["values"][2]["supports"]) == ["ka", "kz"],
                  res(r, "g")["properties"]["tags"]["values"]))
# Required: enforcement rejects only new violations, so p1 becomes a Person in the enforced command (its ssn is untyped)
REQ_SCHEMA = copy.deepcopy(SCHEMA)
REQ_SCHEMA[0]["entityTypes"]["Person"]["attributes"]["ssn"]["required"] = True


def untyped(ref, e, a, v):
    o = asrt(ref, e, a, v)
    o.pop("entityType")
    return o


def req_case(pre):
    rq = dict(cmd([asrt("q2", "p1", ":person/name", S("Q"))], 300), meta={"commandId": "rq", "enforce": {"fromSchema": 1}})
    return case(pre + [rq], GET_P1, schemas=REQ_SCHEMA)


Q56E = req_case([cmd([untyped("q1", "p1", SSN, S("SECRET-Q1"))], 100), cmd([erase("p1", SSN)], 200)])
single("Q56e", "Required satisfied by an erased value", "the enforced command commits; get shows missingRequired []", Q56E,
       lambda r: (outc(r, 2)["outcome"] == "committed" and res(r, "g")["missingRequired"] == [], [outc(r, 2), res(r, "g")]))
single("Q56e", "control: no ssn at all", "the enforced command is rejected E-CONSTRAINT (required)",
       req_case([cmd([untyped("q0", "p1", ":person/email", S("e@x"))], 100)]),
       lambda r: (err_is(outc(r, 1), "E-CONSTRAINT") and outc(r, 1).get("codes") == ["required"], outc(r, 1)))
single("Q56e", "control: read side with no ssn", "get lists missingRequired [ssn]",
       case([cmd([asrt("q2", "p1", ":person/name", S("Q"))], 100)], GET_P1, schemas=REQ_SCHEMA),
       lambda r: (res(r, "g")["missingRequired"] == ["ssn"], res(r, "g")))
single("Q24", "pre-erasure cursor continues with markers", "page 2 of a cursor issued before the erase shows the marker",
       case([cmd([asrt(f"pg{i}", f"p{i}", SSN, S(f"SECRET-PG{i}")) for i in range(3)], 100), cmd([erase("p2", SSN)], 200)],
            [{"id": "a", "kind": "entityPage", "entityType": "Person", "limit": 2, "cut": {"position": 1, "validAt": 1}},
             {"id": "b", "kind": "entityPage", "entityType": "Person", "limit": 2, "cursorFrom": {"query": "a"}}], schemas=SCHEMA),
       lambda r: ([t["value"] for p in res(r, "b")["pages"] for e in p["entities"] for t in e["triples"]] == [marker(200)],
                  [t["value"] for p in res(r, "b")["pages"] for e in p["entities"] for t in e["triples"]]))
single("R-CMD-6", "erase of a transaction entity is E-RESERVED", "E-RESERVED (reserved namespace rule)",
       case(base + [cmd([erase("tx:0")], 200)], [], schemas=SCHEMA), lambda r: (err_is(outc(r, 1), "E-RESERVED"), outc(r, 1)))

single("Q49b", "erase by entity only, entity never existed", "commits with an empty change list (matches nothing)",
       case(base + [cmd([erase("nobody:9")], 200)], [{"id": "t", "kind": "transaction", "txId": "tx:1"}], schemas=SCHEMA),
       lambda r: (outc(r, 1)["outcome"] == "committed" and res(r, "t")["changes"] == [], [outc(r, 1), res(r, "t")]))
Q56A_ID = case(base + [cmd([{"op": "erase", "id": "no-such-id"}], 200)], [], schemas=SCHEMA)
single("Q56a", "erase by an unknown actual id ({id: ...})", "rejected E-INVALID-VALUE, as for retract (Q33f)", Q56A_ID,
       lambda r: (err_is(outc(r, 1), "E-INVALID-VALUE"), outc(r, 1)))
Q56F = case([cmd([asrt("x1", "p1", SSN, S("SECRET-F"))], 100), cmd([{"op": "erase", "id": "x1"}], 200)],
            [{"id": "m", "kind": "match", "cut": V, "pattern": {"entityId": "p1"}}, {"id": "t", "kind": "transaction", "txId": "tx:1"}],
            schemas=SCHEMA)
single("Q56f", "erase by a known actual id ({id: x1})", "commits; x1 reads as marker(200); the change names x1 only", Q56F,
       lambda r: (outc(r, 1)["outcome"] == "committed" and [x["value"] for x in res(r, "m")["raw"]] == [marker(200)]
                  and res(r, "t")["changes"] == [{"op": "erase", "entityId": "p1", "attribute": SSN, "assertionIds": ["x1"]}],
                  [outc(r, 1), res(r, "m")["raw"], res(r, "t")["changes"]]))
single("R-CMD-9", "erase with no selector", "malformed erase op: E-INVALID-VALUE (operation fault, Q33f)",
       case(base + [cmd([{"op": "erase"}], 200)], [], schemas=SCHEMA), lambda r: (err_is(outc(r, 1), "E-INVALID-VALUE"), outc(r, 1)))
single("Q24", "erase of an already retracted assertion by target", "commits; the retracted row shows the marker with its retirement",
       case([cmd([asrt("x1", "p1", SSN, S("SECRET-RT"))], 100), cmd([{"op": "retract", "target": "x1"}], 150), cmd([erase(target="x1")], 200)],
            [{"id": "h", "kind": "history", "entityId": "p1"}], schemas=SCHEMA),
       lambda r: (outc(r, 2)["outcome"] == "committed" and res(r, "h")["rawLifetime"][0]["value"] == marker(200)
                  and res(r, "h")["rawLifetime"][0]["retractedAt"] == 150, res(r, "h")["rawLifetime"]))

Q56G = case([cmd([asrt("x1", "p1", SSN, S("SECRET-RX"))], 100), cmd([erase(target="x1")], 200), cmd([{"op": "retract", "target": "x1"}], 250)],
            [{"id": "h", "kind": "history", "entityId": "p1"}], schemas=SCHEMA)
single("Q56g", "retract by target of an already erased assertion", "commits; history shows marker(200) with retractedAt 250", Q56G,
       lambda r: (outc(r, 2)["outcome"] == "committed" and len(res(r, "h")["rawLifetime"]) == 1
                  and res(r, "h")["rawLifetime"][0]["value"] == marker(200) and res(r, "h")["rawLifetime"][0]["retractedAt"] == 250,
                  [outc(r, 2), res(r, "h")["rawLifetime"]]))

# ------------------------------------------------------------------ residual refusals (author's list; ruled later as Q52)

R_CASE = MAIN_CMDS
single("residual", "COUNT over 2+ erased assertions", "X-NOT-MODELED",
       case(R_CASE, [{"id": "q", "kind": "aggregate", "cut": V, "match": {"attributes": {"v": SAL}},
                      "aggregates": [{"op": "count", "var": "v", "as": "c"}]}], schemas=SCHEMA),
       lambda r: is_xnm(q(r, "q").get("error")), refusal=True)
single("residual", "ORDER BY over erased plus missing", "X-NOT-MODELED",
       case(R_CASE, [{"id": "q", "kind": "find", "entityType": "Person", "cut": V, "orderBy": [{"prop": "salary"}]}], schemas=SCHEMA),
       lambda r: is_xnm(q(r, "q").get("error")), refusal=True)
diff_at = [cmd([asrt("d1", "p1", SSN, S("SECRET-D1"))], 100), cmd([asrt("d2", "p2", SSN, S("SECRET-D2")),
                                                                    asrt("d3", "p2", ":person/name", S("Bo"))], 110),
           cmd([asrt("d4", "p1", ":person/name", S("Al"))], 120), cmd([erase("p1", SSN)], 200), cmd([erase("p2", SSN)], 300)]
single("residual", "erasedAt of a group erased at different instants", "X-NOT-MODELED (GROUP BY ssn over markers from 200 and 300)",
       case(diff_at, [{"id": "q", "kind": "aggregate", "cut": V, "match": {"attributes": {"n": ":person/name", "s": SSN}}, "groupBy": ["s"],
                       "aggregates": [{"op": "count", "var": "n", "as": "c"}]}], schemas=SCHEMA),
       lambda r: is_xnm(q(r, "q").get("error")), refusal=True)
single("residual", "ReferenceTarget over an erased reference", "X-NOT-MODELED",
       case([cmd([asrt("o1", "org:1", ":org/label", S("Acme"), "Org"), asrt("rr", "p1", ORG, R("org:1"))], 100),
             cmd([erase("p1", ORG)], 200),
             dict(cmd([asrt("n1", "p1", ":person/name", S("Ann"))], 300), meta={"commandId": "rt", "enforce": {"fromSchema": 1}})],
            [], schemas=SCHEMA), lambda r: False, refusal=True)
single("residual", "computed answer over an in-flight value", "X-NOT-MODELED (find by value with readStart before the erase)",
       case(inflight, [{"id": "q", "kind": "find", "entityType": "Person", "cut": V, "readStart": {"afterCommand": 0},
                        "where": [{"prop": "ssn", "op": "eq", "value": S("OLD-VALUE-1")}]}], schemas=SCHEMA),
       lambda r: is_xnm(q(r, "q").get("error")), refusal=True)
single("residual", "toDecimal(json, p, s, rounding)", "X-NOT-MODELED",
       case(queries=[{"id": "q", "kind": "expr", "expr": ["toDecimal", J(0.15), 2, 1, "half-even"]}]),
       lambda r: is_xnm(q(r, "q").get("error")), refusal=True)
single("residual", "the `erasure` spelling", "X-NOT-MODELED",
       case(base + [cmd([{"op": "erasure", "entityId": "p1", "attribute": SSN}], 200)], [], schemas=SCHEMA), lambda r: False, refusal=True)
single("residual", "erase mixed with other ops", "X-NOT-MODELED",
       case(base + [cmd([erase("p1", SSN), asrt("y", "p2", SSN, S("Y"))], 200)], [], schemas=SCHEMA), lambda r: False, refusal=True)
single("residual", "preconditions on erase", "X-NOT-MODELED",
       case(base + [dict(cmd([erase("p1", SSN)], 200), meta={"commandId": "pe", "preconditions": [{"_tag": "TripleLive", "target": "x1"}]})],
            [], schemas=SCHEMA), lambda r: False, refusal=True)

# ------------------------------------------------------------------ self-test: wrong expectations must not MATCH
if SELF_TEST:
    ROWS.clear()
    single("ST", "ST erased value readable", "the plaintext (wrong)", case(inflight, [{"id": "m", "kind": "match", "cut": V,
                                                                                        "pattern": {"entityId": "p1"}}], schemas=SCHEMA),
           lambda r: (res(r, "m")["raw"][0]["value"] == S("OLD-VALUE-1"), res(r, "m")["raw"][0]["value"]))
    single("ST", "ST erasedAt = re-erase instant", "210 (wrong)", MAIN,
           lambda r: (next(x for x in res(r, "mp1")["raw"] if x["id"] == "s1b")["value"] == marker(210), "s1b"))
    single("ST", "ST desc order puts erased first", "[p6, p1, p2, p3] (wrong)", MAIN,
           lambda r: (find_ids(r, "fdesc") == ["p6", "p1", "p2", "p3"], find_ids(r, "fdesc")))
    single("ST", "ST SUM counts erased", "sum includes 987654321 (wrong)", MAIN,
           lambda r: (res(r, "agg")["rows"][0]["sum"] != I(80), res(r, "agg")["rows"]))
    single("ST", "ST erasure change carries a value", "a value field (wrong)", MAIN,
           lambda r: (any("value" in c for c in res(r, "tx5")["changes"]), res(r, "tx5")["changes"]))
    single("ST", "ST json 0.1 binary expansion", "0.100000000000000006 (wrong)",
           case(queries=[{"id": "q", "kind": "expr", "expr": ["toDecimal", J(0.1), 20, 18]}]),
           lambda r: ((res(r, "q") or {}).get("value") == "0.100000000000000006", res(r, "q")))
    single("ST", "ST refusal answered", "a refusal probe on an answered case (count with one erased) must not MATCH",
           case([cmd([asrt("c1", "p1", SAL, I(111)), asrt("c2", "p2", SAL, I(50))], 100), cmd([erase("p1", SAL)], 200)],
                [{"id": "q", "kind": "aggregate", "cut": V, "match": {"attributes": {"v": SAL}}, "aggregates": [{"op": "count", "var": "v", "as": "c"}]}],
                schemas=SCHEMA), lambda r: is_xnm(q(r, "q").get("error")), refusal=True)
    # Q56 rows: each planted wrong expectation is a plausible alternative ruling
    single("ST", "ST Q56b readable value wins", "VISIBLE-H2 (wrong)", Q56B,
           lambda r: ((res(r, "g") or {}).get("properties", {}).get("ssn", {}).get("value") == S("VISIBLE-H2"), q(r, "g").get("error") or res(r, "g")))
    single("ST", "ST Q56c remaining support still reads SAME", "SAME (wrong)", Q56C,
           lambda r: ((res(r, "g") or {}).get("properties", {}).get("ssn", {}).get("value") == S("SAME"), q(r, "g").get("error") or res(r, "g")))
    single("ST", "ST Q56a unknown target commits empty", "committed, [] (wrong)", Q56A_T,
           lambda r: (outc(r, 1)["outcome"] == "committed", outc(r, 1)))
    single("ST", "ST Q56d marker first", "[marker, alpha, zeta] (wrong)", Q56D,
           lambda r: ([v["value"] for v in res(r, "g")["properties"]["tags"]["values"]] == [marker(200), S("alpha"), S("zeta")],
                      res(r, "g")["properties"]["tags"]["values"]))
    single("ST", "ST Q56e erased value fails Required", "rejected E-CONSTRAINT (wrong)", Q56E,
           lambda r: (err_is(outc(r, 2), "E-CONSTRAINT"), outc(r, 2)))
    single("ST", "ST Q56a unknown id commits empty", "committed (wrong)", Q56A_ID,
           lambda r: (outc(r, 1)["outcome"] == "committed", outc(r, 1)))
    single("ST", "ST Q56f id selector rejected", "rejected E-INVALID-VALUE (wrong)", Q56F,
           lambda r: (err_is(outc(r, 1), "E-INVALID-VALUE"), outc(r, 1)))
    single("ST", "ST Q56g retractedAt is the erase instant", "retractedAt 200 (wrong)", Q56G,
           lambda r: (res(r, "h")["rawLifetime"][0]["retractedAt"] == 200, res(r, "h")["rawLifetime"]))

counts = {}
for r in ROWS:
    counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"counts": counts, "probes": len(ROWS), "rows": ROWS}, indent=1, default=str) + "\n")
print(json.dumps(counts), len(ROWS), "probes")
for r in ROWS:
    if r["verdict"] != "MATCH":
        print(f"{r['verdict']:13s} {r['ruling']:15s} {r['probe'][:58]:58s} | {json.dumps(r['oracle'], default=str)[:330]}")

"""V-O04d: probe O-REPLAY 0.4.2 (3e38a61) on the Q52a-g rulings (lab/acceptance/RULINGS.md) and the pending Q66a-c rulings
(lab/acceptance/RULINGS-PENDING.md). Expected answers are derived by the verifier from the ruling text and the contract
(AG-COUNT, Q22/Q43d rounding, Q33f, Q49), not from the oracle's tests or RULES.md.

Verdicts: MATCH, WRONG-ANSWER, REFUSES (exit 2 where the ruling decides), OBSERVED (recorded behaviour the brief asks
about, not scored). V-O04e: Q66b is a checked section (two-page, three-page and chained continuations, the author's two
choices: a continuation's own readStart, and a literal cursor token). V-O04f: Q70a-e rows (literal tokens from plain and
in-flight reads, equal tokens issued last by either), plus two recorded page sequences the rulings do not name directly.
V-O04g: Q70f-k rows (ambiguous tokens and journal `after` fail closed, journal pagination, identical views with different
bodies, read scope for scope-field kinds); the V-O04f F9/F10 rows are checked; new OBSERVED rows record the page
continuations Q70a-k still does not name (transactionsForEntity pages, a string or decimal `after`).
V-O04h: those three rows are checked from Q70l and Q70m, with a row per paged kind in the oracle's table and
malformed-value rows (after "1", 1.0, -1, true; beforePosition and snapshotPosition likewise).

  python3 -I lab/verify/O02/tools/probe_q52.py WORKDIR [--self-test] [--results=DIR]
      -> DIR/probe_q52[.self-test].json (default lab/verify/O02/V-O04d/results)
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
CLI = ROOT / "lab/oracles/replay/cli.py"
WORK = Path(sys.argv[1])
SELF_TEST = "--self-test" in sys.argv
RESULTS = ROOT / "lab/verify/O02" / next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--results=")), "V-O04d/results")
OUT = RESULTS / ("probe_q52" + (".self-test" if SELF_TEST else "") + ".json")
C = json.loads((ROOT / "lab/acceptance/obligations.json").read_text())
ERR = {r["id"]: r for r in C["errorTable"]}

S = lambda s: {"type": "string", "value": s}  # noqa: E731
I = lambda s: {"type": "integer", "value": str(s)}  # noqa: E731
R = lambda s: {"type": "ref", "value": s}  # noqa: E731
J = lambda v: {"type": "json", "value": v}  # noqa: E731
SAL, SSN, TAGS, ORG, NAME = ":person/salary", ":person/ssn", ":person/tags", ":person/org", ":person/name"
V = {"validAt": 1}
SCHEMA = [{"version": 1, "entityTypes": {
    "Person": {"attributes": {
        "name": {"attribute": NAME, "type": "string", "cardinality": "one"},
        "ssn": {"attribute": SSN, "type": "string", "cardinality": "one"},
        "salary": {"attribute": SAL, "type": "integer", "cardinality": "one"},
        "tags": {"attribute": TAGS, "type": "string", "cardinality": "many"},
        "org": {"attribute": ORG, "type": "ref", "cardinality": "one", "target": "Org"}}},
    "Org": {"attributes": {"label": {"attribute": ":org/label", "type": "string", "cardinality": "one"}}}}}]


def marker(at):
    return {"_tag": "ErasedValue", "erasedAt": at}


def case(commands=(), queries=(), **extra):
    c = {"format": "triplex-db-2/o-replay-case/1", "caseId": "v-o04d/q52", "defaultScope": "s", "schemas": SCHEMA,
         "commands": list(commands), "queries": list(queries)}
    c.update(extra)
    return c


def cmd(ops, clock, cid=None, scope=None, **meta):
    c = {"clock": clock, "meta": {"commandId": cid or f"c{clock}", **meta}, "operations": ops}
    if scope:
        c["scope"] = scope
    return c


def asrt(ref, e, a, v, et="Person"):
    o = {"op": "assert", "ref": ref, "entityId": e, "attribute": a, "value": v, "validFrom": 0}
    if et:
        o["entityType"] = et
    return o


def erase(e=None, a=None, target=None):
    if target:
        return {"op": "erase", "target": target}
    return {"op": "erase", "entityId": e, **({"attribute": a} if a else {})}


def run(name, the_case):
    WORK.mkdir(parents=True, exist_ok=True)
    p, o = WORK / f"{name}.case.json", WORK / f"{name}.expected.json"
    p.write_text(json.dumps(the_case, indent=1) + "\n")
    if o.exists():
        o.unlink()
    proc = subprocess.run([sys.executable, "-I", str(CLI), str(p), "-o", str(o)], capture_output=True, text=True)
    if proc.returncode == 2:
        return {"refused": proc.stderr.strip(), "outputWritten": o.exists()}
    if proc.returncode not in (0, 1) or not o.exists():   # an uncaught exception also exits 1, with no output
        return {"crashed": proc.returncode, "stderr": proc.stderr[-600:]}
    return {"report": json.loads(o.read_text())}


def q(rep, qid):
    return next(x for x in rep["queries"] if x["id"] == qid)


def res(rep, qid):
    return q(rep, qid).get("result")


def outc(rep, i):
    return next(o for o in rep["commandOutcomes"] if o["command"] == i)["expected"]


def err_is(node, eid):
    row = ERR[eid]
    tag = node.get("_tag", node.get("errorTag")) if isinstance(node, dict) else None
    return isinstance(node, dict) and node.get("error") == eid and tag == row["tag"] and node.get("reason") in row["reason"].split("|")


def find_ids(rep, qid):
    r = res(rep, qid)
    return [i for p in r["pages"] for i in p["ids"]] if r else q(rep, qid).get("error")


def agg1(result, col):
    """The single ungrouped aggregate row's column as a comparable value (integer text or None)."""
    v = result["rows"][0][col]
    return None if v is None else v["value"]


def alternatives(rep, qid, col):
    """An in-flight entry as [(erasuresSeen, aggregate column)], or None when the entry is a plain answer."""
    node = q(rep, qid)
    if "inFlight" not in node:
        return None
    return [(alt["erasuresSeen"], agg1(alt["result"], col) if "result" in alt else alt.get("error", {}).get("error"))
            for alt in node["inFlight"]["acceptable"]]


ROWS = []


def score(ruling, pid, expected, verdict, got):
    ROWS.append({"ruling": ruling, "probe": pid, "expected": expected, "verdict": verdict, "oracle": got})


def case_name(pid):
    """A unique case file name per probe (sanitised pids can collide, e.g. json 2.675 and -2.675)."""
    return f"{len(ROWS):03d}_" + re.sub(r"[^A-Za-z0-9]+", "_", pid)


def single(ruling, pid, expected, the_case, fn):
    out = run(case_name(pid), the_case)
    if "report" not in out:
        score(ruling, pid, expected, "REFUSES" if "refused" in out else "CRASH", out)
        return
    try:
        ok, got = fn(out["report"])
    except Exception as error:  # a probe failure must be visible
        ok, got = False, f"probe error {error!r}"
    score(ruling, pid, expected, "MATCH" if ok else "WRONG-ANSWER", got)


def observe(ruling, pid, question, the_case, fn):
    out = run(case_name(pid), the_case)
    got = out.get("refused") or (fn(out["report"]) if "report" in out else out)
    score(ruling, pid, question, "OBSERVED", got)


def agg(qid, op, var_attr, extra=None, cut=V, **more):
    a = {"op": op, "var": "v", "as": "x"}
    a.update(extra or {})
    return {"id": qid, "kind": "aggregate", "cut": cut, "match": {"attributes": {"v": var_attr}}, "aggregates": [a], **more}


# ------------------------------------------------------------------ Q52a: COUNT over erased values
# salary: p1 111 and p4 222 erased (one commit, 200); readable 50 (p2), 30 (p3), 50 (p5). AG-COUNT counts distinct values,
# so the readable values count 2 and the marker group counts 1: 3. Assertions: 5. p6 tags: two erased, one readable.
A_CMDS = [cmd([asrt("a1", "p1", SAL, I(111)), asrt("a2", "p2", SAL, I(50)), asrt("a3", "p3", SAL, I(30)), asrt("a4", "p4", SAL, I(222)),
               asrt("a5", "p5", SAL, I(50)), asrt("t1", "p6", TAGS, S("SECRET-T1")), asrt("t2", "p6", TAGS, S("SECRET-T2")),
               asrt("t3", "p6", TAGS, S("pub"))], 100),
          cmd([erase("p1", SAL), erase("p4", SAL), erase(target="t1"), erase(target="t2")], 200)]
Q52A = case(A_CMDS, [agg("cnt", "count", SAL), agg("cntt", "count", TAGS),
                     {"id": "raw", "kind": "match", "cut": V, "pattern": {"attribute": SAL}},
                     {"id": "vs", "kind": "valueSupports", "cut": V, "pattern": {"entityId": "p6", "attribute": TAGS}}])
single("Q52a", "COUNT of distinct salary values, two erased", "3 (50, 30 and one marker group)", Q52A,
       lambda r: (agg1(res(r, "cnt"), "x") == "3", res(r, "cnt")["rows"]))
single("Q52a", "COUNT of distinct tags of p6, two erased", "2 (pub and one marker group)", Q52A,
       lambda r: (agg1(res(r, "cntt"), "x") == "2", res(r, "cntt")["rows"]))
single("Q52a", "count of assertions: raw match count", "5 (each erased assertion counts)", Q52A,
       lambda r: (res(r, "raw")["count"] == 5, res(r, "raw")["count"]))
single("Q52a", "count of assertions: valueSupports marker group", "the marker group of p6 tags has count 2, ids [t1, t2]", Q52A,
       lambda r: ([(x["value"], x["count"], sorted(x["assertionIds"])) for x in res(r, "vs")["supports"]]
                  == [(S("pub"), 1, ["t3"]), (marker(200), 2, ["t1", "t2"])], res(r, "vs")["supports"]))

# ------------------------------------------------------------------ Q52b: ORDER BY readable, markers by id, missing
# p2 50, p3 30 readable; p1 (id sal1) and p6 (id a-sal6) erased; p4, p5, p7 have no salary. Markers by assertion id:
# a-sal6 < sal1, so p6 before p1; missing tie-break by entity id (R-ORD-3 / AMB-15), in both directions.
B_CMDS = [cmd([asrt(f"n{k}", f"p{k}", NAME, S(f"N{k}")) for k in (1, 2, 3, 4, 5, 6, 7)]
              + [asrt("sal1", "p1", SAL, I(111)), asrt("sal2", "p2", SAL, I(50)), asrt("sal3", "p3", SAL, I(30)),
                 asrt("a-sal6", "p6", SAL, I(444))], 100),
          cmd([erase("p1", SAL), erase("p6", SAL)], 200)]
Q52B = case(B_CMDS, [{"id": "asc", "kind": "find", "entityType": "Person", "cut": V, "orderBy": [{"prop": "salary", "direction": "asc"}]},
                     {"id": "desc", "kind": "find", "entityType": "Person", "cut": V, "orderBy": [{"prop": "salary", "direction": "desc"}]}])
single("Q52b", "ORDER BY salary asc over readable, erased and missing", "[p3, p2, p6, p1, p4, p5, p7]", Q52B,
       lambda r: (find_ids(r, "asc") == ["p3", "p2", "p6", "p1", "p4", "p5", "p7"], find_ids(r, "asc")))
single("Q52b", "ORDER BY salary desc over readable, erased and missing", "[p2, p3, p6, p1, p4, p5, p7]", Q52B,
       lambda r: (find_ids(r, "desc") == ["p2", "p3", "p6", "p1", "p4", "p5", "p7"], find_ids(r, "desc")))

# ------------------------------------------------------------------ Q52c: earliest erasedAt of a marker group
C_CMDS = [cmd([asrt("d1", "p1", SSN, S("SECRET-D1")), asrt("d4", "p1", NAME, S("Al"))], 100),
          cmd([asrt("d2", "p2", SSN, S("SECRET-D2")), asrt("d3", "p2", NAME, S("Bo"))], 110),
          cmd([erase("p1", SSN)], 200), cmd([erase("p2", SSN)], 300)]
Q52C = case(C_CMDS + [cmd([asrt("k1", "p3", TAGS, S("SECRET-K1")), asrt("k2", "p3", TAGS, S("SECRET-K2")), asrt("k3", "p3", TAGS, S("pub"))], 400),
                      cmd([erase(target="k2")], 500), cmd([erase(target="k1")], 600)],
            [{"id": "grp", "kind": "aggregate", "cut": V, "match": {"attributes": {"n": NAME, "s": SSN}}, "groupBy": ["s"],
              "aggregates": [{"op": "count", "var": "n", "as": "c"}]},
             {"id": "g3", "kind": "get", "entityType": "Person", "entityId": "p3", "cut": V},
             {"id": "vs", "kind": "valueSupports", "cut": V, "pattern": {"attribute": SSN}}])
single("Q52c", "GROUP BY ssn over markers erased at 200 and 300", "one row: s = marker(200), c = 2", Q52C,
       lambda r: (res(r, "grp")["rows"] == [{"s": marker(200), "c": I(2)}], res(r, "grp")["rows"]))
single("Q52c", "card-many marker group erased at 500 and 600", "[pub, marker(500)], the marker's supports {k1, k2}", Q52C,
       lambda r: ([v["value"] for v in res(r, "g3")["properties"]["tags"]["values"]] == [S("pub"), marker(500)]
                  and sorted(res(r, "g3")["properties"]["tags"]["values"][1]["supports"]) == ["k1", "k2"],
                  res(r, "g3")["properties"]["tags"]["values"]))

# ------------------------------------------------------------------ Q52d: ReferenceTarget skips an erased reference
# p1's org points at ghost:1 (no such Org). The ref is asserted without an entity type, so p1 becomes a Person (and the
# ReferenceTarget rule applies to it) only in the enforced command: enforcement rejects new violations only.
REQ = {"commandId": "rt", "enforce": {"fromSchema": 1}}


def rt_case(pre):
    return case(pre + [{"clock": 300, "meta": REQ, "operations": [asrt("n1", "p1", NAME, S("Ann"))]}], [])


Q52D = rt_case([cmd([asrt("r1", "p1", ORG, R("ghost:1"), None)], 100), cmd([erase("p1", ORG)], 200)])
single("Q52d", "ReferenceTarget over an erased dangling reference", "the enforced command commits (the erased reference is skipped)", Q52D,
       lambda r: (outc(r, 2)["outcome"] == "committed", outc(r, 2)))
single("Q52d", "control: the same reference readable", "rejected E-CONSTRAINT (reference-target)",
       rt_case([cmd([asrt("r1", "p1", ORG, R("ghost:1"), None)], 100)]),
       lambda r: (err_is(outc(r, 1), "E-CONSTRAINT") and outc(r, 1).get("codes") == ["reference-target"], outc(r, 1)))

# ------------------------------------------------------------------ Q52e: one commit erasing several values, all or none
E_BASE = [cmd([asrt("e1", "p1", SAL, I(1)), asrt("e2", "p2", SAL, I(2)), asrt("e3", "p3", SAL, I(4))], 100)]
Q52E = case(E_BASE + [cmd([erase("p1", SAL), erase("p2", SAL)], 200)],
            [agg("sum", "sum", SAL, readStart={"afterCommand": 0}),
             {"id": "m", "kind": "match", "cut": V, "pattern": {"attribute": SAL}, "readStart": {"afterCommand": 0}},
             {"id": "g3", "kind": "get", "entityType": "Person", "entityId": "p3", "cut": V, "readStart": {"afterCommand": 0}}])
single("Q52e", "SUM in flight across one commit erasing two values", "exactly [([], 7), ([tx:1], 4)]: never 5 or 6", Q52E,
       lambda r: (alternatives(r, "sum", "x") == [([], "7"), (["tx:1"], "4")], alternatives(r, "sum", "x")))
single("Q52e", "match in flight across that commit", "two whole answers: all three readable; then p1 and p2 both markers",
       Q52E, lambda r: ([[x["value"] for x in alt["result"]["raw"]] for alt in q(r, "m")["inFlight"]["acceptable"]]
                        == [[I(1), I(2), I(4)], [marker(200), marker(200), I(4)]],
                        [[x["value"] for x in alt["result"]["raw"]] for alt in q(r, "m")["inFlight"]["acceptable"]]))
single("Q52e", "a read that does not depend on the in-flight commit", "plain result (no inFlight): p3 salary 4", Q52E,
       lambda r: ("inFlight" not in q(r, "g3") and res(r, "g3")["properties"]["salary"]["value"] == I(4), q(r, "g3")))

# ------------------------------------------------------------------ Q66a: several in-flight commits, prefixes only
# p1 1, p2 2, p3 4 (powers of two, so every subset has its own SUM); erase p1 (tx:1), p2 (tx:2), p3 (tx:3).
ERASES = [cmd([erase("p1", SAL)], 200), cmd([erase("p2", SAL)], 210), cmd([erase("p3", SAL)], 220)]
SUMS = {(): "7", ("tx:1",): "6", ("tx:1", "tx:2"): "4", ("tx:1", "tx:2", "tx:3"): None}


def prefix_case(n, after=0):
    return case(E_BASE + ERASES[:n], [agg("sum", "sum", SAL, readStart={"afterCommand": after})])


Q66 = {n: prefix_case(n) for n in (1, 2, 3)}
for n in (1, 2, 3):
    txs = [f"tx:{k}" for k in range(1, n + 1)]
    want = [(txs[:k], SUMS[tuple(txs[:k])]) for k in range(n + 1)]
    single("Q66a" if n > 1 else "Q52e", f"{n} in-flight erasure commit{'s' if n > 1 else ''}: acceptable answers",
           f"exactly the {n + 1} prefixes in position order: {want}", Q66[n],
           lambda r, want=want: (alternatives(r, "sum", "x") == want, alternatives(r, "sum", "x")))
single("Q66a", "3 commits, read started after the first", "prefixes of [tx:2, tx:3]: [([], 6), ([tx:2], 4), ([tx:2, tx:3], None)]",
       prefix_case(3, after=1), lambda r: (alternatives(r, "sum", "x") == [([], "6"), (["tx:2"], "4"), (["tx:2", "tx:3"], None)],
                                           alternatives(r, "sum", "x")))

# ------------------------------------------------------------------ Q66c: only the read's own scope is in flight
SC = case([cmd([asrt("e1", "p1", SAL, I(1))], 100), cmd([asrt("f1", "q1", SAL, I(2))], 110, scope="t"),
           cmd([erase("q1", SAL)], 200, scope="t"), cmd([erase("p1", SAL)], 210)],
          [agg("s", "sum", SAL, readStart={"afterCommand": 1}), agg("t", "sum", SAL, cut={"scope": "t", "validAt": 1}, readStart={"afterCommand": 1})])
single("Q66c", "scope s read: only scope s's erasure is in flight", "[([], 1), ([tx:3], None)]", SC,
       lambda r: (alternatives(r, "s", "x") == [([], "1"), (["tx:3"], None)], alternatives(r, "s", "x")))
single("Q66c", "scope t read: only scope t's erasure is in flight", "[([], 2), ([tx:2], None)]", SC,
       lambda r: (alternatives(r, "t", "x") == [([], "2"), (["tx:2"], None)], alternatives(r, "t", "x")))

# ------------------------------------------------------------------ Q66b: continuations of an in-flight read
# Q66b: "a continuation cursor carries the erasure prefix its page was computed with, and every later page answers with
# that same prefix". entityPage returns every page of the traversal; cursorFrom {query, page 0} continues after page 0.
# A page is summarised as [(entityId, salary text or "M" for the marker)] over all its remaining pages; an entry as
# [(erasuresSeen, summary)] for inFlight, or [("plain", summary)].
def ep(qid, limit=1, **kw):
    return {"id": qid, "kind": "entityPage", "entityType": "Person", "limit": limit, "cut": V, **kw}


def summary(result):
    return [(e["entityId"], [t["value"]["value"] if "value" in t["value"] else "M" for t in e["triples"] if t["attribute"] == SAL])
            for p in result["pages"] for e in p["entities"]]


def entry(rep, qid):
    node = q(rep, qid)
    if "inFlight" in node:
        return [(a["erasuresSeen"], summary(a["result"]) if "result" in a else a.get("error", {}).get("error"))
                for a in node["inFlight"]["acceptable"]]
    return [("plain", summary(node["result"]) if "result" in node else node.get("error"))]


P4 = [cmd([asrt(f"s{k}", f"p{k}", SAL, I(k)) for k in (1, 2, 3, 4)], 100)]
row = lambda e, v: (e, [v])  # noqa: E731
Q66B_ONE = case(E_BASE + [cmd([erase("p1", SAL)], 200)], [ep("a", readStart={"afterCommand": 0}), ep("b", cursorFrom={"query": "a"})])
single("Q66b", "continuation of an in-flight read (page 2 not affected)", "plain: [p2 2, p3 4] (both prefixes agree)", Q66B_ONE,
       lambda r: (entry(r, "b") == [("plain", [row("p2", "2"), row("p3", "4")])], entry(r, "b")))
Q66B_TWO = case(P4 + [cmd([erase("p2", SAL), erase("p4", SAL)], 200)],
                [ep("a", 2, readStart={"afterCommand": 0}), ep("b", 2, cursorFrom={"query": "a"})])
single("Q66b", "two-page continuation, one commit erasing p2 and p4", "[([], p3 3, p4 4), ([tx:1], p3 3, p4 M)]", Q66B_TWO,
       lambda r: (entry(r, "b") == [([], [row("p3", "3"), row("p4", "4")]), (["tx:1"], [row("p3", "3"), row("p4", "M")])], entry(r, "b")))
Q66B_TWO2 = case(P4 + [cmd([erase("p2", SAL)], 200), cmd([erase("p4", SAL)], 210)],
                 [ep("a", 2, readStart={"afterCommand": 0}), ep("b", 2, cursorFrom={"query": "a"})])
single("Q66b", "two-page continuation, tx:1 erases p2 (page 1), tx:2 erases p4 (page 2)",
       "page 2 per prefix: [([], p4 4), ([tx:1], p4 4), ([tx:1, tx:2], p4 M)]", Q66B_TWO2,
       lambda r: (entry(r, "b") == [([], [row("p3", "3"), row("p4", "4")]), (["tx:1"], [row("p3", "3"), row("p4", "4")]),
                                    (["tx:1", "tx:2"], [row("p3", "3"), row("p4", "M")])], entry(r, "b")))
Q66B_CHAIN = case(P4 + [cmd([erase("p1", SAL)], 200), cmd([erase("p3", SAL)], 210)],
                  [ep("a", readStart={"afterCommand": 0}), ep("b", cursorFrom={"query": "a"}), ep("c", cursorFrom={"query": "b"}),
                   ep("d", cursorFrom={"query": "c"})])
single("Q66b", "chained continuation: page 3 (c continues b continues a)", "[([], p3 3, p4 4), ([tx:1], p3 3, p4 4), ([tx:1, tx:2], p3 M, p4 4)]",
       Q66B_CHAIN, lambda r: (entry(r, "c") == [([], [row("p3", "3"), row("p4", "4")]), (["tx:1"], [row("p3", "3"), row("p4", "4")]),
                                                (["tx:1", "tx:2"], [row("p3", "M"), row("p4", "4")])], entry(r, "c")))
single("Q66b", "chained continuation: page 4 (d continues c), unaffected", "plain: [p4 4]", Q66B_CHAIN,
       lambda r: (entry(r, "d") == [("plain", [row("p4", "4")])], entry(r, "d")))
single("Q66b", "chained continuation: page 2 (b), every prefix lists p3 as of that prefix", "[([], p2 2, p3 3, p4 4), ([tx:1], same), ([tx:1, tx:2], p3 M)]",
       Q66B_CHAIN, lambda r: (entry(r, "b") == [([], [row("p2", "2"), row("p3", "3"), row("p4", "4")]),
                                                (["tx:1"], [row("p2", "2"), row("p3", "3"), row("p4", "4")]),
                                                (["tx:1", "tx:2"], [row("p2", "2"), row("p3", "M"), row("p4", "4")])], entry(r, "b")))
# author's choice 1: the continuation's own readStart is not consulted (the cursor's prefix wins)
Q66B_OWN = case(P4 + [cmd([erase("p1", SAL)], 200), cmd([erase("p2", SAL)], 210)],
                [ep("a", readStart={"afterCommand": 0}), ep("b", cursorFrom={"query": "a"}, readStart={"afterCommand": 2})])
single("Q66b", "continuation with its own later readStart, source in flight", "per the source's prefixes: [([], p2 2), ([tx:1], p2 2), ([tx:1, tx:2], p2 M)]",
       Q66B_OWN, lambda r: ([(s, x[0]) for s, x in entry(r, "b")] == [([], row("p2", "2")), (["tx:1"], row("p2", "2")), (["tx:1", "tx:2"], row("p2", "M"))],
                            entry(r, "b")))
# the same choice when the source read had nothing in flight: page 1 was computed with every erasure seen, so page 2 must
# be too (Q66b); a continuation whose own readStart precedes the erasure must not reopen the old value
Q66B_PLAIN_SRC = case(P4 + [cmd([erase("p2", SAL)], 200)], [ep("a"), ep("b", cursorFrom={"query": "a"}, readStart={"afterCommand": 0})])
single("Q66b", "continuation of a read with nothing in flight, own readStart before the erasure", "plain: [p2 M, p3 3, p4 4] (page 1's view)",
       Q66B_PLAIN_SRC, lambda r: (entry(r, "b") == [("plain", [row("p2", "M"), row("p3", "3"), row("p4", "4")])], entry(r, "b")))
# author's choice 2: a literal `cursor` token. The token is taken from the in-flight page a (it is the same in every
# alternative), then continued without and with its own readStart.
LIT_CMDS = P4 + [cmd([erase("p1", SAL), erase("p2", SAL)], 200)]
LIT_SRC = case(LIT_CMDS, [ep("a", readStart={"afterCommand": 0})])
_src = run("lit_source", LIT_SRC).get("report")
LIT_TOKENS = sorted({alt["result"]["pages"][0]["nextCursor"] for alt in q(_src, "a")["inFlight"]["acceptable"]}) if _src else []
score("Q66b", "literal token: page a's nextCursor is the same in every alternative", "recorded (a token cannot tell the prefixes apart)",
      "OBSERVED", {"distinctTokens": len(LIT_TOKENS)})
if len(LIT_TOKENS) == 1:
    Q66B_LIT = case(LIT_CMDS, [ep("a", readStart={"afterCommand": 0}), ep("b", cursor=LIT_TOKENS[0])])
    single("Q66b", "literal token from an in-flight page, no readStart", "per page a's prefixes: [([], p2 2, ...), ([tx:1], p2 M, ...)]",
           Q66B_LIT, lambda r: (entry(r, "b") == [([], [row("p2", "2"), row("p3", "3"), row("p4", "4")]),
                                                  (["tx:1"], [row("p2", "M"), row("p3", "3"), row("p4", "4")])], entry(r, "b")))
    # V-O04f: Q70b decides this row (the token continues the in-flight read that issued it), so it is checked now
    LIT_ALTS = [([], [row("p2", "2"), row("p3", "3"), row("p4", "4")]), (["tx:1"], [row("p2", "M"), row("p3", "3"), row("p4", "4")])]
    single("Q70b", "literal token from an in-flight page, own readStart before the erasure", "per page a's prefixes (own readStart not consulted)",
           case(LIT_CMDS, [ep("a", readStart={"afterCommand": 0}), ep("b", cursor=LIT_TOKENS[0], readStart={"afterCommand": 0})]),
           lambda r: (entry(r, "b") == LIT_ALTS, entry(r, "b")))
    Q70B_LATER = case(LIT_CMDS, [ep("a", readStart={"afterCommand": 0}), ep("b", cursor=LIT_TOKENS[0], readStart={"afterCommand": 1})])
    single("Q70b", "literal token from an in-flight page, own readStart after the erasure", "per page a's prefixes, not plain markers",
           Q70B_LATER, lambda r: (entry(r, "b") == LIT_ALTS, entry(r, "b")))

# ------------------------------------------------------------------ V-O04f: Q70a-e (main lab/acceptance/RULINGS-PENDING.md)
# A = in-flight read (readStart before the one commit erasing p1 and p2), B = plain read (no readStart: after every
# erasure). Both read the same cut, so their page-0 nextCursor tokens are byte-identical (checked in each row).
PLAIN_TAIL = [row("p2", "M"), row("p3", "3"), row("p4", "4")]


def tokens_equal(r, *qids):
    toks = set()
    for qid in qids:
        node = q(r, qid)
        alts = [a["result"] for a in node["inFlight"]["acceptable"]] if "inFlight" in node else [node["result"]]
        toks |= {res["pages"][0]["nextCursor"] for res in alts}
    return len(toks) == 1


if LIT_TOKENS:
    T = LIT_TOKENS[0]
    Q70C = case(LIT_CMDS, [ep("B"), ep("x", cursor=T, readStart={"afterCommand": 0})])
    single("Q70c", "literal token from a plain read, used with an earlier readStart", "continues B: plain [p2 M, p3 3, p4 4]", Q70C,
           lambda r: (entry(r, "x") == [("plain", PLAIN_TAIL)], entry(r, "x")))
    # V-O04g: A and B issue the same token with different views (start, prefixes), so Q70f fails the continuation closed
    # whichever was issued last (the two Q70d rows written for 0.4.5 now expect the typed refusal)
    def ambiguous(r, qid, what):
        node = q(r, qid)
        err = node.get("error") or {}
        return err.get("error") == "X-NOT-MODELED" and f"ambiguous {what}" in (err.get("message") or "") and "inFlight" not in node

    Q70D_A_LAST = case(LIT_CMDS, [ep("B"), ep("A", readStart={"afterCommand": 0}), ep("x", cursor=T)])
    single("Q70f", "equal tokens, plain B then in-flight A (A issued last)", "typed X-NOT-MODELED 'ambiguous literal token'", Q70D_A_LAST,
           lambda r: (tokens_equal(r, "A", "B") and ambiguous(r, "x", "literal token"), q(r, "x")))
    Q70D_B_LAST = case(LIT_CMDS, [ep("A", readStart={"afterCommand": 0}), ep("B"), ep("x", cursor=T)])
    single("Q70f", "equal tokens, in-flight A then plain B (B issued last)", "typed X-NOT-MODELED 'ambiguous literal token'", Q70D_B_LAST,
           lambda r: (tokens_equal(r, "A", "B") and ambiguous(r, "x", "literal token"), q(r, "x")))
    # V-O04f F9 as a checked row: A's all-old page 1 is unchanged and x gives no answer that half-applies tx:1
    single("Q70f", "page sequence A (all-old prefix) -> literal token also issued later by plain B (V-O04f F9)",
           "A[] page 1 is p1 1 and x is refused (no forced mixed answer)", Q70D_B_LAST,
           lambda r: (entry(r, "A")[0] == ([], [row("p1", "1"), row("p2", "2"), row("p3", "3"), row("p4", "4")])
                      and ambiguous(r, "x", "literal token"), {"A": entry(r, "A")[0], "x": q(r, "x")}))
# Q70h: identical views (same start, scope, issuing prefixes) and different page bodies continue rather than refuse.
# A (limit 1) and B (limit 2) read with the same readStart; A's page 1 and B's page 0 both issue the token "after p2".
H_CMDS = P4 + [cmd([erase("p1", SAL), erase("p3", SAL)], 200)]
_h = run("q70h_source", case(H_CMDS, [ep("A", 1, readStart={"afterCommand": 0}), ep("B", 2, readStart={"afterCommand": 0})])).get("report")
H_TOKEN = None
if _h:
    _ta = {alt["result"]["pages"][1]["nextCursor"] for alt in q(_h, "A")["inFlight"]["acceptable"]}
    _tb = {alt["result"]["pages"][0]["nextCursor"] for alt in q(_h, "B")["inFlight"]["acceptable"]}
    H_TOKEN = next(iter(_ta)) if len(_ta) == 1 and _ta == _tb else None
score("Q70h", "A (limit 1) page 1 and B (limit 2) page 0 issue one token", "recorded precondition", "OBSERVED", {"sharedToken": H_TOKEN is not None})
if H_TOKEN:
    Q70H = case(H_CMDS, [ep("A", 1, readStart={"afterCommand": 0}), ep("B", 2, readStart={"afterCommand": 0}), ep("x", 1, cursor=H_TOKEN)])
    single("Q70h", "identical views, different limits reaching the same token", "continues: [([], p3 3, p4 4), ([tx:1], p3 M, p4 4)]", Q70H,
           lambda r: (entry(r, "x") == [([], [row("p3", "3"), row("p4", "4")]), (["tx:1"], [row("p3", "M"), row("p4", "4")])], entry(r, "x")))
# Q70a: cursorFrom from a later page of the source, per prefix
CM2 = P4 + [cmd([erase("p1", SAL)], 200), cmd([erase("p2", SAL)], 210)]
Q70A_PAGE1 = case(CM2, [ep("A", readStart={"afterCommand": 0}), ep("x", cursorFrom={"query": "A", "page": 1})])
single("Q70a", "cursorFrom page 1 of an in-flight read (pages 3-4 unaffected)", "plain [p3 3, p4 4] (every prefix agrees)", Q70A_PAGE1,
       lambda r: (entry(r, "x") == [("plain", [row("p3", "3"), row("p4", "4")])], entry(r, "x")))
# ------------------------------------------------------------------ Q70g, Q70i: journal pagination
def ambiguous_any(r, qid, what):
    err = q(r, qid).get("error") or {}
    return err.get("error") == "X-NOT-MODELED" and f"ambiguous {what}" in (err.get("message") or "")

TXP = [cmd([asrt("s1", "p1", SAL, I(1))], 100), cmd([asrt("s2", "p2", SAL, I(2))], 110), cmd([erase("p1", SAL), erase("p2", SAL)], 200)]


def tx_entry(r, qid):
    node = q(r, qid)
    if "error" in node:
        return [("error", node["error"].get("error"))]
    alts = [(a["erasuresSeen"], a["result"]) for a in node["inFlight"]["acceptable"]] if "inFlight" in node else [("plain", node["result"])]
    return [(s, [(t["txId"], [c.get("value") for c in t["changes"]]) for t in res["transactions"]], res.get("next")) for s, res in alts]


TQ = lambda qid, after, **kw: {"id": qid, "kind": "transactions", "after": after, "limit": 1, **kw}  # noqa: E731
Q70G = case(TXP, [TQ("t1", 0, readStart={"afterCommand": 1}), TQ("t2", 1)])
single("Q70g", "transactions page 2 by after = page 1's next, page 1 in flight (V-O04f F10)",
       "per page 1's prefixes: [([], tx:1 2), ([tx:2], tx:1 M)], next 2", Q70G,
       lambda r: (tx_entry(r, "t2") == [([], [("tx:1", [I(2)])], 2), (["tx:2"], [("tx:1", [marker(200)])], 2)], tx_entry(r, "t2")))
Q70G_OWN = case(TXP, [TQ("t1", 0), TQ("t2", 1, readStart={"afterCommand": 1})])
single("Q70g", "journal continuation of a plain page, own readStart before the erasure", "continues page 1's view: plain [tx:1 M]", Q70G_OWN,
       lambda r: (tx_entry(r, "t2") == [("plain", [("tx:1", [marker(200)])], 2)], tx_entry(r, "t2")))
Q70I = case(TXP, [TQ("t1", 0, readStart={"afterCommand": 1}), TQ("t1b", 0), TQ("t2", 1)])
single("Q70i", "journal after issued by disagreeing pages", "typed X-NOT-MODELED 'ambiguous journal after'", Q70I,
       lambda r: (ambiguous_any(r, "t2", "journal after"), q(r, "t2")))
# Q70i: matching needs the same journal scope. Scope t's page issues next 1; a scope s call with after 1 reads its own view.
JS = [cmd([asrt("s1", "p1", SAL, I(1))], 100), cmd([asrt("f1", "q1", SAL, I(5))], 110, scope="t"), cmd([asrt("f2", "q2", SAL, I(6))], 120, scope="t"),
      cmd([asrt("s2", "p2", SAL, I(2))], 130), cmd([erase("p1", SAL), erase("p2", SAL)], 200)]
Q70I_SCOPE = case(JS, [TQ("tt", 0, scope="t"), TQ("ts", 1, readStart={"afterCommand": 3})])
single("Q70i", "after equal to another journal scope's next", "own view of scope s: [([], tx:3 2), ([tx:4], tx:3 M)]", Q70I_SCOPE,
       lambda r: (tx_entry(r, "ts") == [([], [("tx:3", [I(2)])], 2), (["tx:4"], [("tx:3", [marker(200)])], 2)], tx_entry(r, "ts")))
# ------------------------------------------------------------------ Q70j, Q70k: a read's in-flight scope is the scope it reads
# s: p1 1 (tx:0), erase p1 (tx:2); t: q1 5 (tx:1), erase q1 (tx:3). readStart afterCommand 1 resolves in the read's scope.
SCP = [cmd([asrt("s1", "p1", SAL, I(1))], 100), cmd([asrt("f1", "q1", SAL, I(5))], 110, scope="t"), cmd([erase("p1", SAL)], 200),
       cmd([erase("q1", SAL)], 210, scope="t")]
RS1 = {"afterCommand": 1}
Q70J = case(SCP, [{"id": "tx", "kind": "transactions", "scope": "t", "after": 0, "limit": 10, "readStart": RS1},
                  {"id": "as", "kind": "assertions", "scope": "t", "readStart": RS1},
                  {"id": "hi", "kind": "history", "entityId": "q1", "scope": "t", "readStart": RS1},
                  {"id": "fe", "kind": "transactionsForEntity", "entityId": "q1", "scope": "t", "limit": 10, "readStart": RS1},
                  {"id": "t1", "kind": "transaction", "txId": "tx:1", "scope": "t", "readStart": RS1},
                  {"id": "m", "kind": "match", "cut": {"scope": "t", "validAt": 1}, "pattern": {"entityId": "q1"}, "readStart": RS1}])


def seen_and(r, qid, value_of):
    node = q(r, qid)
    alts = [(a["erasuresSeen"], a["result"]) for a in node["inFlight"]["acceptable"]] if "inFlight" in node else [("plain", node.get("result"))]
    return [(s, value_of(res)) for s, res in alts]


Q1_ALTS = [([], I(5)), (["tx:3"], marker(210))]
single("Q70j", "transactions on scope t: only t's erasure in flight", "[([], q1 5), ([tx:3], marker)] for tx:1's change", Q70J,
       lambda r: (seen_and(r, "tx", lambda res: res["transactions"][0]["changes"][0]["value"]) == Q1_ALTS, seen_and(r, "tx", lambda res: res)))
single("Q70k", "assertions on scope t", "[([], q1 5), ([tx:3], marker)]", Q70J,
       lambda r: (seen_and(r, "as", lambda res: res["assertions"][0]["value"]) == Q1_ALTS, seen_and(r, "as", lambda res: res)))
single("Q70k", "history (no cut) on scope t", "[([], q1 5), ([tx:3], marker)]", Q70J,
       lambda r: (seen_and(r, "hi", lambda res: res["rawLifetime"][0]["value"]) == Q1_ALTS, seen_and(r, "hi", lambda res: res)))
single("Q70k", "transactionsForEntity on scope t", "[([], q1 5), ([tx:3], marker)] for tx:1's change", Q70J,
       lambda r: (seen_and(r, "fe", lambda res: [t for t in res["transactions"] if t["txId"] == "tx:1"][0]["changes"][0]["value"]) == Q1_ALTS,
                  seen_and(r, "fe", lambda res: res)))
single("Q70k", "transaction tx:1 on scope t", "[([], q1 5), ([tx:3], marker)]", Q70J,
       lambda r: (seen_and(r, "t1", lambda res: res["changes"][0]["value"]) == Q1_ALTS, seen_and(r, "t1", lambda res: res)))
single("Q70k", "control: match with cut scope t (a cut-scoped kind)", "[([], q1 5), ([tx:3], marker)]", Q70J,
       lambda r: (seen_and(r, "m", lambda res: res["raw"][0]["value"]) == Q1_ALTS, seen_and(r, "m", lambda res: res)))
# ------------------------------------------------------------------ V-O04h: Q70l (one continuation table), Q70m (typed values)
# V-O04g F11 as a checked row: transactionsForEntity continues by beforePosition = an earlier page's nextBeforePosition on
# the same entity, scope and snapshotPosition (Q70l). p1: salary 1 (tx:0, pos 1), name N (tx:1, pos 2); tx:2 erases p1.
FE = [cmd([asrt("s1", "p1", SAL, I(1))], 100), cmd([asrt("n1", "p1", NAME, S("N"))], 110), cmd([erase("p1")], 200)]
FQ = lambda qid, **kw: {"id": qid, "kind": "transactionsForEntity", "entityId": "p1", "limit": 1, **kw}  # noqa: E731
Q70L_FE = case(FE, [FQ("e1", snapshotPosition=2, readStart={"afterCommand": 1}), FQ("e2", snapshotPosition=2, beforePosition=2)])
FE_ALTS = [([], [("tx:0", [I(1)])], None), (["tx:2"], [("tx:0", [marker(200)])], None)]
single("Q70l", "transactionsForEntity page 2 by beforePosition = page 1's nextBeforePosition (V-O04g F11)",
       "per page 1's prefixes: [([], tx:0 1), ([tx:2], tx:0 M)]", Q70L_FE, lambda r: (tx_entry(r, "e2") == FE_ALTS, tx_entry(r, "e2")))
Q70L_FE_AMB = case(FE, [FQ("e1", snapshotPosition=2, readStart={"afterCommand": 1}), FQ("e1b", snapshotPosition=2),
                        FQ("e2", snapshotPosition=2, beforePosition=2)])
single("Q70l", "transactionsForEntity beforePosition issued by disagreeing pages", "typed X-NOT-MODELED 'ambiguous ...'", Q70L_FE_AMB,
       lambda r: (ambiguous_any(r, "e2", ""), q(r, "e2")))
Q70L_FE_SNAP = case(FE, [FQ("e1", snapshotPosition=2, readStart={"afterCommand": 1}), FQ("e2", snapshotPosition=3, beforePosition=2)])
single("Q70l", "transactionsForEntity with a different snapshotPosition", "not matched: own view, plain [tx:0 M]", Q70L_FE_SNAP,
       lambda r: (tx_entry(r, "e2") == [("plain", [("tx:0", [marker(200)])], None)], tx_entry(r, "e2")))
# p9 shares tx:0 with p1 and is erased by the same commit, so continuing p1's in-flight read would list alternatives
FE9 = [cmd([asrt("s1", "p1", SAL, I(1)), asrt("s9", "p9", SAL, I(9))], 100), cmd([asrt("n1", "p1", NAME, S("N"))], 110),
       cmd([erase("p1"), erase("p9")], 200)]
Q70L_FE_OTHER = case(FE9, [FQ("e1", snapshotPosition=2, readStart={"afterCommand": 1}),
                           {"id": "e2", "kind": "transactionsForEntity", "entityId": "p9", "limit": 1, "snapshotPosition": 2, "beforePosition": 2}])
single("Q70l", "transactionsForEntity on another entity with the same beforePosition", "not matched: own view, plain [tx:0 M, M]",
       Q70L_FE_OTHER, lambda r: (tx_entry(r, "e2") == [("plain", [("tx:0", [marker(200), marker(200)])], None)], tx_entry(r, "e2")))
# Q70m: integer continuation values must be JSON integers >= 0; anything else makes the case malformed (exit 2)


def malformed(ruling, pid, the_case):
    out = run(case_name(pid), the_case)
    ok = "refused" in out and not out.get("outputWritten") and "malformed case" in out["refused"]
    score(ruling, pid, "malformed case (exit 2, no output)", "MATCH" if ok else "WRONG-ANSWER", out.get("refused") or out)


for label, value in (('"1"', "1"), ("1.0", 1.0), ("-1", -1), ("true", True)):
    malformed("Q70m", f"transactions after {label}", case(TXP, [TQ("t1", 0, readStart={"afterCommand": 1}), TQ("t2", value)]))
for label, value in (('"2"', "2"), ("2.0", 2.0), ("-2", -2)):
    malformed("Q70m", f"transactionsForEntity beforePosition {label}",
              case(FE, [FQ("e1", snapshotPosition=2, readStart={"afterCommand": 1}), FQ("e2", snapshotPosition=2, beforePosition=value)]))
malformed("Q70m", 'transactionsForEntity snapshotPosition "2"', case(FE, [FQ("e1", snapshotPosition="2")]))
# Q70l: only the kinds in the table continue. A non-paged kind with cursorFrom is a read of its own (the author's 0.4.8
# rule; 0.4.7 gave it the named read's view): match with cursorFrom naming the in-flight read A, no readStart -> markers only
Q70L_NONPAGED = case(LIT_CMDS, [ep("A", readStart={"afterCommand": 0}),
                                {"id": "m", "kind": "match", "cut": V, "pattern": {"attribute": SAL}, "cursorFrom": {"query": "A"}}])
single("Q70l", "cursorFrom on a non-paged kind (match) naming an in-flight read", "own view: plain, p1 and p2 markers", Q70L_NONPAGED,
       lambda r: ("inFlight" not in q(r, "m") and [x["value"] for x in res(r, "m")["raw"]][:2] == [marker(200), marker(200)],
                  q(r, "m").get("inFlight") and "inFlight" or [x["value"] for x in res(r, "m")["raw"]]))

# ------------------------------------------------------------------ Q52f: toDecimal(json, p, s, rounding)
DEC = [  # (json, p, s, mode, expected decimal text or error id): the as-written reading rounded once (Q52f, Q22, Q43d)
    (2.675, 3, 2, "half-up", "2.68"),      # binary64 2.67499999... would give 2.67
    (2.665, 3, 2, "half-even", "2.66"),    # binary64 2.66500000...04 would give 2.67
    (2.675, 3, 2, "half-even", "2.68"),    # tie to the even digit 8
    (2.669, 3, 2, "down", "2.66"),
    (-2.675, 3, 2, "half-up", "-2.68"),    # half-up ties away from zero, negatives included (Q43d)
    (-2.669, 3, 2, "down", "-2.66"),       # down is toward zero
    (0.15, 2, 1, "half-even", "0.2"),      # binary64 0.1499999... would give 0.1
    (1.5, 2, 1, "half-up", "1.5"),         # nothing to round
    (9.995, 3, 2, "half-up", "E-DECIMAL-OVERFLOW"),   # 10.00 needs two integer digits, p - s = 1
    (2.675, 3, 2, None, "E-DECIMAL-FRACTION"),        # no mode: excess digits are an error (Q49e, Q52f)
    ("2.675", 3, 2, "half-up", "E-INVALID-VALUE"),    # decimal text in a JSON string (Q49e)
]
for js, p, s, mode, want in DEC:
    expr = ["toDecimal", J(js), p, s] + ([mode] if mode else [])
    if want.startswith("E-"):
        single("Q52f", f"toDecimal(json {js!r}, {p}, {s}, {mode})", want, case(queries=[{"id": "q", "kind": "expr", "expr": expr}]),
               lambda r, want=want: (err_is(q(r, "q").get("error"), want), q(r, "q").get("error") or res(r, "q")))
    else:
        single("Q52f", f"toDecimal(json {js!r}, {p}, {s}, {mode})", f"decimal {want} at ({p}, {s})",
               case(queries=[{"id": "q", "kind": "expr", "expr": expr}]),
               lambda r, want=want, p=p, s=s: (res(r, "q") == {"type": "decimal", "value": want, "scale": s, "precision": p},
                                              res(r, "q") or q(r, "q").get("error")))

# ------------------------------------------------------------------ Q52g: erase command shape
G_BASE = [cmd([asrt("x1", "p1", SSN, S("SECRET-X1"))], 100)]
G_Q = [{"id": "m", "kind": "match", "cut": V, "pattern": {"attribute": SSN}}]
G_CASES = {
    "erasure": case(G_BASE + [cmd([{"op": "erasure", "entityId": "p1", "attribute": SSN}], 200)], G_Q),
    "mixed": case(G_BASE + [cmd([erase("p1", SSN), asrt("y1", "p2", SSN, S("Y"))], 200)], G_Q),
    "preconditions": case(G_BASE + [cmd([erase("p1", SSN)], 200, "pe", preconditions=[{"_tag": "TripleLive", "target": "x1"}])], G_Q),
}
for name, the_case in G_CASES.items():
    single("Q52g", f"erase shape: {name}", "rejected E-INVALID-VALUE; nothing applied (x1 still readable, no y1)", the_case,
           lambda r: (err_is(outc(r, 1), "E-INVALID-VALUE") and [x["value"] for x in res(r, "m")["raw"]] == [S("SECRET-X1")],
                      [outc(r, 1), [x["value"] for x in res(r, "m")["raw"]]]))
single("Q52g", "control: the same erase alone", "commits; x1 reads as marker(200)", case(G_BASE + [cmd([erase("p1", SSN)], 200)], G_Q),
       lambda r: (outc(r, 1)["outcome"] == "committed" and [x["value"] for x in res(r, "m")["raw"]] == [marker(200)],
                  [outc(r, 1), [x["value"] for x in res(r, "m")["raw"]]]))

# ------------------------------------------------------------------ self-test: one planted wrong alternative per ruling
if SELF_TEST:
    ROWS.clear()
    single("ST", "ST Q52a each erased value counts", "COUNT 4 (wrong)", Q52A, lambda r: (agg1(res(r, "cnt"), "x") == "4", res(r, "cnt")["rows"]))
    single("ST", "ST Q52b missing before markers", "[p3, p2, p4, p5, p7, p6, p1] (wrong)", Q52B,
           lambda r: (find_ids(r, "asc") == ["p3", "p2", "p4", "p5", "p7", "p6", "p1"], find_ids(r, "asc")))
    single("ST", "ST Q52b desc reverses the markers", "[p2, p3, p1, p6, p4, p5, p7] (wrong)", Q52B,
           lambda r: (find_ids(r, "desc") == ["p2", "p3", "p1", "p6", "p4", "p5", "p7"], find_ids(r, "desc")))
    single("ST", "ST Q52c latest erasedAt", "marker(300) (wrong)", Q52C,
           lambda r: (res(r, "grp")["rows"][0]["s"] == marker(300), res(r, "grp")["rows"]))
    single("ST", "ST Q52d erased reference enforced", "rejected E-CONSTRAINT (wrong)", Q52D,
           lambda r: (err_is(outc(r, 2), "E-CONSTRAINT"), outc(r, 2)))
    single("ST", "ST Q52e a mixed answer accepted", "an alternative with SUM 5 or 6 (wrong)", Q52E,
           lambda r: (any(x in ("5", "6") for _, x in alternatives(r, "sum", "x")), alternatives(r, "sum", "x")))
    single("ST", "ST Q66a all-old answer missing", "first alternative has erasuresSeen [tx:1] (wrong)", Q66[2],
           lambda r: (alternatives(r, "sum", "x")[0][0] == ["tx:1"], alternatives(r, "sum", "x")))
    single("ST", "ST Q66c other scope in flight", "scope s lists 4 alternatives (wrong)", SC,
           lambda r: (len(alternatives(r, "s", "x")) == 4, alternatives(r, "s", "x")))
    single("ST", "ST Q66b unaffected page 2 listed in flight", "page b has inFlight (wrong: both prefixes agree)", Q66B_ONE,
           lambda r: ("inFlight" in q(r, "b"), entry(r, "b")))
    single("ST", "ST Q66b two-page: all-old prefix shows p4 marker", "([], p3 3, p4 M) first (wrong)", Q66B_TWO,
           lambda r: (entry(r, "b")[0] == ([], [row("p3", "3"), row("p4", "M")]), entry(r, "b")))
    single("ST", "ST Q66b two commits: page 2 plain", "plain (wrong)", Q66B_TWO2, lambda r: (entry(r, "b")[0][0] == "plain", entry(r, "b")))
    single("ST", "ST Q66b chain: page 3 has two alternatives", "2 alternatives (wrong)", Q66B_CHAIN,
           lambda r: (len(entry(r, "c")) == 2, entry(r, "c")))
    single("ST", "ST Q66b own readStart: one plain page", "plain (wrong)", Q66B_OWN, lambda r: (entry(r, "b")[0][0] == "plain", entry(r, "b")))
    single("ST", "ST Q66b plain source: page b an error", "an error (wrong)", Q66B_PLAIN_SRC,
           lambda r: ("error" in q(r, "b"), entry(r, "b")))
    if LIT_TOKENS:
        single("ST", "ST Q70b own later readStart wins", "plain markers (wrong)", Q70B_LATER,
               lambda r: (entry(r, "b") == [("plain", PLAIN_TAIL)], entry(r, "b")))
        single("ST", "ST Q70c own readStart reopens the old value", "x lists ([], p2 2) (wrong)", Q70C,
               lambda r: (any(s == [] for s, _ in entry(r, "x")), entry(r, "x")))
        single("ST", "ST Q70f latest issuer followed (A last)", "per A's prefixes (wrong: views disagree, refuse)", Q70D_A_LAST,
               lambda r: (entry(r, "x") == LIT_ALTS, entry(r, "x")))
        single("ST", "ST Q70f latest issuer followed (B last)", "plain markers (wrong: views disagree, refuse)", Q70D_B_LAST,
               lambda r: (entry(r, "x") == [("plain", PLAIN_TAIL)], entry(r, "x")))
    if H_TOKEN:
        single("ST", "ST Q70h identical views refused", "refused (wrong: identical views continue)", Q70H,
               lambda r: (ambiguous(r, "x", "literal token"), entry(r, "x")))
    single("ST", "ST Q70g page 2 own view", "plain [tx:1 M] (wrong: continues page 1)", Q70G,
           lambda r: (tx_entry(r, "t2") == [("plain", [("tx:1", [marker(200)])], 2)], tx_entry(r, "t2")))
    single("ST", "ST Q70g own readStart consulted", "page 2 in flight (wrong)", Q70G_OWN, lambda r: ("inFlight" in q(r, "t2"), tx_entry(r, "t2")))
    single("ST", "ST Q70i ambiguous after continues t1", "page 2 per t1's prefixes (wrong: refuse)", Q70I,
           lambda r: (tx_entry(r, "t2") == [([], [("tx:1", [I(2)])], 2), (["tx:2"], [("tx:1", [marker(200)])], 2)], tx_entry(r, "t2")))
    single("ST", "ST Q70i other journal scope matched", "plain [tx:3 M] (wrong: own view)", Q70I_SCOPE,
           lambda r: (tx_entry(r, "ts") == [("plain", [("tx:3", [marker(200)])], 2)], tx_entry(r, "ts")))
    single("ST", "ST Q70j default scope in flight", "erasuresSeen [tx:2] (wrong: scope t's tx:3)", Q70J,
           lambda r: (any(s == ["tx:2"] for s, _ in seen_and(r, "tx", lambda res: None)), seen_and(r, "tx", lambda res: None)))
    single("ST", "ST Q70k assertions plain", "plain (wrong: t's erasure is in flight)", Q70J,
           lambda r: ("inFlight" not in q(r, "as"), q(r, "as").keys() and list(q(r, "as").keys())))
    single("ST", "ST Q70l entity page 2 own view", "plain [tx:0 M] (wrong: continues page 1)", Q70L_FE,
           lambda r: (tx_entry(r, "e2") == [("plain", [("tx:0", [marker(200)])], None)], tx_entry(r, "e2")))
    single("ST", "ST Q70l disagreeing issuers continue e1", "page 1's prefixes (wrong: refuse)", Q70L_FE_AMB,
           lambda r: (tx_entry(r, "e2") == FE_ALTS, tx_entry(r, "e2")))
    single("ST", "ST Q70l other snapshotPosition matched", "page 1's prefixes (wrong: own view)", Q70L_FE_SNAP,
           lambda r: (tx_entry(r, "e2") == FE_ALTS, tx_entry(r, "e2")))
    single("ST", "ST Q70l other entity matched", "in flight (wrong: own view)", Q70L_FE_OTHER, lambda r: ("inFlight" in q(r, "e2"), tx_entry(r, "e2")))
    single("ST", "ST Q70m string after answered", "an answer (wrong: malformed)",
           case(TXP, [TQ("t1", 0, readStart={"afterCommand": 1}), TQ("t2", "1")]), lambda r: (True, "answered"))
    single("ST", "ST Q70l non-paged kind continues A", "in flight (wrong: own view)", Q70L_NONPAGED, lambda r: ("inFlight" in q(r, "m"), q(r, "m")))
    single("ST", "ST Q70a page 1 continuation in flight", "x has inFlight (wrong)", Q70A_PAGE1,
           lambda r: ("inFlight" in q(r, "x"), entry(r, "x")))
    single("ST", "ST Q52f binary64 expansion", "json 2.675 half-up = 2.67 (wrong)",
           case(queries=[{"id": "q", "kind": "expr", "expr": ["toDecimal", J(2.675), 3, 2, "half-up"]}]),
           lambda r: ((res(r, "q") or {}).get("value") == "2.67", res(r, "q")))
    single("ST", "ST Q52g erasure spelling commits", "committed (wrong)", G_CASES["erasure"],
           lambda r: (outc(r, 1)["outcome"] == "committed", outc(r, 1)))

counts = {}
for r in ROWS:
    counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"counts": counts, "probes": len(ROWS), "rows": ROWS}, indent=1, default=str) + "\n")
print(json.dumps(counts), len(ROWS), "probes")
for r in ROWS:
    if r["verdict"] != "MATCH":
        print(f"{r['verdict']:13s} {r['ruling']:6s} {r['probe'][:60]:60s} | {json.dumps(r['oracle'], default=str)[:400]}")

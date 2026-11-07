"""V-O03: probe O-REPLAY (0.3.1 at 8cc2c26) on contract 0.3.5 and the pending Q43 rulings, written from the contract
text by the verifier (not from the oracle's tests). Each probe states the rule and the contract's answer:

  MATCH         the oracle gives the contract's answer (for a refusal probe: it refuses with X-NOT-MODELED)
  WRONG-ANSWER  the oracle gives a confident answer the contract does not
  REFUSES       the oracle declines where the contract has an answer
  REFUSES-UNTYPED  a refusal probe answered by a refusal that does not start X-NOT-MODELED

Also runs the reverse check: every error id the oracle can emit is a contract 0.3.5 ERROR_TABLE id (or an X- id the
oracle documents), and the oracle's error table equals the contract's row for row.

  python3 -I lab/verify/O02/tools/probe_035.py WORKDIR  -> lab/verify/O02/v-o03/results/probe_035.json
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
CLI = ROOT / "lab/oracles/replay/cli.py"
WORK = Path(sys.argv[1])
OUT = ROOT / "lab/verify/O02/v-o03/results/probe_035.json"
C = json.loads((ROOT / "lab/acceptance/obligations.json").read_text())
ERR = {r["id"]: r for r in C["errorTable"]}
assert C["version"] == "0.3.5", C["version"]

I = lambda s: {"type": "integer", "value": str(s)}  # noqa: E731
N = lambda x: {"type": "number", "value": x}  # noqa: E731
S = lambda s: {"type": "string", "value": s}  # noqa: E731
B = lambda b: {"type": "boolean", "value": b}  # noqa: E731
D = lambda t, p, s: {"type": "decimal", "value": t, "precision": p, "scale": s}  # noqa: E731
DW = lambda t: {"type": "decimal", "value": t}  # noqa: E731
J = lambda v: {"type": "json", "value": v}  # noqa: E731
RATE = {":p/rate": {"type": "decimal", "precision": 9, "scale": 2}}


def case(commands=(), queries=(), **extra):
    c = {"format": "triplex-db-2/o-replay-case/1", "caseId": "v-o03/probe", "defaultScope": "s",
         "commands": list(commands), "queries": list(queries)}
    c.update(extra)
    return c


def cmd(ops, clock=100, cid=None, **extra):
    c = {"clock": clock, "meta": {"commandId": cid or f"c{clock}"}, "operations": ops}
    c.update(extra)
    return c


def asrt(ref, e, a, v, **kw):
    o = {"op": "assert", "ref": ref, "entityId": e, "attribute": a, "value": v, "validFrom": 0}
    o.update(kw)
    return o


def expr(e):
    return case(queries=[{"id": "q", "kind": "expr", "expr": e}])


def coord(offset, ordinal=0, epoch=1, stream="log"):
    return {"stream": stream, "epoch": epoch, "offset": offset, "ordinal": ordinal}


def rcpt(i, pos, outcome="committed", **kw):
    r = {"command": i, "outcome": outcome, "txId": f"t{i}", "position": pos, "instant": 100 + i, "assertionIds": [f"i{i}"]}
    r.update(kw)
    return r


# --------------------------------------------------------------------------- answer helpers


def qe(rep, qid="q"):
    return next(x for x in rep["queries"] if x["id"] == qid)


def res(rep, qid="q"):
    return qe(rep, qid).get("result")


def err_is(node, eid):
    """node is a query error or a rejected outcome: id, tag and reason are the contract 0.3.5 row's."""
    if not isinstance(node, dict):
        return False
    row = ERR[eid]
    tag = node.get("_tag", node.get("errorTag"))
    return node.get("error") == eid and tag == row["tag"] and node.get("reason") in row["reason"].split("|")


def qerr(eid, qid="q"):
    return lambda rep: (err_is(qe(rep, qid).get("error"), eid), qe(rep, qid).get("error") or qe(rep, qid).get("result"))


def outc(rep, i=0):
    return next(o for o in rep["commandOutcomes"] if o["command"] == i)["expected"]


def rejected(eid, i=0, detail=None):
    def f(rep):
        o = outc(rep, i)
        ok = o.get("outcome") == "rejected" and err_is(o, eid) and (detail is None or o.get("detail") == detail)
        return ok, o
    return f


def committed(i=0):
    return lambda rep: (outc(rep, i).get("outcome") == "committed", outc(rep, i))


def decval(text, scale, precision=None, qid="q"):
    def f(rep):
        r = res(rep, qid)
        ok = isinstance(r, dict) and r.get("type") == "decimal" and r.get("value") == text and r.get("scale") == scale \
            and (precision is None or r.get("precision") == precision)
        return ok, r or qe(rep, qid).get("error")
    return f


def both(*checks):
    def f(rep):
        got = [c(rep) for c in checks]
        return all(g[0] for g in got), [g[1] for g in got]
    return f


def match_count(n, qid="q"):
    def f(rep):
        r = res(rep, qid)
        return isinstance(r, dict) and r.get("count") == n, r.get("count") if isinstance(r, dict) else qe(rep, qid).get("error")
    return f


def consistency(status, rule=None):
    def f(rep):
        rc = rep["receiptConsistency"]
        ok = rc["status"] == status and (rule is None or any(v.get("rule") == rule for v in rc.get("violations", [])))
        return ok, rc
    return f


PROBES = []


def probe(pid, rule, contract, the_case, check, refusal=False):
    PROBES.append((pid, rule, contract, the_case, check, refusal))


# --------------------------------------------------------------------------- 1. decimal error ids (Q35e, Q43a, Q43b, Q43g)

probe("DEC write excess fraction", "decimalRules.reject / DC-T2D / Q43a", "16.505 at (9,2): rejected E-DECIMAL-FRACTION",
      case([cmd([asrt("r", "e", ":p/rate", DW("16.505"))])], attributeDeclarations=RATE), rejected("E-DECIMAL-FRACTION"))
probe("DEC write beyond precision", "decimalRules.reject / DC-T2D / Q43a", "12345678.00 at (9,2): rejected E-DECIMAL-OVERFLOW",
      case([cmd([asrt("r", "e", ":p/rate", DW("12345678.00"))])], attributeDeclarations=RATE), rejected("E-DECIMAL-OVERFLOW"))
probe("DEC write at the boundary", "DEC-SCALE-BOUNDARY", "1234567.99 at (9,2) commits",
      case([cmd([asrt("r", "e", ":p/rate", DW("1234567.99"))])], attributeDeclarations=RATE), committed())
probe("DEC write 39 digits at (38,0)", "decimalRules.reject (38 digits)", "rejected E-DECIMAL-OVERFLOW",
      case([cmd([asrt("r", "e", ":p/big", DW("1" + "0" * 38))])],
           attributeDeclarations={":p/big": {"type": "decimal", "precision": 38, "scale": 0}}), rejected("E-DECIMAL-OVERFLOW"))
probe("DEC trailing zeros fit (R-DEC-3)", "R-DEC-3", "16.500 at (9,2) commits and reads back 16.50",
      case([cmd([asrt("r", "e", ":p/rate", DW("16.500"))])], [{"id": "q", "kind": "match", "cut": {"validAt": 1},
                                                              "pattern": {"attribute": ":p/rate"}}], attributeDeclarations=RATE),
      lambda rep: ((res(rep)["raw"][0]["value"] == {"type": "decimal", "value": "16.50", "scale": 2, "precision": 9}),
                   res(rep)["raw"][0]["value"]))
probe("DEC -0.00 refused (R-DEC-2)", "R-DEC-2", "rejected E-INVALID-VALUE",
      case([cmd([asrt("r", "e", ":p/rate", DW("-0.00"))])], attributeDeclarations=RATE), rejected("E-INVALID-VALUE"))
probe("DEC undeclared attribute (R-DEC-0)", "R-DEC-0", "rejected E-INVALID-VALUE",
      case([cmd([asrt("r", "e", ":p/other", DW("1.00"))])], attributeDeclarations=RATE), rejected("E-INVALID-VALUE"))
for bad in ("+1.00", "01.00", "1.", ".5", "1e3"):
    probe(f"DEC non-canonical text {bad!r}", "decimalRules inputGrammar / DC-T2D / TDK1-V7", "rejected E-INVALID-VALUE",
          case([cmd([asrt("r", "e", ":p/rate", DW(bad))])], attributeDeclarations=RATE), rejected("E-INVALID-VALUE"))
probe("DEC AVG (R-DEC-7, Q43b)", "R-DEC-7 / Q43b", "preflight E-DECIMAL-AVG",
      case([cmd([asrt("a", "e1", ":p/rate", DW("1.25")), asrt("b", "e2", ":p/rate", DW("0.50"))])],
           [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"r": ":p/rate"}},
             "aggregates": [{"op": "avg", "var": "r", "as": "x"}]}], attributeDeclarations=RATE), qerr("E-DECIMAL-AVG"))
probe("DEC AVG with toNumber", "AG-AVG-CONV (decimal)", "binary64 0.875 (exact mean rounded once)",
      case([cmd([asrt("a", "e1", ":p/rate", DW("1.25")), asrt("b", "e2", ":p/rate", DW("0.50"))])],
           [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"r": ":p/rate"}},
             "aggregates": [{"op": "avg", "var": "r", "as": "x", "convert": "toNumber"}]}], attributeDeclarations=RATE),
      lambda rep: (res(rep)["rows"][0]["x"].get("bits") == "0x3fec000000000000", res(rep)["rows"]))
probe("DEC SUM", "DO-SUM", "1.25 + 0.50 = 1.75, scale 2, precision 38",
      case([cmd([asrt("a", "e1", ":p/rate", DW("1.25")), asrt("b", "e2", ":p/rate", DW("0.50"))])],
           [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"r": ":p/rate"}},
             "aggregates": [{"op": "sum", "var": "r", "as": "x"}]}], attributeDeclarations=RATE),
      lambda rep: (res(rep)["rows"][0]["x"] == {"type": "decimal", "value": "1.75", "scale": 2, "precision": 38},
                   res(rep)["rows"]))
probe("DEC bare /", "DO-BARE-DIV", "preflight E-DECIMAL-BARE-DIVIDE", expr(["div", D("1.00", 3, 2), D("3.00", 3, 2)]),
      qerr("E-DECIMAL-BARE-DIVIDE"))
probe("DEC toInteger(1.50)", "DC-D2I", "E-DECIMAL-FRACTION", expr(["to-int64", D("1.50", 3, 2)]), qerr("E-DECIMAL-FRACTION"))
probe("DEC toInteger(2.00)", "DC-D2I", "integer 2", expr(["to-int64", D("2.00", 3, 2)]),
      lambda rep: (res(rep) == {"type": "integer", "value": "2"}, res(rep)))
probe("DEC toInteger(2^63) (Q43g)", "Q43g R-DEC-12", "E-INTEGER-OVERFLOW", expr(["to-int64", D("9223372036854775808", 19, 0)]),
      qerr("E-INTEGER-OVERFLOW"))
probe("DEC toDecimal(1e20, 10, 0) (Q43a)", "Q43a / DC-N2D", "E-DECIMAL-OVERFLOW", expr(["toDecimal", N(1e20), 10, 0, "down"]),
      qerr("E-DECIMAL-OVERFLOW"))
probe("DEC toDecimal(integer 12345, 4, 0)", "DC-I2D", "E-DECIMAL-OVERFLOW", expr(["toDecimal", I(12345), 4, 0]),
      qerr("E-DECIMAL-OVERFLOW"))
probe("DEC toDecimal(integer 12345, 7, 2)", "DC-I2D", "12345.00 at scale 2", expr(["toDecimal", I(12345), 7, 2]),
      decval("12345.00", 2, 7))
probe("DEC add beyond 38 digits", "DO-ADD / Q43e", "E-DECIMAL-OVERFLOW",
      expr(["add", D("9" * 38, 38, 0), D("1", 1, 0)]), qerr("E-DECIMAL-OVERFLOW"))
probe("DEC add 38 digits that fit", "DO-ADD / Q43e", "99..9 (38 nines) exactly, no error",
      expr(["add", D("9" * 37 + "8", 38, 0), D("1", 1, 0)]), decval("9" * 38, 0))

# --------------------------------------------------------------------------- 2. decimal operation values (Q22, Q43c to Q43f)

probe("DEC add type", "DO-ADD", "1.25 + 0.5 = 1.75, scale 2, precision 4", expr(["add", D("1.25", 3, 2), D("0.5", 2, 1)]),
      decval("1.75", 2, 4))
probe("DEC sub type", "DO-ADD", "0.5 - 1.25 = -0.75, scale 2, precision 4", expr(["sub", D("0.5", 2, 1), D("1.25", 3, 2)]),
      decval("-0.75", 2, 4))
probe("DEC mul type", "DO-MUL", "1.25 * 0.5 = 0.625, scale 3, precision 5", expr(["mul", D("1.25", 3, 2), D("0.5", 2, 1)]),
      decval("0.625", 3, 5))
probe("DEC literal type (Q43c)", "Q43c R-DEC-8", "undeclared 12.5 + 1 = 13.5: (3,1)+(1,0) -> scale 1, precision 2+1+1 = 4",
      expr(["add", DW("12.5"), DW("1")]), decval("13.5", 1, 4))
probe("DEC compare 1.50 = 1.5", "DO-CMP", "eq true", case(queries=[{"id": "q", "kind": "compare", "left": D("1.50", 3, 2),
                                                                     "right": D("1.5", 2, 1)}]),
      lambda rep: (res(rep)["eq"] is True and res(rep)["lt"] is False, res(rep)))
for mode, want in (("half-even", "0.12"), ("half-up", "0.13"), ("down", "0.12")):
    probe(f"DEC divide 1/8 {mode}", "DO-DIV / Q43d", f"0.125 at scale 2 -> {want}", expr(["divide", D("1.000", 4, 3), I(8), 2, mode]),
          decval(want, 2))
for mode, want in (("half-even", "-0.12"), ("half-up", "-0.13"), ("down", "-0.12")):
    probe(f"DEC divide -1/8 {mode}", "DO-DIV / Q43d (negative ties)", f"-0.125 at scale 2 -> {want}",
          expr(["divide", D("-1.000", 4, 3), I(8), 2, mode]), decval(want, 2))
probe("DEC divide 1/3", "DO-DIV", "0.33", expr(["divide", D("1.00", 3, 2), D("3.00", 3, 2), 2, "half-even"]), decval("0.33", 2))
probe("DEC divide by zero", "DO-DIV", "E-DIVISION-BY-ZERO", expr(["divide", D("1.00", 3, 2), D("0.00", 3, 2), 2, "half-even"]),
      qerr("E-DIVISION-BY-ZERO"))
probe("DEC divide beyond 38", "DO-DIV / Q43e", "E-DECIMAL-OVERFLOW",
      expr(["divide", D("9" * 38, 38, 0), D("0.1", 1, 1), 0, "down"]), qerr("E-DECIMAL-OVERFLOW"))
for x, s, mode, want in (("1.25", 1, "half-even", "1.2"), ("1.25", 1, "half-up", "1.3"), ("1.25", 1, "down", "1.2"),
                         ("-1.25", 1, "half-up", "-1.3"), ("-1.35", 1, "half-even", "-1.4"), ("2.5", 0, "half-even", "2"),
                         ("3.5", 0, "half-even", "4"), ("-2.5", 0, "half-up", "-3"), ("-1.29", 1, "down", "-1.2")):
    p = len(x.replace("-", "").replace(".", ""))
    sx = len(x.split(".")[1])
    probe(f"DEC round({x}, {s}, {mode})", "DO-ROUND / Q43d", f"{want} at scale {s}, precision {p - (sx - s)}",
          expr(["round", D(x, p, sx), s, mode]), decval(want, s, p - (sx - s)))
probe("DEC round carry overflow", "DO-ROUND", "round(9.99 (3,2), 1, half-up) = 10.0 needs 3 digits > precision 2: E-DECIMAL-OVERFLOW",
      expr(["round", D("9.99", 3, 2), 1, "half-up"]), qerr("E-DECIMAL-OVERFLOW"))
probe("DEC round to a larger scale (Q43f)", "Q43f R-DEC-11", "round(1.5 (2,1), 3) = 1.500, scale 3, precision 4",
      expr(["round", D("1.5", 2, 1), 3, "half-even"]), decval("1.500", 3, 4))
probe("DEC round larger scale past 38 (Q43f)", "Q43f", "37 integer digits to scale 2 needs 39 digits: E-DECIMAL-OVERFLOW",
      expr(["round", D("1" + "0" * 36, 37, 0), 2, "down"]), qerr("E-DECIMAL-OVERFLOW"))
probe("DEC round same scale", "DO-ROUND", "round(1.25, 2) = 1.25", expr(["round", D("1.25", 3, 2), 2, "half-even"]),
      decval("1.25", 2, 3))
probe("DEC toDecimal(0.1, 20, 18, down) (R-DEC-6)", "R-DEC-6 / DC-N2D", "0.100000000000000005 (exact binary expansion, truncated)",
      expr(["toDecimal", N(0.1), 20, 18, "down"]), decval("0.100000000000000005", 18))
probe("DEC toDecimal(0.1, 20, 18, half-even)", "R-DEC-6", "0.100000000000000006 (next digits 5511... > half)",
      expr(["toDecimal", N(0.1), 20, 18, "half-even"]), decval("0.100000000000000006", 18))
probe("DEC toDecimal(2.675, 4, 2, half-even)", "R-DEC-6", "2.67 (binary 2.67499999...)",
      expr(["toDecimal", N(2.675), 4, 2, "half-even"]), decval("2.67", 2))
probe("DEC toNumber(0.1)", "DC-D2N", "binary64 0x3fb999999999999a", expr(["to-number", D("0.1", 1, 1)]),
      lambda rep: (res(rep).get("bits") == "0x3fb999999999999a", res(rep)))
probe("DEC rem", "Q33e R-NUM-8", "E-MIXED-FAMILY", expr(["rem", D("1.5", 2, 1), D("1.0", 2, 1)]), qerr("E-MIXED-FAMILY"))
probe("DEC vs integer eq", "CMP-DECIMAL-CROSS", "eq is preflight E-MIXED-FAMILY",
      case(queries=[{"id": "q", "kind": "compare", "left": D("1", 1, 0), "right": I(1)}]),
      lambda rep: (err_is(res(rep)["eq"], "E-MIXED-FAMILY"), res(rep)))

# --------------------------------------------------------------------------- 3. -0 instants (Q30b, Q43h)

probe("validFrom -0", "WR-INSTANT", "rejected E-NEGATIVE-ZERO-INSTANT, detail no-negative-zero",
      case([cmd([asrt("a", "e", ":x/s", S("v"), validFrom=-0.0, validTo=10)])]), rejected("E-NEGATIVE-ZERO-INSTANT", detail="no-negative-zero"))
probe("datetime -0", "WR-INSTANT", "rejected E-NEGATIVE-ZERO-INSTANT",
      case([cmd([asrt("a", "e", ":x/t", {"type": "datetime", "value": -0.0})])]), rejected("E-NEGATIVE-ZERO-INSTANT"))
probe("read basis validAt -0 (Q43h)", "Q43h R-CUT-4", "E-NEGATIVE-ZERO-INSTANT",
      case([cmd([asrt("a", "e", ":x/s", S("v"))])], [{"id": "q", "kind": "match", "cut": {"validAt": -0.0}}]),
      qerr("E-NEGATIVE-ZERO-INSTANT"))
probe("read basis recordedAt -0 (Q43h)", "Q43h R-CUT-4", "E-NEGATIVE-ZERO-INSTANT",
      case([cmd([asrt("a", "e", ":x/s", S("v"))])], [{"id": "q", "kind": "match", "cut": {"validAt": 1, "recordedAt": -0.0}}]),
      qerr("E-NEGATIVE-ZERO-INSTANT"))
probe("read basis validAt +0", "control", "a +0 basis is ordinary (count 1)",
      case([cmd([asrt("a", "e", ":x/s", S("v"))])], [{"id": "q", "kind": "match", "cut": {"validAt": 0}}]), match_count(1))

# --------------------------------------------------------------------------- 4. user JSON (Q30a, Q33a, Q34c)

probe("JSON 0.1 accepted (Q33a)", "R-VAL-7a", "commits", case([cmd([asrt("j", "e", ":x/j", J({"a": 0.1}))])]), committed())
probe("JSON 9007199254740993 (Q33a)", "R-VAL-7a / WR-JSON", "rejected E-INEXACT-JSON-NUMBER, detail inexact-json-number",
      case([cmd([asrt("j", "e", ":x/j", J({"a": 9007199254740993}))])]),
      rejected("E-INEXACT-JSON-NUMBER", detail="inexact-json-number"))
probe("JSON nested struct -0", "WR-JSON (recursive)", "rejected E-INEXACT-JSON-NUMBER",
      case([cmd([asrt("j", "e", ":x/j", J({"a": {"b": [1, {"c": -0.0}]}}))])]), rejected("E-INEXACT-JSON-NUMBER"))
probe("JSON non-finite 1e400", "WR-JSON", "rejected E-INEXACT-JSON-NUMBER",
      "RAW:" + json.dumps(case([cmd([asrt("j", "e", ":x/j", J({"a": "__NUM__"}))])])).replace('"__NUM__"', "1e400"),
      rejected("E-INEXACT-JSON-NUMBER"))
probe("JSON -0 before duplicate keys collapse", "WR-JSON (guard before CanonicalJson)", "rejected E-INEXACT-JSON-NUMBER",
      "RAW:" + json.dumps(case([cmd([asrt("j", "e", ":x/j", J({"a": "__DUP__"}))])])).replace('{"a": "__DUP__"}',
                                                                                          '{"a": -0.0, "a": 1}'),
      rejected("E-INEXACT-JSON-NUMBER"))
probe("number -0 journals bit-exact (Q34c)", "WR-JSON journal exemption / JN-NEGZERO", "commits; journal change value bits 0x8000000000000000; :_tx/change readable",
      case([cmd([asrt("z", "e", ":x/n", {"type": "number", "bits": "0x8000000000000000"})])],
           [{"id": "t", "kind": "transaction", "txId": "tx:0"},
            {"id": "q", "kind": "match", "cut": {"validAt": 1000}, "pattern": {"entityId": "tx:0", "attribute": ":_tx/change"}}]),
      lambda rep: (outc(rep)["outcome"] == "committed" and res(rep, "t")["changes"][0]["value"]["bits"] == "0x8000000000000000"
                   and res(rep)["count"] == 1, [res(rep, "t")["changes"][0]["value"], res(rep).get("count")]))

# --------------------------------------------------------------------------- 5. Q33 rules not covered above

INT_SCHEMA = [{"version": 1, "entityTypes": {"T": {"attributes": {"n": {"attribute": ":t/n", "type": "integer", "cardinality": "one"}}}}}]
probe("R-CMP-3 eq across families", "Q33d", "string 'a' = integer 1 is false (not an error)",
      case(queries=[{"id": "q", "kind": "compare", "left": S("a"), "right": I(1)}]),
      lambda rep: (res(rep)["eq"] is False and err_is(res(rep)["lt"], "E-MIXED-FAMILY") and err_is(res(rep)["gt"], "E-MIXED-FAMILY"),
                   res(rep)))
probe("R-CMP-3 in find (CMP-CROSS-FAMILY-ORDERED)", "Q33d", "find where integer n lt 'x': preflight E-MIXED-FAMILY",
      case([cmd([asrt("a", "t1", ":t/n", I(1), entityType="T")])],
           [{"id": "q", "kind": "find", "entityType": "T", "cut": {"validAt": 1}, "where": [{"prop": "n", "op": "lt", "value": "x"}]}],
           schemas=INT_SCHEMA), qerr("E-MIXED-FAMILY"))
probe("R-NUM-7", "Q33e", "'a' + 1: E-MIXED-FAMILY", expr(["add", S("a"), I(1)]), qerr("E-MIXED-FAMILY"))
probe("R-NUM-8", "Q33e", "rem(1.5, 1.0): E-MIXED-FAMILY", expr(["rem", N(1.5), N(1.0)]), qerr("E-MIXED-FAMILY"))
for op in ("sum", "avg"):
    probe(f"R-AGG-5 {op} over strings", "Q33e", "E-MIXED-FAMILY",
          case([cmd([asrt("a", "e1", ":x/s", S("p")), asrt("b", "e2", ":x/s", S("q"))])],
               [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":x/s"}},
                 "aggregates": [{"op": op, "var": "v", "as": "x"}]}]), qerr("E-MIXED-FAMILY"))
probe("R-CMD-9 unknown op", "Q33f", "rejected E-INVALID-VALUE", case([cmd([{"op": "frobnicate", "entityId": "e"}])]),
      rejected("E-INVALID-VALUE"))
probe("R-CMD-9 duplicate retract", "Q33f", "rejected E-INVALID-VALUE",
      case([cmd([asrt("a", "e", ":x/s", S("v"))], 100), cmd([{"op": "retract", "target": "a"}, {"op": "retract", "target": "a"}], 200)]),
      rejected("E-INVALID-VALUE", 1))
probe("R-CMD-12 retract-pattern on tx entity", "Q33f", "rejected E-RESERVED",
      case([cmd([asrt("a", "e", ":x/s", S("v"))], 100), cmd([{"op": "retract-pattern", "pattern": {"entityId": "tx:0"}}], 200)]),
      rejected("E-RESERVED", 1))
probe("R-JNL-5 valid from commit instant (before)", "Q33g", "match :_tx/change of tx:0 at V=50 < commit 100: none",
      case([cmd([asrt("a", "e", ":x/s", S("v"))], 100)], [{"id": "q", "kind": "match", "cut": {"validAt": 50},
                                                          "pattern": {"entityId": "tx:0", "attribute": ":_tx/change"}}]), match_count(0))
probe("R-JNL-5 valid from commit instant (at)", "Q33g", "at V=100: one :_tx/change fact",
      case([cmd([asrt("a", "e", ":x/s", S("v"))], 100)], [{"id": "q", "kind": "match", "cut": {"validAt": 100},
                                                          "pattern": {"entityId": "tx:0", "attribute": ":_tx/change"}}]), match_count(1))
probe("R-JNL-6 tx entity without attribute", "Q33g", "X-NOT-MODELED (no partial answer)",
      case([cmd([asrt("a", "e", ":x/s", S("v"))])], [{"id": "q", "kind": "match", "cut": {"validAt": 1000}, "pattern": {"entityId": "tx:0"}}]),
      lambda rep: ((qe(rep).get("error") or {}).get("error") == "X-NOT-MODELED" and "result" not in qe(rep), qe(rep)))
probe("R-JNL-6 :_tx/instant", "Q33g", "X-NOT-MODELED",
      case([cmd([asrt("a", "e", ":x/s", S("v"))])], [{"id": "q", "kind": "match", "cut": {"validAt": 1000}, "pattern": {"attribute": ":_tx/instant"}}]),
      lambda rep: ((qe(rep).get("error") or {}).get("error") == "X-NOT-MODELED", qe(rep)))
probe("R-JNL-7 transactions limit 1001", "Q33g", "E-CURSOR malformed",
      case([cmd([asrt("a", "e", ":x/s", S("v"))])], [{"id": "q", "kind": "transactions", "after": 0, "limit": 1001}]),
      lambda rep: (err_is(qe(rep).get("error"), "E-CURSOR") and qe(rep)["error"]["reason"] == "malformed", qe(rep).get("error")))
probe("R-JNL-7 transactionsForEntity limit 0", "Q33g", "E-CURSOR malformed",
      case([cmd([asrt("a", "e", ":x/s", S("v"))])], [{"id": "q", "kind": "transactionsForEntity", "entityId": "e", "limit": 0}]),
      lambda rep: (err_is(qe(rep).get("error"), "E-CURSOR") and qe(rep)["error"]["reason"] == "malformed", qe(rep).get("error")))
for k, v in (("recordedAt", -1), ("position", -1)):
    cut = {"validAt": 1, k: v}
    probe(f"R-CUT-3 negative {k}", "Q33h", "E-INVALID-VALUE",
          case([cmd([asrt("a", "e", ":x/s", S("v"))])], [{"id": "q", "kind": "match", "cut": cut}]), qerr("E-INVALID-VALUE"))
PAGES = [cmd([asrt(f"p{i}", f"page:{i}", ":pg/l", S(str(i)), entityType="Page") for i in range(5)])]
for lim in (0, 201):
    probe(f"R-PAGE-3 entityPage limit {lim}", "Q33h", "E-CURSOR malformed",
          case(PAGES, [{"id": "q", "kind": "entityPage", "entityType": "Page", "limit": lim, "cut": {"validAt": 1}}]),
          lambda rep: (err_is(qe(rep).get("error"), "E-CURSOR") and qe(rep)["error"]["reason"] == "malformed", qe(rep).get("error")))
probe("R-PAGE-4 other basis", "Q33h", "E-CURSOR other-query",
      case(PAGES, [{"id": "p1", "kind": "entityPage", "entityType": "Page", "limit": 2, "cut": {"validAt": 1}},
                   {"id": "q", "kind": "entityPage", "entityType": "Page", "limit": 2, "cursorFrom": {"query": "p1"}, "cut": {"validAt": 2}}]),
      lambda rep: (err_is(qe(rep).get("error"), "E-CURSOR") and qe(rep)["error"]["reason"] == "other-query", qe(rep).get("error")))
probe("R-PAGE-4 other page size allowed", "Q33h", "continuation with limit 3 returns page:2, page:3, page:4",
      case(PAGES, [{"id": "p1", "kind": "entityPage", "entityType": "Page", "limit": 2, "cut": {"validAt": 1}},
                   {"id": "q", "kind": "entityPage", "entityType": "Page", "limit": 3, "cursorFrom": {"query": "p1"}}]),
      lambda rep: ([e["entityId"] for e in (res(rep) or {"pages": [{"entities": []}]})["pages"][0]["entities"]] == ["page:2", "page:3", "page:4"],
                   res(rep) and [e["entityId"] for e in res(rep)["pages"][0]["entities"]] or qe(rep).get("error")))

# --------------------------------------------------------------------------- 6. positions (Q31c, Q38a): the oracle side of POSITION_REQUIRED_CASES

THREE = [cmd([asrt(f"a{i}", f"e{i}", ":x/s", S(str(i)))], 100 + i) for i in range(3)]


def cat_positions(rep):
    rows = next(x for x in rep["queries"] if x["id"] == "cat")["result"]
    return [(r["position"], (r.get("coordinate") or {}).get("offset"), (r.get("coordinate") or {}).get("epoch")) for r in rows]


probe("PO-LEXICOGRAPHIC-ORDER", "POSITION order", "offsets 9 < 10 (numeric, not string) then epoch 2: consistent; ordinals 1,2,3",
      case(THREE, [{"id": "cat", "kind": "cutCatalog"}],
           receipts=[rcpt(0, coord(9)), rcpt(1, coord(10)), rcpt(2, coord(3, epoch=2))]),
      lambda rep: (rep["receiptConsistency"]["status"] == "PASS" and cat_positions(rep) == [(1, 9, 1), (2, 10, 1), (3, 3, 2)],
                   [rep["receiptConsistency"]["status"], cat_positions(rep)]))
probe("PO-LEXICOGRAPHIC-ORDER negative", "POSITION order / R-RCP-1", "offset 10 then 9 in stream order: receipt violation",
      case(THREE[:2], [], receipts=[rcpt(0, coord(10)), rcpt(1, coord(9))]), consistency("FAIL"))
probe("PO-ORACLE-DENSE-ORDINALS", "POSITION oracle", "sparse offsets 5, 20, 1000 -> ordinals 1, 2, 3; cut at offset 20 sees 2 facts",
      case(THREE, [{"id": "cat", "kind": "cutCatalog"},
                   {"id": "q", "kind": "match", "cut": {"position": {"coordinate": coord(20)}, "validAt": 1}}],
           receipts=[rcpt(0, coord(5)), rcpt(1, coord(20)), rcpt(2, coord(1000))]),
      lambda rep: (rep["receiptConsistency"]["status"] == "PASS" and [p for p, _, _ in cat_positions(rep)] == [1, 2, 3]
                   and res(rep)["count"] == 2, [cat_positions(rep), res(rep)["count"]]))
NESTED = [dict(c, physicalGroup="g") for c in THREE]
probe("FX-NESTED-CUTS / PO-NESTED-CUTS-DENSE", "POSITION nested / FX-NESTED-CUTS",
      "one offset, ordinals 0,1,2: consistent; cuts at each interior ordinal see 1, 2, 3 facts",
      case(NESTED, [{"id": f"c{k}", "kind": "match", "cut": {"position": {"coordinate": coord(7, k)}, "validAt": 1}} for k in range(3)],
           receipts=[rcpt(i, coord(7, i)) for i in range(3)]),
      lambda rep: (rep["receiptConsistency"]["status"] == "PASS" and [res(rep, f"c{k}")["count"] for k in range(3)] == [1, 2, 3],
                   [rep["receiptConsistency"]["status"]] + [res(rep, f"c{k}")["count"] for k in range(3)]))
probe("FX-NESTED-CUTS negative (gap in ordinals)", "R-RCP-5", "ordinals 0, 2, 3 inside one engine transaction: violation",
      case(NESTED, [], receipts=[rcpt(0, coord(7, 0)), rcpt(1, coord(7, 2)), rcpt(2, coord(7, 3))]), consistency("FAIL"))
probe("FX-NESTED-CUTS negative (split offsets)", "R-RCP-5", "one physical group across two offsets: violation",
      case(NESTED, [], receipts=[rcpt(0, coord(7, 0)), rcpt(1, coord(7, 1)), rcpt(2, coord(8, 0))]), consistency("FAIL"))
GAP = dict(receipts=[rcpt(0, coord(10)), rcpt(1, coord(30))], abortedPositions={"s": [coord(20)]})
probe("FX-ABORT-GAP", "POSITION aborted / FX-ABORT-GAP", "cut at the aborted offset 20 (and 25) equals the cut at 10 (1 fact); at 30, 2 facts",
      case(THREE[:2], [{"id": f"c{o}", "kind": "match", "cut": {"position": {"coordinate": coord(o)}, "validAt": 1}} for o in (10, 20, 25, 30)],
           **GAP),
      lambda rep: (rep["receiptConsistency"]["status"] == "PASS" and [res(rep, f"c{o}")["count"] for o in (10, 20, 25, 30)] == [1, 1, 1, 2]
                   and res(rep, "c20")["cut"]["position"] == res(rep, "c10")["cut"]["position"],
                   [rep["receiptConsistency"]["status"]] + [res(rep, f"c{o}")["count"] for o in (10, 20, 25, 30)]))
probe("PO-ABORTED-LISTED", "POSITION aborted", "receiptConsistency.positions lists offset 20 as aborted",
      case(THREE[:2], [], **GAP),
      lambda rep: (any(a.get("offset") == 20 for p in rep["receiptConsistency"].get("positions", []) for a in p.get("aborted", [])),
                   rep["receiptConsistency"].get("positions")))
probe("FX-ABORT-GAP negative", "R-RCP-1", "a committed receipt on the listed aborted offset 20: violation",
      case(THREE[:2], [], receipts=[rcpt(0, coord(10)), rcpt(1, coord(20))], abortedPositions={"s": [coord(20)]}), consistency("FAIL"))
probe("FX-RESUME-AT-ABORT-GAP", "FX-RESUME-AT-ABORT-GAP (oracle side)",
      "the gap's cut ordinal is 1; transactions(after: 1) returns only the command at offset 30",
      case(THREE[:2], [{"id": "g", "kind": "match", "cut": {"position": {"coordinate": coord(20)}, "validAt": 1}},
                       {"id": "q", "kind": "transactions", "after": 1}], **GAP),
      lambda rep: (res(rep, "g")["cut"]["position"] == 1 and [t["txId"] for t in res(rep)["transactions"]] == ["t1"],
                   [res(rep, "g")["cut"]["position"], [t["txId"] for t in res(rep)["transactions"]]]))
probe("FX-CRASH-APPEND-RESOLUTION resolved", "FX-CRASH-APPEND-RESOLUTION / R-RCP-6", "unknown resolved committed: consistent, fact visible",
      case(THREE[:2], [{"id": "q", "kind": "match", "cut": {"validAt": 1}}],
           receipts=[rcpt(0, coord(10)), rcpt(1, coord(30), outcome="unknown", resolvedOutcome="committed")]),
      lambda rep: (rep["receiptConsistency"]["status"] == "PASS" and res(rep)["count"] == 2, [rep["receiptConsistency"]["status"], res(rep)["count"]]))
probe("FX-CRASH-APPEND-RESOLUTION unresolved", "R-RCP-6", "unknown without resolution: violation (fails closed)",
      case(THREE[:2], [], receipts=[rcpt(0, coord(10)), {"command": 1, "outcome": "unknown"}]), consistency("FAIL", "R-RCP-6"))
probe("epochs order", "POSITION epochs (lexicographic)", "a cut at (epoch 2, offset 0) sees every epoch-1 commit",
      case(THREE[:2], [{"id": "q", "kind": "match", "cut": {"position": {"coordinate": coord(0, epoch=2)}, "validAt": 1}}],
           receipts=[rcpt(0, coord(10)), rcpt(1, coord(500))]), match_count(2))

# --------------------------------------------------------------------------- 7. refusals that must answer X-NOT-MODELED (fail closed)

for opname in ("erase", "erasure"):
    probe(f"refuse erasure op {opname!r}", "Q24 / Q31f / R-CMD-13", "X-NOT-MODELED refusal (no expected answer)",
          case([cmd([asrt("a", "person:1", ":person/ssn", S("123"))], 100),
                cmd([{"op": opname, "entityId": "person:1", "attribute": ":person/ssn"}], 200)]), None, refusal=True)
probe("refuse scale evolution (widen)", "DS-WIDEN / R-DEC-15", "X-NOT-MODELED refusal",
      case([cmd([asrt("r", "e", ":p/rate", DW("1.00"))])], attributeDeclarations=RATE,
           schemas=[{"version": 2, "entityTypes": {"P": {"attributes": {"rate": {"attribute": ":p/rate", "type": "decimal",
                                                                                   "precision": 11, "scale": 2}}}}}]), None, refusal=True)
probe("refuse scale evolution (narrow, two releases)", "DS-NARROW / R-DEC-15", "X-NOT-MODELED refusal",
      case([cmd([asrt("r", "e", ":p/rate", DW("1.00"))])],
           schemas=[{"version": 1, "entityTypes": {"P": {"attributes": {"rate": {"attribute": ":p/rate", "type": "decimal",
                                                                                   "precision": 9, "scale": 2}}}}},
                    {"version": 2, "entityTypes": {"P": {"attributes": {"rate": {"attribute": ":p/rate", "type": "decimal",
                                                                                   "precision": 9, "scale": 1}}}}}]), None, refusal=True)
for kind in ("orderKey", "decimalKey", "tdk1Key"):
    probe(f"refuse TDK1 query {kind}", "TDK1 / R-DEC-17", "X-NOT-MODELED refusal",
          case([cmd([asrt("r", "e", ":p/rate", DW("16.50"))])], [{"id": "q", "kind": kind, "value": DW("16.50")}],
               attributeDeclarations=RATE), None, refusal=True)
probe("control: same declaration twice is not evolution", "R-DEC-15 control", "commits (no refusal)",
      case([cmd([asrt("r", "e", ":p/rate", DW("1.00"))])], attributeDeclarations=RATE,
           schemas=[{"version": 1, "entityTypes": {"P": {"attributes": {"rate": {"attribute": ":p/rate", "type": "decimal",
                                                                                   "precision": 9, "scale": 2}}}}}]), committed())


# --------------------------------------------------------------------------- 8. decimal channel routing, value side (Q38d)

probe("DR-KEY-ARITHMETIC", "Q38d DECIMAL_ROUTING", "arithmetic on key strings: preflight E-MIXED-FAMILY",
      expr(["add", S("p0212"), S("p011")]), qerr("E-MIXED-FAMILY"))
probe("DR-JSON-OPAQUE compare", "Q38d / R-CMP-3", "json 1.5 vs decimal 1.5: eq false, lt E-MIXED-FAMILY (never compared as a decimal)",
      case(queries=[{"id": "q", "kind": "compare", "left": J(1.5), "right": D("1.5", 2, 1)}]),
      lambda rep: (res(rep)["eq"] is False and err_is(res(rep)["lt"], "E-MIXED-FAMILY"), res(rep)))
probe("DR-JSON-OPAQUE sum", "Q38d / R-AGG-5", "SUM over a json attribute: E-MIXED-FAMILY",
      case([cmd([asrt("a", "e1", ":x/j", J(1.5)), asrt("b", "e2", ":x/j", J(2.5))])],
           [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"v": ":x/j"}},
             "aggregates": [{"op": "sum", "var": "v", "as": "x"}]}]), qerr("E-MIXED-FAMILY"))
DEC_SCHEMA = [{"version": 1, "entityTypes": {"Pay": {"attributes": {"rate": {"attribute": ":pay/rate", "type": "decimal",
                                                                             "precision": 9, "scale": 6, "cardinality": "one"}}}}}]
RATES = [cmd([asrt(f"r{i}", f"w{i}", ":pay/rate", DW(v), entityType="Pay")
              for i, v in enumerate(("16.5", "16.499999", "-0.5", "-0.55", "12.25"))])]
probe("DR-REPO-ORDER (value order)", "Q38d DR-REPO-ORDER / DO-CMP", "orderBy rate asc: w3 (-0.55), w2 (-0.5), w4 (12.25), w1 (16.499999), w0 (16.5)",
      case(RATES, [{"id": "q", "kind": "find", "entityType": "Pay", "cut": {"validAt": 1}, "orderBy": [{"prop": "rate", "direction": "asc"}]}],
           schemas=DEC_SCHEMA),
      lambda rep: (res(rep)["pages"][0]["ids"] == ["w3", "w2", "w4", "w1", "w0"], res(rep)["pages"][0]["ids"]))
probe("DR-REPO-ORDER range 'at or above 16.50'", "Q38d / RS-FIND-RANGE", "where rate gte 16.50: only w0",
      case(RATES, [{"id": "q", "kind": "find", "entityType": "Pay", "cut": {"validAt": 1},
                    "where": [{"prop": "rate", "op": "gte", "value": DW("16.50")}]}], schemas=DEC_SCHEMA),
      lambda rep: (res(rep)["pages"][0]["ids"] == ["w0"], res(rep)["pages"][0]["ids"]))
probe("DR-AGGREGATE min/max", "Q38d DR-AGGREGATE", "MIN -0.550000, MAX 16.500000 (scale 6)",
      case(RATES, [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"r": ":pay/rate"}},
                    "aggregates": [{"op": "min", "var": "r", "as": "lo"}, {"op": "max", "var": "r", "as": "hi"}]}], schemas=DEC_SCHEMA),
      lambda rep: ((res(rep)["rows"][0]["lo"]["value"], res(rep)["rows"][0]["hi"]["value"]) == ("-0.550000", "16.500000"),
                   res(rep)["rows"]))
probe("DR-JSON-CONVERT valid", "Q38d DR-JSON-CONVERT", "toDecimal(json 1.5, 2, 1) = 1.5",
      expr(["toDecimal", J(1.5), 2, 1]), decval("1.5", 1, 2))
probe("DR-JSON-CONVERT excess fraction", "Q38d DR-JSON-CONVERT", "toDecimal(json 1.55, 2, 1): E-DECIMAL-FRACTION",
      expr(["toDecimal", J(1.55), 2, 1]), qerr("E-DECIMAL-FRACTION"))
probe("DR-JSON-CONVERT non-number", "Q38d DR-JSON-CONVERT", "toDecimal(json 'abc', 2, 1): E-INVALID-VALUE",
      expr(["toDecimal", J("abc"), 2, 1]), qerr("E-INVALID-VALUE"))

# --------------------------------------------------------------------------- checker self-test (--self-test)
# Deliberately wrong expectations: every one must come back WRONG-ANSWER, or the checkers above are too lenient.

if "--self-test" in sys.argv:
    OUT = ROOT / "lab/verify/O02/v-o03/results/probe_035.self-test.json"
    PROBES = []
    probe("ST add value", "self-test", "1.76 (wrong)", expr(["add", D("1.25", 3, 2), D("0.5", 2, 1)]), decval("1.76", 2, 4))
    probe("ST add precision", "self-test", "precision 3 (wrong)", expr(["add", D("1.25", 3, 2), D("0.5", 2, 1)]), decval("1.75", 2, 3))
    probe("ST fraction as overflow", "self-test", "E-DECIMAL-OVERFLOW (wrong id)",
          case([cmd([asrt("r", "e", ":p/rate", DW("16.505"))])], attributeDeclarations=RATE), rejected("E-DECIMAL-OVERFLOW"))
    probe("ST divide half-up as half-even", "self-test", "-0.12 (wrong)", expr(["divide", D("-1.000", 4, 3), I(8), 2, "half-up"]),
          decval("-0.12", 2))
    probe("ST round larger scale", "self-test", "1.5 (wrong scale)", expr(["round", D("1.5", 2, 1), 3, "half-even"]), decval("1.5", 1))
    probe("ST AVG as bare divide", "self-test", "E-DECIMAL-BARE-DIVIDE (wrong id)",
          case([cmd([asrt("a", "e1", ":p/rate", DW("1.25"))])],
               [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"r": ":p/rate"}},
                 "aggregates": [{"op": "avg", "var": "r", "as": "x"}]}], attributeDeclarations=RATE), qerr("E-DECIMAL-BARE-DIVIDE"))
    probe("ST -0 basis as invalid value", "self-test", "E-INVALID-VALUE (wrong id)",
          case([cmd([asrt("a", "e", ":x/s", S("v"))])], [{"id": "q", "kind": "match", "cut": {"validAt": -0.0}}]), qerr("E-INVALID-VALUE"))
    probe("ST abort gap sees 2", "self-test", "2 facts at the gap (wrong)",
          case(THREE[:2], [{"id": "q", "kind": "match", "cut": {"position": {"coordinate": coord(20)}, "validAt": 1}}], **GAP),
          match_count(2))
    probe("ST nested negative passes", "self-test", "PASS (wrong)",
          case(NESTED, [], receipts=[rcpt(0, coord(7, 0)), rcpt(1, coord(7, 2)), rcpt(2, coord(7, 3))]), consistency("PASS"))
    probe("ST erasure answered", "self-test", "a non-refusal check on a refused case must not MATCH",
          case([cmd([asrt("a", "p", ":p/s", S("1"))], 100), cmd([{"op": "erase", "entityId": "p", "attribute": ":p/s"}], 200)]),
          committed(1))
    probe("ST cross-family eq as error", "self-test", "eq E-MIXED-FAMILY for string vs integer (wrong: eq is false)",
          case(queries=[{"id": "q", "kind": "compare", "left": S("a"), "right": I(1)}]),
          lambda rep: (err_is(res(rep)["eq"], "E-MIXED-FAMILY"), res(rep)))

# --------------------------------------------------------------------------- runner


def run(name, the_case):
    WORK.mkdir(parents=True, exist_ok=True)
    p, o = WORK / f"{name}.case.json", WORK / f"{name}.expected.json"
    text = the_case[4:] if isinstance(the_case, str) and the_case.startswith("RAW:") else json.dumps(the_case, indent=1)
    p.write_text(text + "\n")
    if o.exists():
        o.unlink()
    proc = subprocess.run([sys.executable, "-I", str(CLI), str(p), "-o", str(o)], capture_output=True, text=True)
    if proc.returncode == 2:
        return {"refused": proc.stderr.strip(), "outputWritten": o.exists()}
    if proc.returncode not in (0, 1):
        return {"crashed": proc.returncode, "stderr": proc.stderr[-800:]}
    return json.loads(o.read_text())


rows = []
for pid, rule, contract, the_case, check, refusal in PROBES:
    rep = run(re.sub(r"[^A-Za-z0-9]+", "_", pid), the_case)
    if "crashed" in rep:
        verdict, got = "CRASH", rep
    elif refusal:
        msg = rep.get("refused", "")
        verdict = ("MATCH" if msg.split("malformed case: ", 1)[-1].startswith("X-NOT-MODELED") and not rep["outputWritten"]
                   else ("REFUSES-UNTYPED" if msg else "WRONG-ANSWER"))
        got = rep.get("refused") or {"commandOutcomes": rep.get("commandOutcomes"), "queries": rep.get("queries")}
    elif "refused" in rep:
        verdict, got = "REFUSES", rep["refused"]
    else:
        try:
            ok, got = check(rep)
        except Exception as error:  # a probe-side failure must be visible
            ok, got = False, f"probe error {error!r}"
        verdict = "MATCH" if ok else "WRONG-ANSWER"
    rows.append({"probe": pid, "rule": rule, "contract": contract, "verdict": verdict, "oracle": got})

# --------------------------------------------------------------------------- reverse check: error ids

sys.path.insert(0, str(ROOT))
from lab.oracles.replay import errors as OERR  # noqa: E402  (reading the oracle's own table; no Triplex code)

table_diff = []
for eid, (tag, reasons, phase) in OERR.ERROR_TABLE.items():
    row = ERR.get(eid)
    if row is None:
        table_diff.append({"id": eid, "problem": "in the oracle table, not in contract 0.3.5"})
        continue
    want = tuple(row["reason"].split("|")) if "|" in row["reason"] else row["reason"]
    if (tag, reasons, phase) != (row["tag"], want, row["phase"]):
        table_diff.append({"id": eid, "oracle": [tag, reasons, phase], "contract": [row["tag"], want, row["phase"]]})
for eid in ERR:
    if eid not in OERR.ERROR_TABLE:
        table_diff.append({"id": eid, "problem": "in contract 0.3.5, not in the oracle table"})
literals = {}
for f in sorted((ROOT / "lab/oracles/replay").glob("*.py")):
    for m in re.finditer(r"""["']((?:E|X)-[A-Z0-9-]+)["']""", f.read_text()):
        literals.setdefault(m.group(1), set()).add(f.name)
unknown = {k: sorted(v) for k, v in literals.items() if k.startswith("E-") and k not in ERR}
x_ids = {k: sorted(v) for k, v in literals.items() if k.startswith("X-")}
produced_not_in_contract = sorted(set(OERR.PRODUCED) - set(ERR))
reverse = {"tableDifferences": table_diff, "eLiteralsNotInContract": unknown, "xIdsInSource": x_ids,
           "producedNotInContract": produced_not_in_contract,
           "droppedIdsStillInSource": {k: sorted(v) for k, v in literals.items() if k in ("E-DECIMAL-UNREPRESENTABLE",)},
           "retiredXIdsStillInSource": {k: v for k, v in x_ids.items() if k in ("X-READ-LIMIT", "X-INVALID-BASIS")}}

counts = {}
for r in rows:
    counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"contract": C["version"], "counts": counts, "probes": len(rows), "rows": rows,
                           "reverseCheck": reverse}, indent=1, default=str) + "\n")
print(json.dumps(counts), len(rows), "probes")
for r in rows:
    if r["verdict"] != "MATCH":
        print(f"{r['verdict']:14s} {r['probe']:44s} | {r['contract'][:70]} | {json.dumps(r['oracle'], default=str)[:300]}")
print("reverse:", json.dumps(reverse, default=str)[:1500])

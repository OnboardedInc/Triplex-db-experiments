"""V-O02: probe O-REPLAY 0.2.0 on the rules contract 0.3.2/0.3.3 and RULINGS Q22 to Q33 added after the
oracle's target (0.3.1 + Q21). Each probe names the rule, the contract's answer, and classifies the oracle:

  MATCH         the oracle gives the contract's answer
  REFUSES       the oracle declines (malformed-case exit 2, or an X- id): safe, but no expected answer
  WRONG-ANSWER  the oracle gives a confident answer the contract does not

  python3 -I lab/verify/O02/tools/probe_delta_033.py   -> lab/verify/O02/results/probe_delta_033.json
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
CLI = ROOT / "lab/oracles/replay/cli.py"
WORK = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "lab/verify/O02/probe-delta-cases"
OUT = ROOT / "lab/verify/O02/results/probe_delta_033.json"

I = lambda s: {"type": "integer", "value": s}  # noqa: E731
N = lambda x: {"type": "number", "value": x}  # noqa: E731
NB = lambda b: {"type": "number", "bits": b}  # noqa: E731
S = lambda s: {"type": "string", "value": s}  # noqa: E731
B = lambda b: {"type": "boolean", "value": b}  # noqa: E731
D = lambda t, p, s: {"type": "decimal", "value": t, "precision": p, "scale": s}  # noqa: E731
NZ = "0x8000000000000000"
BIG38 = "9" * 38


def base(commands=(), queries=(), **extra):
    c = {"format": "triplex-db-2/o-replay-case/1", "caseId": "v-o02/delta", "defaultScope": "s",
         "commands": list(commands), "queries": list(queries)}
    c.update(extra)
    return c


def cmd(ops, clock=100):
    return {"clock": clock, "meta": {"commandId": f"c{clock}"}, "operations": ops}


def asrt(ref, e, a, v):
    return {"op": "assert", "ref": ref, "entityId": e, "attribute": a, "value": v, "validFrom": 0}


def expr(e):
    return base(queries=[{"id": "q", "kind": "expr", "expr": e}])


def cmp(left, right):
    return base(queries=[{"id": "q", "kind": "compare", "left": left, "right": right}])


# id, rule, contract answer, case, where ('q' query result or 'c0' first command outcome), matcher
PROBES = [
    ("Q30a json -0", "WR-JSON / E-INEXACT-JSON-NUMBER", "command rejected: InvalidTripleError / invalid-value, detail inexact-json-number",
     base([cmd([asrt("j", "e", ":x/j", {"type": "json", "value": {"a": -0.0}})])]), "c0", ("rejected", "InvalidTripleError", "invalid-value")),
    ("Q30a json nested list -0", "WR-JSON (recursive in List)", "command rejected: E-INEXACT-JSON-NUMBER",
     base([cmd([asrt("j", "e", ":x/j", {"type": "json", "value": [1, [-0.0]]})])]), "c0", ("rejected", "InvalidTripleError", "invalid-value")),
    ("Q30a json inexact number", "WR-JSON / Q33a", "command rejected: E-INEXACT-JSON-NUMBER (9007199254740993 does not read back)",
     base([cmd([asrt("j", "e", ":x/j", {"type": "json", "value": {"a": 9007199254740993}})])]), "c0", ("rejected", "InvalidTripleError", "invalid-value")),
    ("Q30b datetime -0", "WR-INSTANT / E-NEGATIVE-ZERO-INSTANT", "command rejected: InvalidTripleError / invalid-value, detail no-negative-zero",
     base([cmd([asrt("t", "e", ":x/t", {"type": "datetime", "value": -0.0})])]), "c0", ("rejected", "InvalidTripleError", "invalid-value")),
    ("Q22 DO-ADD beyond 38 digits", "DO-ADD / E-DECIMAL-OVERFLOW", "E-DECIMAL-OVERFLOW",
     expr(["add", D(BIG38, 38, 0), D(BIG38, 38, 0)]), "q", "E-DECIMAL-OVERFLOW"),
    ("Q22 DO-MUL beyond 38 digits", "DO-MUL / E-DECIMAL-OVERFLOW", "E-DECIMAL-OVERFLOW",
     expr(["mul", D(BIG38, 38, 0), D("10", 2, 0)]), "q", "E-DECIMAL-OVERFLOW"),
    ("Q22 DO-BARE-DIV", "DO-BARE-DIV / E-DECIMAL-BARE-DIVIDE", "preflight E-DECIMAL-BARE-DIVIDE",
     expr(["div", D("1.00", 3, 2), D("3.00", 3, 2)]), "q", "E-DECIMAL-BARE-DIVIDE"),
    ("Q22 DC-D2I fraction", "DC-D2I / E-DECIMAL-FRACTION", "E-DECIMAL-FRACTION",
     expr(["to-int64", D("1.50", 3, 2)]), "q", "E-DECIMAL-FRACTION"),
    ("Q22 DO-SUM beyond 38 digits", "DO-SUM / E-DECIMAL-OVERFLOW", "E-DECIMAL-OVERFLOW",
     base([cmd([asrt("a", "e1", ":x/d", {"type": "decimal", "value": BIG38}),
                asrt("b", "e2", ":x/d", {"type": "decimal", "value": BIG38})])],
          [{"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"d": ":x/d"}},
            "aggregates": [{"op": "sum", "var": "d", "as": "s"}]}],
          attributeDeclarations={":x/d": {"type": "decimal", "precision": 38, "scale": 0}}), "q", "E-DECIMAL-OVERFLOW"),
    ("Q22 DO-CMP 1.50 = 1.5", "DO-CMP", "eq true",
     cmp(D("1.50", 3, 2), D("1.5", 2, 1)), "q", ("eq", True)),
    ("Q22 CMP-DECIMAL-CROSS eq", "CMP-DECIMAL-CROSS", "preflight E-MIXED-FAMILY, equality included",
     cmp(D("1", 1, 0), I("1")), "q", ("eq", "E-MIXED-FAMILY")),
    ("Q33d string < integer", "Q33d R-CMP-3", "lt is preflight E-MIXED-FAMILY", cmp(S("a"), I("1")), "q", ("lt", "E-MIXED-FAMILY")),
    ("Q33d boolean < integer", "Q33d R-CMP-3", "lt is preflight E-MIXED-FAMILY", cmp(B(True), I("1")), "q", ("lt", "E-MIXED-FAMILY")),
    ("Q33e rem binary64", "Q33e R-NUM-8", "a binary64 operand of rem is a preflight error", expr(["rem", N(1.5), N(1.0)]), "q",
     "preflight-error"),
    ("Q33g transactions limit 0", "Q33g R-JNL-7", "PaginationCursorError / malformed",
     base([cmd([asrt("a", "e", ":x/s", S("x"))])], [{"id": "q", "kind": "transactions", "after": 0, "limit": 0}]), "q",
     ("PaginationCursorError", "malformed")),
    ("Q33h negative validAt", "Q33h R-CUT-3", "E-INVALID-VALUE (InvalidTripleError / invalid-value)",
     base([cmd([asrt("a", "e", ":x/s", S("x"))])], [{"id": "q", "kind": "match", "cut": {"validAt": -1}}]), "q",
     ("InvalidTripleError", "invalid-value")),
    ("Q31c non-dense receipt positions", "Q31c POSITION", "receipts at positions 1 and 3 are consistent (coordinates need not be dense)",
     base([cmd([asrt("a", "e", ":x/s", S("x"))], 100), cmd([asrt("b", "e", ":x/t", S("y"))], 200)], [],
          receipts=[{"command": 0, "outcome": "committed", "txId": "t1", "position": 1, "instant": 100, "assertionIds": ["i1"]},
                    {"command": 1, "outcome": "committed", "txId": "t2", "position": 3, "instant": 200, "assertionIds": ["i2"]}]),
     "receipts", "PASS"),
    ("Q33c retract-pattern out of qlever range", "Q33c R-LANE-2", "E-VALUE-OUT-OF-RANGE on qlever",
     base([cmd([{"op": "retract-pattern", "pattern": {"attribute": ":x/i", "value": I("576460752303423488")}}])], [], lane="qlever"),
     "c0", ("rejected", "InvalidTripleError", "value-out-of-range")),
    ("Q33i G1-I64-02 min-exact on qlever", "Q31j / Q33i", "E-VALUE-OUT-OF-RANGE on qlever, commit on xtdb",
     base([cmd([asrt("m", "n:bad-min", ":n/v", I("-9223372036854775808"))])], [], lane="qlever"), "c0",
     ("rejected", "InvalidTripleError", "value-out-of-range")),
    ("Q24 erasure command", "Q24 ERASURE / TARGETS 7", "the erasure commits; later reads return ErasedValue {erasedAt}",
     base([cmd([asrt("p", "person:1", ":person/ssn", S("123"))], 100),
           cmd([{"op": "erase", "entityId": "person:1", "attribute": ":person/ssn"}], 200)]), "c1", ("committed",)),
]


def run(name, case):
    WORK.mkdir(parents=True, exist_ok=True)
    p, o = WORK / f"{name}.case.json", WORK / f"{name}.expected.json"
    p.write_text(json.dumps(case, indent=1) + "\n")
    proc = subprocess.run([sys.executable, "-I", str(CLI), str(p), "-o", str(o)], capture_output=True, text=True)
    if proc.returncode == 2:
        return {"malformed": proc.stderr.strip()}
    return json.loads(o.read_text())


def classify(where, want, rep):
    if "malformed" in rep:
        return "REFUSES", rep["malformed"]
    if where == "receipts":
        got = rep["receiptConsistency"]
        return ("MATCH" if got["status"] == want else "WRONG-ANSWER"), got
    if where == "c1":
        got = rep["commandOutcomes"][1]["expected"]
        return ("MATCH" if got.get("outcome") == want[0] else "WRONG-ANSWER"), got
    if where == "c0":
        got = rep["commandOutcomes"][0]["expected"]
        if isinstance(want, tuple):
            ok = got.get("outcome") == want[0] and got.get("errorTag") == want[1] and \
                (len(want) < 3 or got.get("reason") == want[2])
            return ("MATCH" if ok else "WRONG-ANSWER"), got
    q = rep["queries"][0]
    node = q.get("error") or q.get("result")
    if isinstance(node, dict) and str(node.get("error", "")).startswith("X-"):
        return "REFUSES", node
    if isinstance(want, str) and want.startswith("E-"):
        return ("MATCH" if q.get("error", {}).get("error") == want else "WRONG-ANSWER"), node
    if want == "preflight-error":
        e = q.get("error") or {}
        return ("MATCH" if e.get("phase") == "preflight" else "WRONG-ANSWER"), node
    if isinstance(want, tuple) and want[0] in ("eq", "lt"):
        v = (q.get("result") or {}).get(want[0])
        ok = v == want[1] if not isinstance(want[1], str) else isinstance(v, dict) and v.get("error") == want[1]
        return ("MATCH" if ok else "WRONG-ANSWER"), node
    if isinstance(want, tuple):
        e = q.get("error") or {}
        return ("MATCH" if (e.get("_tag"), e.get("reason")) == want else "WRONG-ANSWER"), node
    raise AssertionError(want)


rows = []
for pid, rule, contract, case, where, want in PROBES:
    rep = run("".join(c if c.isalnum() else "_" for c in pid), case)
    verdict, got = classify(where, want, rep)
    rows.append({"probe": pid, "rule": rule, "contract": contract, "verdict": verdict, "oracle": got})
counts = {}
for r in rows:
    counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
OUT.write_text(json.dumps({"counts": counts, "rows": rows}, indent=1, default=str) + "\n")
print(json.dumps(counts))
for r in rows:
    print(f"{r['verdict']:12s} {r['probe']:38s} | {r['contract'][:60]:60s} | {json.dumps(r['oracle'], default=str)[:200]}")

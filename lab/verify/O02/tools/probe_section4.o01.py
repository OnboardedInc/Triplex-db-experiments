"""Probe O-REPLAY against the frozen semantic tables of ACCEPTANCE 0.2.0 section 4 and
RULINGS Q14a-Q14d (written after the oracle was built against contract 0.1.0-draft).
Each probe states the contract row, the contract's answer, and the oracle's answer.

  python3 -I lab/verify/O01/probe_section4.py   -> lab/verify/O01/probe_section4.json
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CLI = ROOT / "lab/oracles/replay/cli.py"
OUT = Path(__file__).resolve().parent

I = lambda s: {"type": "integer", "value": s}          # noqa: E731
N = lambda x: {"type": "number", "value": x}           # noqa: E731
NB = lambda b: {"type": "number", "bits": b}           # noqa: E731
S = lambda s: {"type": "string", "value": s}           # noqa: E731
B = lambda b: {"type": "boolean", "value": b}          # noqa: E731

PROBES = [
    # id, contract row, oracle query, contract expectation (text)
    ("N-I-DIV 7/2", "4.1 N-I-DIV", {"kind": "expr", "expr": ["div", I("7"), I("2")]}, "3"),
    ("N-I-DIV -7/2", "4.1 N-I-DIV", {"kind": "expr", "expr": ["div", I("-7"), I("2")]}, "-3"),
    ("N-I-DIV -2^63/-1", "4.1 N-I-DIV", {"kind": "expr", "expr": ["div", I("-9223372036854775808"), I("-1")]},
     "E-INTEGER-OVERFLOW (QueryError/integer-overflow)"),
    ("N-I-REM 7%3", "4.1 N-I-REM", {"kind": "expr", "expr": ["rem", I("7"), I("3")]}, "1"),
    ("N-MIXED int+number", "4.1 N-MIXED", {"kind": "expr", "expr": ["add", I("1"), N(1.5)]},
     "E-MIXED-FAMILY (DatalogValidationError/mixed-family, preflight)"),
    ("N-F-ARITH 0.1+0.2", "4.1 N-F-ARITH", {"kind": "expr", "expr": ["add", N(0.1), N(0.2)]}, "0.30000000000000004"),
    ("N-F-ARITH max*2", "4.1 N-F-ARITH", {"kind": "expr", "expr": ["mul", N(1.7976931348623157e308), N(2.0)]},
     "E-NUMBER-OVERFLOW"),
    ("N-F-ARITH 1/-0", "4.1 N-F-ARITH", {"kind": "expr", "expr": ["div", N(1.0), NB("0x8000000000000000")]},
     "E-DIVISION-BY-ZERO"),
    ("N-F-NEGZERO -0+0", "4.1 N-F-NEGZERO", {"kind": "expr", "expr": ["add", NB("0x8000000000000000"), N(0.0)]}, "+0.0"),
    ("N-F-NEGZERO -0-0", "4.1 N-F-NEGZERO", {"kind": "expr", "expr": ["sub", NB("0x8000000000000000"), N(0.0)]}, "-0.0"),
    ("N-F-NEGZERO 0*-1", "4.1 N-F-NEGZERO", {"kind": "expr", "expr": ["mul", N(0.0), N(-1.0)]}, "-0.0"),
    ("CV-I2F toNumber(2^53+1)", "4.2 CV-I2F", {"kind": "expr", "expr": ["to-number", I("9007199254740993")]},
     "9007199254740992.0"),
    ("CV-F2I toInt64(3.5)", "4.2 CV-F2I", {"kind": "expr", "expr": ["to-int64", N(3.5)]}, "E-INVALID-CONVERSION"),
    ("CV-T2I '01'", "4.2 CV-T2I", {"kind": "expr", "expr": ["cast-int64", S("01")]}, "E-INVALID-CONVERSION"),
    ("CV-T2I '+1'", "4.2 CV-T2I", {"kind": "expr", "expr": ["cast-int64", S("+1")]}, "E-INVALID-CONVERSION"),
    ("CV-T2I '-0'", "4.2 CV-T2I", {"kind": "expr", "expr": ["cast-int64", S("-0")]}, "E-INVALID-CONVERSION"),
    ("CV-T2I 'abc'", "4.2 CV-T2I", {"kind": "expr", "expr": ["cast-int64", S("abc")]},
     "E-INVALID-CONVERSION (QueryError/invalid-conversion)"),
    ("CMP-NEGZERO -0 vs +0", "4.3 CMP-NEGZERO; Q14b",
     {"kind": "compare", "left": NB("0x8000000000000000"), "right": N(0.0)}, "eq true and sameGroup true"),
    ("CMP-INT-FLOAT int 1 < number 2", "4.3 CMP-INT-FLOAT; Q14d", {"kind": "compare", "left": I("1"), "right": N(2.0)},
     "preflight E-MIXED-FAMILY for lt/gt; eq false; never one group"),
    ("4.5 family order", "4.5; Q14a", {"kind": "sortValues", "values": [I("1"), B(True), N(0.5), S("a")]},
     "boolean < integer < number < string"),
    ("AG-SUM-F [1e16,1,-1e16]", "4.4 AG-SUM-F", None, "1.0"),
    ("CMP-NEGZERO card-one {-0,+0}", "4.3 CMP-NEGZERO; Q14b; C5", None,
     "one value (not ConflictingValuesError); reported representation per Q14b/CMP-NEGZERO"),
    ("CMP-NEGZERO group by", "4.3 CMP-NEGZERO", None, "one group"),
]


def run(case, name):
    p = OUT / "cases" / f"probe-{name}.case.json"
    o = OUT / "runs" / f"probe-{name}.expected.json"
    p.parent.mkdir(exist_ok=True)
    o.parent.mkdir(exist_ok=True)
    p.write_text(json.dumps(case, indent=1) + "\n")
    proc = subprocess.run([sys.executable, "-I", str(CLI), str(p), "-o", str(o)], capture_output=True, text=True)
    if proc.returncode == 2:
        return {"malformed": proc.stderr.strip()}
    return {q["id"]: q.get("result", q.get("error")) for q in json.loads(o.read_text())["queries"]}


def main():
    queries = []
    for pid, row, q, _ in PROBES:
        if q is not None:
            queries.append(dict(q, id=pid))
    base = {"format": "triplex-db-2/o-replay-case/1", "caseId": "probe/section4", "defaultScope": "s", "commands": []}
    results = {}
    for q in queries:   # one case per probe so a malformed probe (unknown op) does not hide the others
        r = run(dict(base, queries=[q]), "".join(c if c.isalnum() else "_" for c in q["id"]))
        results[q["id"]] = r.get(q["id"], r)
    # data probes
    cmd = lambda ops: {"clock": 100, "meta": {"commandId": "c"}, "operations": ops}  # noqa: E731
    sumcase = dict(base, commands=[cmd([
        {"op": "assert", "ref": "a", "entityId": "e1", "attribute": ":x", "value": N(1e16), "validFrom": 0},
        {"op": "assert", "ref": "b", "entityId": "e2", "attribute": ":x", "value": N(1.0), "validFrom": 0},
        {"op": "assert", "ref": "c", "entityId": "e3", "attribute": ":x", "value": N(-1e16), "validFrom": 0}])],
        queries=[{"id": "q", "kind": "aggregate", "cut": {"validAt": 1}, "match": {"attributes": {"x": ":x"}},
                  "aggregates": [{"op": "sum", "var": "x", "as": "s"}]}])
    results["AG-SUM-F [1e16,1,-1e16]"] = run(sumcase, "agsumf")["q"]
    nz = dict(base, schemas=[{"version": 1, "entityTypes": {"T": {"attributes": {
        "n": {"attribute": ":t/n", "type": "number", "cardinality": "one"}}}}}],
        commands=[cmd([
            {"op": "assert", "ref": "z1", "entityId": "t:1", "entityType": "T", "attribute": ":t/n",
             "value": NB("0x8000000000000000"), "validFrom": 0},
            {"op": "assert", "ref": "z2", "entityId": "t:1", "entityType": "T", "attribute": ":t/n", "value": N(0.0),
             "validFrom": 0},
            {"op": "assert", "ref": "g1", "entityId": "t:1", "attribute": ":t/v", "value": I("1"), "validFrom": 0}])],
        queries=[{"id": "get", "kind": "get", "entityType": "T", "entityId": "t:1", "cut": {"validAt": 1}},
                 {"id": "grp", "kind": "aggregate", "cut": {"validAt": 1},
                  "match": {"attributes": {"n": ":t/n", "v": ":t/v"}}, "groupBy": ["n"],
                  "aggregates": [{"op": "count", "var": "v", "as": "c"}]}])
    r = run(nz, "negzero")
    results["CMP-NEGZERO card-one {-0,+0}"] = r["get"]
    results["CMP-NEGZERO group by"] = r["grp"]
    out = [{"probe": pid, "contractRow": row, "contract": exp, "oracle": results.get(pid)} for pid, row, _, exp in PROBES]
    (OUT / "probe_section4.json").write_text(json.dumps(out, indent=1) + "\n")
    for o in out:
        print(o["probe"], "|", o["contract"], "|", json.dumps(o["oracle"])[:260])


if __name__ == "__main__":
    main()

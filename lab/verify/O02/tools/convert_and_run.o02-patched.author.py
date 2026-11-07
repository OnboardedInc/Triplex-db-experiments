"""V-O01: convert every EXP-G01 golden vector into O-REPLAY cases, run the oracle as a
black box (subprocess, `python3 -I cli.py`), and compare its answers with the
hand-derived expectations.

Verdict per golden query / command expectation:
  AGREE         oracle answer equals the golden expectation after rendering
  DISAGREE      both give an answer and they differ (detail recorded)
  AMBIGUOUS     the golden vector marks it AMB-nn; the reading the oracle took is recorded
  NOT-MODELED   the oracle has no query kind for this surface (coverage gap, recorded)

Neither source is edited. Converter assumptions are listed in ASSUMPTIONS and
written into the result file.

Usage: python3 -I lab/verify/O01/convert_and_run.py
"""

from __future__ import annotations

import json
import os
import re
import struct
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
GOLD = ROOT / "lab/acceptance/golden"
CLI = ROOT / "lab/oracles/replay/cli.py"
OUT = Path(__file__).resolve().parent
if len(sys.argv) == 3 and sys.argv[1] == "--negative-control":
    # comparator control: run against a mutated copy of the vectors in a scratch directory
    GOLD = Path(sys.argv[2])
    OUT = GOLD / "out"
CASES = OUT / "cases"
RUNS = OUT / "runs"

V_DEFAULT = 1e15  # validAt for golden reads that omit V (reader clock "now"); above every fixture instant

ASSUMPTIONS = [
    "Expected-only mode: assertion ids = golden labels, txIds = tx:<command index>, positions = oracle's dense positions; "
    "$id/$tx/$pos symbols are mapped through a first-pass cutCatalog.",
    "Golden reads without validAt use V = 1e15 (reader clock 'now', after every fixture instant).",
    "The implicit ConfigStore release C0 of EP-REPO vectors is omitted (positions are symbolic in those vectors).",
    "tiny-v4: config releases C1/C4 are internal commands (positions 1 and 4); every domain command enforces "
    "Required(:capacity/label) for CapacityEntity (the vector gives only 'all persisted rules of that release'); "
    "the repository schema is derived from the fixture's value families.",
    "Golden 'native history relation' = oracle history.asOfSnapshot (known-at-cut); 'native facts relation' = oracle "
    "match.snapshot (live-at-valid); repository timeline = oracle assertionSnapshot known-at-valid.",
    "Repository count(...) = oracle find total; find items = find pages[*].entities rendered as golden documents.",
    "Journal facts (:_tx/change, :_tx/changed-entity) have no oracle query; Q11-Q13 of C6-01 are compared against "
    "the oracle's transaction record (changes, changedEntities) and labelled AGREE-DERIVED.",
    "Number values are compared by IEEE binary64 bit pattern; int64 by decimal text; strings by codepoints.",
]


# --------------------------------------------------------------------------- exact helpers


def bits(x) -> int:
    return struct.unpack(">Q", struct.pack(">d", float(x)))[0]


def num(x):
    return ("num", bits(x))


def norm_typed(v):
    """Typed value (golden or oracle) -> comparable key."""
    if v is None:
        return None
    t = v["type"]
    if t in ("number", "datetime"):
        if "bits" in v:
            b = v["bits"]
            b = int(b, 16) if isinstance(b, str) else b
            return (t, b)
        return (t, bits(v["value"]))
    if t == "json":
        return (t, v.get("canonical", json.dumps(v["value"], sort_keys=True, separators=(",", ":"))))
    if t == "blob":
        return (t, v["value"], v.get("mimeType"), bits(v["size"]), v.get("filename"))
    return (t, v["value"])


def norm_plain(x):
    """Golden plain JSON (documents, coordinates) -> comparable form."""
    if isinstance(x, bool) or x is None or isinstance(x, str):
        return x
    if isinstance(x, (int, float)):
        return num(x)
    if isinstance(x, list):
        return [norm_plain(i) for i in x]
    if isinstance(x, dict):
        if set(x) == {"value", "bits"}:
            return ("num", int(x["bits"], 16))
        if set(x) == {"type", "value"} and x["type"] == "integer":
            return ("int64", x["value"])
        return {k: norm_plain(v) for k, v in x.items()}
    raise TypeError(x)


# --------------------------------------------------------------------------- golden -> case


def gvalue(v):
    """Golden TripleValue -> oracle case value; drops reading aids, uses bits when given."""
    v = dict(v)
    v.pop("codepoints", None)
    if v.get("type") == "number" and "bits" in v:
        b = v.pop("bits")
        if "value" in v and bits(v["value"]) != int(b, 16):
            raise SystemExit(f"golden value/bits mismatch {v} {b}")
        v.pop("value", None)
        v["bits"] = "0x" + b
    return v


SCHEMA_TYPES = {"text": "string", "int64": "integer", "number": "number", "boolean": "boolean",
                "string": "string", "integer": "integer", "ref": "ref", "datetime": "datetime"}


def golden_schema(spec):
    if not spec or "entityTypes" not in spec:
        return None
    types = {}
    for et in spec["entityTypes"]:
        attrs = {}
        for a in et["attributes"]:
            attrs[a["name"]] = {"attribute": a["key"], "type": SCHEMA_TYPES[a["type"]],
                                "cardinality": a.get("cardinality", "one"), "required": a.get("required", False)}
        types[et["key"]] = {"attributes": attrs}
    return {"version": 1, "entityTypes": types}


class Vec:
    """One golden vector being converted."""

    def __init__(self, file, vec, shared):
        self.file, self.vec, self.shared = file, vec, shared
        self.id = vec["id"]
        self.commands = []        # oracle commands
        self.cmd_index = {}       # golden command id -> oracle command index
        self.golden_cmds = []     # (golden command, oracle index or None)
        self.rules = dict((shared.get("sharedSchema") or {}).get("rules") or {})
        self.rules.update(vec.get("rules") or {})
        sch = vec.get("schema")
        if sch is not None and sch == (shared.get("sharedSchema") or {}).get("id"):
            sch = shared["sharedSchema"]
        self.schema = golden_schema(sch) if isinstance(sch, dict) else None
        self.catalog = None       # filled after pass 1
        self.labels = set()

    # symbols
    def pos(self, cid):
        return self.catalog_by_cmd[self.cmd_index[cid]]["position"]

    def tx(self, cid):
        return self.catalog_by_cmd[self.cmd_index[cid]]["txId"]

    def sym(self, x):
        """Resolve $id/$tx/$pos symbols inside a golden expectation."""
        if isinstance(x, str):
            m = re.fullmatch(r"\$id:(.+)", x)
            if m:
                return m.group(1)
            m = re.fullmatch(r"\$tx:(\w+)", x)
            if m:
                return self.tx(m.group(1))
            m = re.fullmatch(r"\$pos:(\w+)", x)
            if m:
                return self.pos(m.group(1))
            m = re.fullmatch(r"\$int64:(-?\d+)", x)
            if m:
                return {"type": "integer", "value": m.group(1)}
            return x
        if isinstance(x, list):
            return [self.sym(i) for i in x]
        if isinstance(x, dict):
            return {k: self.sym(v) for k, v in x.items()}
        return x

    def add_command(self, gc, ops=None, meta=None, internal=False, scope=None):
        idx = len(self.commands)
        if internal:
            c = {"kind": "internal", "clock": gc["instant"], "operations": [], "expectedOutcome": "committed"}
        else:
            c = {"clock": gc["instant"], "operations": ops if ops is not None else self.ops(gc["ops"]),
                 "meta": meta if meta is not None else self.meta(gc.get("meta") or {})}
        self.commands.append(c)
        if gc.get("id"):
            self.cmd_index[gc["id"]] = idx
        self.golden_cmds.append((gc, idx))
        return idx

    def ops(self, gops):
        out = []
        for op in gops:
            if op["op"] == "assert":
                o = {"op": "assert", "ref": op["label"], "entityId": op["entityId"], "attribute": op["attribute"],
                     "value": gvalue(op["value"])}
                self.labels.add(op["label"])
                for k in ("entityType", "validFrom", "validTo", "createdBy"):
                    if k in op and op[k] is not None:
                        o[k] = op[k]
                out.append(o)
            elif op["op"] == "retract":
                out.append({"op": "retract", "target": re.fullmatch(r"\$id:(.+)", op["id"]).group(1)})
            elif op["op"] == "retract-pattern":
                p = dict(op["pattern"])
                if "value" in p:
                    p["value"] = gvalue(p["value"])
                out.append({"op": "retract-pattern", "pattern": p})
            else:
                raise SystemExit(f"unknown op {op}")
        return out

    def meta(self, gm):
        m = {k: gm[k] for k in ("actor", "commandId", "correlationId", "causationId", "configSnapshot") if k in gm}
        enf = gm.get("enforce")
        if isinstance(enf, dict) and enf.get("constraints"):
            rules = []
            for r in enf["constraints"]:
                rules.append(self.rules[r[1:]] if isinstance(r, str) and r.startswith("@") else r)
            m["enforce"] = {"constraints": rules}
        return m

    def cut(self, basis):
        """Golden basis -> oracle cut."""
        c = {}
        basis = basis or {}
        if "P" in basis:
            m = re.fullmatch(r"\$pos:(\w+)", str(basis["P"]))
            c["position"] = {"afterCommand": self.cmd_index[m.group(1)]} if m else basis["P"]
        if basis.get("recordedAt") is not None:
            c["recordedAt"] = basis["recordedAt"]
        c["validAt"] = basis["validAt"] if basis.get("validAt") is not None else V_DEFAULT
        return c

    def case(self, queries):
        case = {"format": "triplex-db-2/o-replay-case/1", "caseId": f"golden/{self.id}", "defaultScope": "fresh",
                "commands": self.commands, "queries": queries + [{"id": "__catalog", "kind": "cutCatalog"},
                                                                  {"id": "__assertions", "kind": "assertions"}]}
        if self.schema:
            case["schemas"] = [self.schema]
        return case


# --------------------------------------------------------------------------- running


def run_case(name, case):
    CASES.mkdir(parents=True, exist_ok=True)
    RUNS.mkdir(parents=True, exist_ok=True)
    cpath = CASES / f"{name}.case.json"
    opath = RUNS / f"{name}.expected.json"
    cpath.write_text(json.dumps(case, indent=1, ensure_ascii=True) + "\n")
    lane = os.environ.get("O02_LANE")
    proc = subprocess.run([sys.executable, "-I", str(CLI), str(cpath), "-o", str(opath)] +
                          (["--lane", lane] if lane else []), capture_output=True, text=True)
    if proc.returncode not in (0, 1):
        raise SystemExit(f"oracle failed on {name}: {proc.returncode} {proc.stderr}")
    return json.loads(opath.read_text())


def answers(report):
    return {q["id"]: q for q in report["queries"]}


# --------------------------------------------------------------------------- result rendering


def row_ids(rows):
    return sorted(r["id"] for r in rows)


TRIPLE_FIELDS = ("id", "entityId", "attribute", "value", "recordedAt", "validFrom", "validTo", "createdBy",
                 "retractedAt", "entityType", "txId", "retractTxId", "recordedPosition", "retractedPosition")


def norm_row(row, fields):
    out = {}
    for f in fields:
        v = row.get(f)
        if f == "value":
            out[f] = norm_typed(v) if isinstance(v, dict) else norm_plain(v)
        elif isinstance(v, (int, float)) and not isinstance(v, bool):
            out[f] = num(v)
        else:
            out[f] = v
    return out


def doc_from_model(model, schema_props):
    """Oracle entity model -> golden repository document (R3 sketch shape)."""
    if model is None:
        return None
    doc = {"$id": model["entityId"]}
    props = model["properties"]
    for name, p in schema_props.items():
        cur = props.get(name)
        if p["cardinality"] == "many":
            doc[name] = [model_value(x["value"]) for x in cur["values"]] if cur else []
        elif cur is not None:
            if "value" in cur:
                doc[name] = model_value(cur["value"])
            else:
                doc[name] = {"$conflict": [model_value(x["value"]) for x in cur["conflict"]]}
    return doc


def model_value(v):
    t = v["type"]
    if t in ("string", "ref"):
        return v["value"]
    if t == "boolean":
        return v["value"]
    if t == "integer":
        return ("int64", v["value"])
    if t in ("number", "datetime"):
        return ("num", int(v["bits"], 16))
    return norm_typed(v)


def conflict_set(err):
    return sorted((c["entityId"], c["attribute"]) for c in err.get("conflicts", []))


# --------------------------------------------------------------------------- JS-ish call parsing


def js(text):
    """Parse a JS object/array literal from a golden `call` string into JSON."""
    out, i = [], 0
    while i < len(text):
        ch = text[i]
        if ch == "'":
            j = text.index("'", i + 1)
            out.append(json.dumps(text[i + 1:j]))
            i = j + 1
            continue
        m = re.match(r"\$(?:tx|id|pos):[\w/-]+", text[i:])
        if m:
            out.append(json.dumps(m.group(0)))
            i += len(m.group(0))
            continue
        m = re.match(r"<2\^59-1>", text[i:])
        if m:
            out.append('{"type":"integer","value":"576460752303423487"}')
            i += len(m.group(0))
            continue
        m = re.match(r"([A-Za-z_][\w]*)\s*:", text[i:])
        if m and (not out or out[-1].rstrip()[-1:] in "{,"):
            out.append(json.dumps(m.group(1)) + ":")
            i += len(m.group(0))
            continue
        out.append(ch)
        i += 1
    return json.loads("".join(out))


def split_args(argtext):
    """Split top-level comma-separated arguments."""
    depth, cur, args, quote = 0, "", [], False
    for ch in argtext:
        if ch == "'":
            quote = not quote
        if not quote:
            if ch in "{[(":
                depth += 1
            elif ch in "}])":
                depth -= 1
            elif ch == "," and depth == 0:
                args.append(cur.strip())
                cur = ""
                continue
        cur += ch
    if cur.strip():
        args.append(cur.strip())
    return args


def call_args(call, name):
    i = call.index(name + "(") + len(name) + 1
    depth, j = 1, i
    while depth:
        if call[j] == "(":
            depth += 1
        elif call[j] == ")":
            depth -= 1
        j += 1
    return split_args(call[i:j - 1])


def basis_of(q, call, argpos=None):
    if "basis" in q and q["basis"] is not None:
        return q["basis"]
    m = re.search(r"\.at\((\{.*?\})\)", call)
    if m:
        return js(m.group(1))
    return {}


def where_items(where):
    items = []
    for prop, cond in where.items():
        if isinstance(cond, dict) and "exists" in cond:
            items.append({"prop": prop, "op": "exists" if cond["exists"] else "missing"})
        elif isinstance(cond, dict) and "type" in cond:
            items.append({"prop": prop, "op": "eq", "value": gvalue(cond)})
        elif isinstance(cond, dict):
            (op, val), = cond.items()
            items.append({"prop": prop, "op": op, "value": val if isinstance(val, dict) else
                          {"type": "number", "value": val}})
        elif isinstance(cond, str):
            items.append({"prop": prop, "op": "eq", "value": {"type": "string", "value": cond}})
        elif isinstance(cond, bool):
            items.append({"prop": prop, "op": "eq", "value": {"type": "boolean", "value": cond}})
        else:
            items.append({"prop": prop, "op": "eq", "value": {"type": "number", "value": cond}})
    return items


# --------------------------------------------------------------------------- comparison results


class Result:
    def __init__(self):
        self.rows = []

    def add(self, vec, item, verdict, **detail):
        self.rows.append(dict(vector=vec.id if hasattr(vec, "id") else vec, item=item, verdict=verdict, **detail))


def same(a, b):
    return json.dumps(a, sort_keys=True, default=str) == json.dumps(b, sort_keys=True, default=str)


def multiset(xs):
    return sorted(json.dumps(x, sort_keys=True, default=str) for x in xs)


def gvalue_render(v):
    v = dict(v)
    v.pop("codepoints", None)
    if v.get("type") == "number" and "bits" in v:
        return {"type": "number", "bits": v["bits"]}
    return v


class Q:
    """One golden query translated to oracle queries."""

    def __init__(self, vec, q):
        self.vec, self.q = vec, q
        self.oq = []
        self.not_modeled = None

    def add(self, query):
        query["id"] = f"{self.q.get('id') or 'q'}#{len(self.oq)}"
        self.oq.append(query)
        return query["id"]


def amb_readings(q):
    return q.get("readings") or []


def render_rows_expected(vec, exp):
    if isinstance(exp, list) and exp and isinstance(exp[0], str) and exp[0].startswith("@"):
        rows = [vec.sym(vec.vec["renderings"][e[1:]]) for e in exp]
        fields = [f for f in TRIPLE_FIELDS if f in rows[0]]
        return fields, [norm_row(r, fields) for r in rows]
    return None


def columns_expected(vec, columns, rows):
    fields = ["id" if c == "identity" else c for c in columns]
    return fields, [norm_row(dict(zip(fields, vec.sym(r))), fields) for r in rows]


def oracle_rows(rows, fields):
    return [norm_row(r, fields) for r in rows]


AMB_WITH_DECIDED_PART = ("AMB-02", "AMB-05", "AMB-07", "AMB-13")


def translate(vec, q, R):
    """Return (Q, finisher(answers)) or (Q, None) when the surface is not modeled."""
    t = Q(vec, q)
    call = q.get("call") or ""
    qid = q.get("id")
    exp = q.get("expected")
    amb = q.get("ambiguity") if exp == "AMBIGUOUS" else None

    # journal facts through match / queryAll: derived from the record
    if call.startswith("receipt, Triples.match("):          # C6-03 (AMB-06)
        r_m = t.add({"kind": "match", "cut": vec.cut({}), "pattern": {"entityId": "p:1"}})
        r_h = t.add({"kind": "history", "entityId": "p:1"})
        r_t = t.add({"kind": "transaction", "txId": vec.tx("C1") if vec.cmd_index["C1"] in vec.catalog_by_cmd else "none"})

        def finish(ans):
            rec = ans[r_t]["result"]
            got = {"match": row_ids(ans[r_m]["result"]["raw"]),
                   "changes": [{"op": c["op"], "tripleId": c["tripleId"]} for c in (rec or {}).get("changes", [])]}
            info = {}
            for rd in amb_readings(q):
                e = vec.sym(rd["expected"])
                info[rd["id"]] = sorted(e["match"]) == got["match"] and \
                    [{"op": c["op"], "tripleId": c["tripleId"]} for c in e["changes"]] == got["changes"]
            R.add(vec, qid, "AMBIGUOUS", ambiguity=q["ambiguity"], oracle=got, readingsMatched=info)
        return t, finish

    if call.startswith("outcome of C1, then Triples.match("):   # G9-HO-03 (AMB-12)
        rid = t.add({"kind": "match", "cut": {"validAt": 10}, "pattern": {"attribute": ":iv/z"}})

        def finish(ans):
            committed = vec.cmd_index["C1"] in vec.catalog_by_cmd
            got = {"C1": "committed" if committed else "rejected", "match": row_ids(ans[rid]["result"]["raw"])}
            info = {"A-accept-never-visible": committed and not got["match"], "B-reject-invalid-interval": not committed}
            R.add(vec, qid, "AMBIGUOUS", ambiguity=q["ambiguity"], oracle=got, readingsMatched=info)
        return t, finish

    if call.startswith("Triples.match(") and "$tx:" in call and isinstance(exp, dict) and "countUnchanged" in exp:
        t.not_modeled = call + "  [journal facts of $tx:C1 are not an oracle query]"
        return t, None

    if call.startswith("Triples.match(") and "$tx:" in call:
        pat = js(call_args(call, "Triples.match")[0])
        rid = t.add({"kind": "match", "cut": vec.cut({}),   # O02 P5: journal facts are queryable facts
                     "pattern": {"entityId": vec.sym(pat["entityId"]), "attribute": pat["attribute"]}})

        def finish(ans):
            a = ans[rid]
            got = {"count": a["result"]["count"]} if "result" in a else a["error"]
            R.add(vec, qid, "AGREE" if same(got, exp) else "DISAGREE", oracle=got, golden=exp)
        return t, finish

    if call.startswith("Triples.match(") or call.startswith("Triples.entity("):
        fname = "Triples.match" if call.startswith("Triples.match(") else "Triples.entity"
        args = call_args(call, fname)
        pattern = js(args[0]) if fname == "Triples.match" else {"entityId": js(args[0])}
        basis = q.get("basis")
        if basis is None and len(args) > 1 and args[1] != "basis":
            basis = js(args[1])
        basis = basis or {}
        if "value" in pattern:
            pattern["value"] = gvalue(pattern["value"])
        rid = t.add({"kind": "match", "cut": vec.cut(basis), "pattern": pattern})
        return t, (lambda ans: finish_rows(vec, q, R, ans[rid], amb))

    if call.startswith("Triples.queryAll(") and "aggregate" not in call:
        body = call_args(call, "Triples.queryAll")[0]
        basis = q.get("basis") or {}
        m = re.search(r"where: \[\[(.*?)\]\]", body)
        e, a, v = [x.strip() for x in split_args(m.group(1))]
        e = e.strip("'") if e.startswith("'?") else e   # quoted '?var' is a variable
        v = v.strip("'") if v.startswith("'?") else v
        if e.startswith("$tx:"):
            rid = t.add({"kind": "match", "cut": vec.cut({}),   # O02 P5
                         "pattern": {"entityId": vec.sym(e), "attribute": js(a)}})

            def finish(ans):
                got = sorted(r["value"]["value"] for r in ans[rid]["result"]["raw"])
                want = sorted(r["?e"] for r in exp["results"])
                R.add(vec, qid, "AGREE" if got == want else "DISAGREE", oracle=got, golden=want)
            return t, finish
        pattern = {"attribute": js(a)}
        if e.startswith("'"):
            pattern["entityId"] = js(e)
        if v == "true":
            pattern["value"] = {"type": "boolean", "value": True}
        rid = t.add({"kind": "match", "cut": vec.cut(basis), "pattern": pattern})

        def finish(ans):
            res = ans[rid]["result"]
            if e.startswith("?"):
                got = sorted({r["entityId"] for r in res["raw"]})
                want = sorted(r[e] for r in exp["results"])
            else:
                got = sorted({r["value"]["value"] for r in res["raw"]})
                want = sorted(r[v] for r in exp["results"])
            ok = got == want
            if "basis" in exp:
                gb, ob = vec.sym(exp["basis"]), res["cut"]
                ok = ok and gb["recordedPosition"] == ob["position"] and num(gb["recordedAt"]) == num(ob["recordedAt"]) \
                    and num(gb["validAt"]) == num(ob["validAt"])
            R.add(vec, qid, "AGREE" if ok else "DISAGREE", oracle={"values": got, "cut": res["cut"]}, golden=exp)
        return t, finish

    if call.startswith("Triples.history("):
        if "for each of" in call:
            ents = sorted({op["entityId"] for c in vec.commands for op in c.get("operations", []) if "entityId" in op})
            rids = [t.add({"kind": "history", "entityId": x}) for x in ents]

            def finish(ans):
                rows = [r for rid in rids for r in ans[rid]["result"]["rawLifetime"]]
                fields, want = columns_expected(vec, exp["columns"], exp["rows"])
                ok = multiset(oracle_rows(rows, fields)) == multiset(want)
                R.add(vec, qid, "AGREE" if ok else "DISAGREE", rows=[len(rows), len(want)])
            return t, finish
        ent = js(call_args(call, "Triples.history")[0])
        rid = t.add({"kind": "history", "entityId": ent})

        def finish(ans):
            rows = ans[rid]["result"]["rawLifetime"]
            fields, want = columns_expected(vec, q["columns"], exp) if q.get("columns") else render_rows_expected(vec, exp)
            got = oracle_rows(rows, fields)
            ok = multiset(got) == multiset(want)
            R.add(vec, qid, "AGREE" if ok else "DISAGREE", **({} if ok else {"oracle": got, "golden": want}))
        return t, finish

    if call.startswith("Triples.get("):
        def finish(ans):
            rows = {r["id"]: r for r in ans["__assertions"]["result"]["assertions"]}
            if "for every label" in call:
                got = {k: norm_typed(rows[k]["value"]) for k in exp}
                want = {k: norm_typed(gvalue_render(x)) for k, x in exp.items()}
                R.add(vec, qid, "AGREE" if got == want else "DISAGREE", oracle=str(got), golden=str(want))
                return
            label = re.search(r"\$id:([\w/-]+)", call).group(1)
            row = rows[label]
            if call.endswith(".value"):
                ok = norm_typed(row["value"]) == norm_typed(gvalue_render(exp))
                R.add(vec, qid, "AGREE" if ok else "DISAGREE", oracle=row["value"], golden=exp)
            else:
                fields = list(exp.keys())
                ok = norm_row(row, fields) == norm_row(exp, fields)
                R.add(vec, qid, "AGREE" if ok else "DISAGREE", oracle={f: row.get(f) for f in fields}, golden=exp)
        return t, finish

    if call.startswith("values("):
        attr = js(call_args(call, "values")[0])
        rid = t.add({"kind": "valueSupports", "cut": vec.cut(q.get("basis")), "pattern": {"attribute": attr}})

        def finish(ans):
            got = [{"entityId": s["entityId"], "value": norm_typed(s["value"]), "assertionIds": sorted(s["assertionIds"]),
                    "supports": s["count"]} for s in ans[rid]["result"]["supports"]]
            want = [{"entityId": s["entityId"], "value": norm_typed(gvalue_render(s["value"])),
                     "assertionIds": sorted(vec.sym(s["assertionIds"])), "supports": s["supports"]} for s in exp]
            ok = multiset(got) == multiset(want)
            R.add(vec, qid, "AGREE" if ok else "DISAGREE", **({} if ok else {"oracle": got, "golden": want}))
        return t, finish

    if call.startswith("native history relation") or call.startswith("native facts relation"):
        hist = call.startswith("native history")
        basis = q.get("basis")
        m = re.search(r"entity_id = '([^']+)'", call)
        ents = [m.group(1)] if m else sorted({op["entityId"] for c in vec.commands for op in c.get("operations", [])
                                               if "entityId" in op})
        etype = None if m else "CapacityEntity"
        cut = vec.cut(basis)
        if hist:
            rids = [t.add({"kind": "history", "entityId": x, "cut": cut}) for x in ents]
        else:
            rids = [t.add({"kind": "match", "cut": cut, "pattern": {"entityType": etype} if etype else {"entityId": ents[0]}})]

        def finish(ans):
            rows = []
            for rid in rids:
                res = ans[rid]["result"]
                rows += res["asOfSnapshot"] if hist else res["snapshot"]
            if etype:
                rows = [r for r in rows if r["entityType"] == etype]
            if isinstance(exp, dict) and "columns" in exp:
                fields, want = columns_expected(vec, exp["columns"], exp["rows"])
            elif q.get("columns"):
                fields, want = columns_expected(vec, q["columns"], exp)
            else:
                e2 = dict(vec.sym(exp))
                e2["id"] = e2.pop("identity")
                fields = list(e2.keys())
                want = [norm_row(e2, fields)]
                rows = [r for r in rows if r["id"] == e2["id"]]
            got = oracle_rows(rows, fields)
            ok = multiset(got) == multiset(want)
            R.add(vec, qid, "AGREE" if ok else "DISAGREE", **({} if ok else {"oracle": got, "golden": want}))
        return t, finish

    if call.startswith("Repository"):
        return translate_repo(vec, q, R, t, call, amb)

    if call.startswith(("Triples.transaction(", "Triples.transactions(", "Triples.transactionsForEntity(",
                        "Triples.transactionByCommand(")):
        return translate_journal(vec, q, R, t, call)

    if call.startswith("Triples.currentPosition()"):
        def finish(ans):
            got = max([r["position"] for r in ans["__catalog"]["result"]], default=0)
            R.add(vec, qid, "AGREE" if got == vec.sym(exp) else "DISAGREE", oracle=got, golden=vec.sym(exp))
        return t, finish

    if call.startswith(("Triples.entityPage(", "fresh sequence", "historical sequence")):
        return translate_page(vec, q, R, t, call)

    t.not_modeled = call
    return t, None


def finish_rows(vec, q, R, ans, amb):
    qid, exp = q.get("id"), q.get("expected")
    if "error" in ans:
        R.add(vec, qid, "DISAGREE", oracle=ans["error"], golden=exp)
        return
    res = ans["result"]
    raw, snap = res["raw"], res["snapshot"]
    if amb:
        info = {}
        if q.get("expectedMembership"):
            info["membershipAgrees"] = row_ids(raw) == sorted(vec.sym(q["expectedMembership"]))
        if q.get("expectedRowIdentities"):
            info["membershipAgrees"] = row_ids(raw) == sorted(q["expectedRowIdentities"])
        for rd in amb_readings(q):
            if "rows" in rd:
                fields, want = columns_expected(vec, rd["columns"], rd["rows"])
                r_raw, r_snap = raw, snap
            elif "row" in rd:
                r = dict(vec.sym(rd["row"]))
                r["id"] = r.pop("identity")
                fields = list(r.keys())
                want = [norm_row(r, fields)]
                r_raw = [x for x in raw if x["id"] == r["id"]]
                r_snap = [x for x in snap if x["id"] == r["id"]]
            else:
                rr = render_rows_expected(vec, rd["expected"])
                if rr is None:
                    continue
                fields, want = rr
                r_raw, r_snap = raw, snap
            info[rd["id"]] = {"matchesRawContract": multiset(oracle_rows(r_raw, fields)) == multiset(want),
                              "matchesSnapshotContract": multiset(oracle_rows(r_snap, fields)) == multiset(want)}
        R.add(vec, qid, "AMBIGUOUS", ambiguity=amb, oracle=info)
        return
    if isinstance(exp, list) and exp and all(isinstance(x, str) and x.startswith("$id:") for x in exp):
        got, want = row_ids(raw), sorted(vec.sym(exp))
        R.add(vec, qid, "AGREE" if got == want else "DISAGREE", oracle=got, golden=want)
        return
    if exp == []:
        R.add(vec, qid, "AGREE" if not raw else "DISAGREE", oracle=row_ids(raw), golden=[])
        return
    rr = render_rows_expected(vec, exp)
    if rr:
        fields, want = rr
        ok_raw = multiset(oracle_rows(raw, fields)) == multiset(want)
        ok_snap = multiset(oracle_rows(snap, fields)) == multiset(want)
        verdict = "AGREE" if ok_raw else "DISAGREE"   # O02 P8: AMB-01 A, the match contract is the raw lifetime
        R.add(vec, qid, verdict, rawContractAgrees=ok_raw, snapshotContractAgrees=ok_snap)
        return
    if isinstance(exp, dict) and "count" in exp:
        R.add(vec, qid, "AGREE" if len(raw) == exp["count"] else "DISAGREE", oracle=len(raw), golden=exp["count"])
        return
    R.add(vec, qid, "UNCOMPARED", oracle=res, golden=exp)


def gold_error(e):
    return {"error": e["_tag"], "conflicts": sorted((c["entityId"], c["attribute"]) for c in e.get("conflicts", []))}


def oracle_error(err):
    # O02 P1: ACC 4.7 output (error id, _tag, reason)
    if err.get("_tag") == "ConflictingValuesError" or err["error"] == "ConflictingValuesError":
        return {"error": "ConflictingValuesError", "conflicts": conflict_set(err)}
    return {"error": err.get("_tag") or err["error"], "message": err.get("message")}


def translate_repo(vec, q, R, t, call, amb):
    qid, exp = q.get("id"), q.get("expected")
    m = re.match(r"Repository(?:<(\w+)>)?", call)
    etype = m.group(1) or "CapacityEntity"
    basis = q.get("basis") if q.get("basis") is not None else basis_of(q, call)
    cut = vec.cut(basis)
    props = vec.schema["entityTypes"][etype]["attributes"]
    amb_note = {"ambiguity": q["ambiguity"]} if q.get("ambiguity") and not amb else {}

    if ".timeline(" in call:
        ent = js(call_args(call, ".timeline")[0])
        names = [n for n in re.findall(r"'(\w+)'\)", call) if n in props]
        rids = {n: t.add({"kind": "timeline", "entityType": etype, "entityId": ent,   # O02 P4 (AMB-02/03)
                          "attribute": props[n]["attribute"], "cut": cut}) for n in names}

        def render(rows, fields):
            out = []
            for r in rows:
                d = {"identity": r["identity"]}
                if "value" in fields:
                    d["value"] = model_value(r["value"])
                if "recordedAt" in fields:
                    d["recordedAt"] = num(float(r["recordedAt"]))
                kr = r["knownRetirement"]
                d["knownRetirement"] = None if kr is None else {"retractedAt": num(float(kr["retractedAt"])),
                                                                 "retractTxId": kr["retractTxId"]}
                out.append(d)
            return out

        def norm_exp(lst):
            out = []
            for e in vec.sym(lst):
                d = {"identity": e["identity"]}
                if "value" in e:
                    d["value"] = norm_plain(e["value"])
                if "recordedAt" in e:
                    d["recordedAt"] = num(e["recordedAt"])
                kr = e.get("knownRetirement")
                d["knownRetirement"] = None if kr is None else {"retractedAt": num(kr["retractedAt"]),
                                                                 "retractTxId": kr["retractTxId"]}
                out.append(d)
            return out

        def finish(ans):
            groups = exp if isinstance(exp, dict) else {names[0]: exp}
            ok = True
            for n, lst in groups.items():
                ok &= multiset(render(ans[rids[n]]["result"]["assertions"], set(lst[0]))) == multiset(norm_exp(lst))
            R.add(vec, qid, "AGREE" if ok else "DISAGREE", ambiguity=q.get("ambiguity"),
                  note="AMB-02 shape: compared on logical content (identity, value, recordedAt, knownRetirement)",
                  **({} if ok else {"oracle": {n: ans[rids[n]]["result"]["assertions"] for n in names}, "golden": exp}))
        return t, finish

    if ".getMany(" in call:
        ids = js(call_args(call, ".getMany")[0])
        rid = t.add({"kind": "getMany", "entityType": etype, "entityIds": ids, "cut": cut})

        def finish(ans):
            a = ans[rid]
            got = oracle_error(a["error"]) if "error" in a else [doc_from_model(x, props) for x in a["result"]]
            want = gold_error(q["expectedError"]) if "expectedError" in q else norm_plain(exp)
            R.add(vec, qid, "AGREE" if same(got, want) else "DISAGREE", oracle=got, golden=want, **amb_note)
        return t, finish

    if ".get(" in call:
        if "for n:max" in call:
            ids = re.findall(r"(n:\w+)", call.split(" for ", 1)[1])
            rids = {i: t.add({"kind": "get", "entityType": etype, "entityId": i, "cut": cut}) for i in ids}

            def finish(ans):
                got = {i: doc_from_model(ans[r]["result"], props) for i, r in rids.items()}
                want = {i: norm_plain(x) for i, x in exp.items()}
                R.add(vec, qid, "AGREE" if same(got, want) else "DISAGREE", oracle=got, golden=want)
            return t, finish
        ent = js(call_args(call, ".get")[0])
        rid = t.add({"kind": "get", "entityType": etype, "entityId": ent, "cut": cut})

        def finish(ans):
            a = ans[rid]
            got = oracle_error(a["error"]) if "error" in a else doc_from_model(a["result"], props)
            if amb:
                info = {rd["id"]: same(got, norm_plain(rd["expected"])) for rd in amb_readings(q)
                        if isinstance(rd.get("expected"), dict)}
                R.add(vec, qid, "AMBIGUOUS", ambiguity=amb, oracle=got, readingsMatched=info)
                return
            want = gold_error(q["expectedError"]) if "expectedError" in q else norm_plain(exp)
            R.add(vec, qid, "AGREE" if same(got, want) else "DISAGREE", oracle=got, golden=want, **amb_note)
        return t, finish

    if ".count(" in call or ".find(" in call:
        is_count = ".count(" in call
        arg = js(call_args(call, ".count" if is_count else ".find")[0])
        where = arg if is_count else arg.get("where", {})
        oq = {"kind": "count" if is_count else "find", "entityType": etype, "where": where_items(where), "cut": cut}
        if not is_count and arg.get("orderBy"):
            oq["orderBy"] = [{"prop": arg["orderBy"], "direction": "asc"}]
        rid = t.add(oq)

        def finish(ans):
            a = ans[rid]
            if "error" in a:
                got = oracle_error(a["error"])
            elif is_count:
                got = a["result"]["total"]
            else:
                ents = [x for p in a["result"]["pages"] for x in p["entities"]]
                got = {"items": [doc_from_model(x, props) for x in ents], "nextCursor": "absent"}
            if amb:
                info = {}
                for rd in amb_readings(q):
                    if "expectedError" in rd:
                        info[rd["id"]] = same(got, gold_error(rd["expectedError"]))
                    elif isinstance(rd.get("expected"), list):   # no orderBy in these queries: compare as a set
                        info[rd["id"]] = isinstance(got, dict) and "items" in got and \
                            sorted(i["$id"] for i in got["items"]) == sorted(rd["expected"])
                    else:
                        info[rd["id"]] = "not machine-comparable: " + str(rd.get("expected"))
                R.add(vec, qid, "AMBIGUOUS", ambiguity=amb, oracle=got, readingsMatched=info)
                return
            if "expectedError" in q:
                want = gold_error(q["expectedError"])
            elif is_count:
                want = exp
            elif q.get("compare") in ("items ids", "ordered ids"):
                got = [i["$id"] for i in got["items"]] if isinstance(got, dict) and "items" in got else got
                want = exp
            else:
                want = {"items": [norm_plain(i) for i in exp["items"]], "nextCursor": exp.get("nextCursor")}
            R.add(vec, qid, "AGREE" if same(got, want) else "DISAGREE", oracle=got, golden=want, **amb_note)
        return t, finish

    t.not_modeled = call
    return t, None


def norm_change(c, fields):
    d = {}
    for f in fields:
        v = c.get(f, "<absent>")
        if f == "value" and isinstance(v, dict):
            d[f] = norm_typed(gvalue_render(v))
        elif isinstance(v, (int, float)) and not isinstance(v, bool):
            d[f] = num(v)
        else:
            d[f] = v
    return d


def changes_cmp(vec, got, want, ordered=True, only=None):
    want = vec.sym(want)
    if not ordered:
        a = multiset([norm_change(c, only) for c in got])
        b = multiset([norm_change(c, only) for c in want])
        return a == b, None if a == b else {"oracle": a, "golden": b}
    if len(got) != len(want):
        return False, {"lenOracle": len(got), "lenGolden": len(want)}
    diffs = []
    for i, (g, w) in enumerate(zip(got, want)):
        fields = only or list(w.keys())
        a, b = norm_change(g, fields), norm_change(w, fields)
        bad = [f for f in fields if a[f] != b[f]]
        if bad:
            diffs.append({"index": i, "op": w.get("op"), "fields": bad,
                          "oracle": {f: g.get(f, "<absent>") for f in bad}, "golden": {f: w.get(f) for f in bad}})
    return not diffs, diffs or None


def record_cmp(vec, rec, want):
    if rec is None or want is None:
        return rec is None and want is None, None if rec is None and want is None else {"oracle": rec, "golden": want}
    want = vec.sym(want)
    diffs = {}
    for k, v in want.items():
        if k == "changes":
            ok, d = changes_cmp(vec, rec["changes"], v)
            if not ok:
                diffs["changes"] = d
        else:
            gv = rec.get(k)
            a = num(gv) if isinstance(gv, (int, float)) and not isinstance(gv, bool) else gv
            b = num(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else v
            if a != b:
                diffs[k] = {"oracle": gv, "golden": v}
    return not diffs, diffs or None


def translate_journal(vec, q, R, t, call):
    qid, exp = q.get("id"), q.get("expected")
    records = vec.vec.get("records") or {}

    def resolve(x):
        if isinstance(x, str) and x.startswith("@records."):
            return records[x.split(".", 1)[1]]
        if isinstance(x, list):
            return [resolve(i) for i in x]
        if isinstance(x, dict):
            return {k: resolve(v) for k, v in x.items()}
        return x

    amb_note = {"ambiguity": q["ambiguity"]} if q.get("ambiguity") and exp != "AMBIGUOUS" else {}

    if call.startswith("Triples.transactionByCommand("):
        cmds = re.findall(r"'([^']+)'", call)
        rids = [t.add({"kind": "transactionByCommand", "commandId": c}) for c in cmds]

        def finish(ans):
            got = [ans[r]["result"] for r in rids]
            want = resolve(exp) if isinstance(exp, list) else [resolve(exp)]
            oks = [record_cmp(vec, g, w) for g, w in zip(got, want)]
            ok = all(o for o, _ in oks)
            R.add(vec, qid, "AGREE" if ok else "DISAGREE", diffs=[d for _, d in oks if d], **amb_note)
        return t, finish

    if call.startswith("Triples.transaction("):
        tx = re.search(r"\$tx:(\w+)", call).group(0)
        rid = t.add({"kind": "transaction", "txId": vec.sym(tx)})

        def finish(ans):
            rec = ans[rid]["result"]
            if exp == "AMBIGUOUS":
                v = rec["changes"][0]["value"]
                info = {rd["id"]: norm_typed(v) == norm_typed(gvalue_render(rd["expected"])) for rd in amb_readings(q)}
                R.add(vec, qid, "AMBIGUOUS", ambiguity=q["ambiguity"], oracle=v, readingsMatched=info)
                return
            if q.get("ambiguity") == "AMB-07":
                ok, d = changes_cmp(vec, rec["changes"], exp, ordered=False, only=["op", "tripleId"])
                R.add(vec, qid, "AGREE" if ok else "DISAGREE", ambiguity="AMB-07", diff=d,
                      oracleOrder=[c["tripleId"] for c in rec["changes"]], note="compared as a set; order is AMB-07")
                return
            if ".changes" in call:
                ok, d = changes_cmp(vec, rec["changes"], exp)
            else:
                ok, d = record_cmp(vec, rec, resolve(exp))
            R.add(vec, qid, "AGREE" if ok else "DISAGREE", diff=d, **amb_note)
        return t, finish

    if call.startswith("Triples.transactions("):
        arg = js(call_args(call, "Triples.transactions")[0])
        oq = {"kind": "transactions", "after": vec.sym(arg.get("after", 0))}
        if "limit" in arg:
            oq["limit"] = arg["limit"]
        rid = t.add(oq)

        def finish(ans):
            res = ans[rid]["result"]
            want = resolve(exp)
            oks = [record_cmp(vec, g, w) for g, w in zip(res["transactions"], want["transactions"])]
            ok = len(res["transactions"]) == len(want["transactions"]) and all(o for o, _ in oks)
            wnext = vec.sym(want.get("next"))
            ok = ok and ((res.get("next") is None) if wnext == "absent" else res.get("next") == wnext)
            R.add(vec, qid, "AGREE" if ok else "DISAGREE", diffs=[d for _, d in oks if d],
                  next=[res.get("next"), wnext], count=[len(res["transactions"]), len(want["transactions"])])
        return t, finish

    if call.startswith("Triples.transactionsForEntity("):
        args = call_args(call, "Triples.transactionsForEntity")
        oq = {"kind": "transactionsForEntity", "entityId": js(args[0])}
        if len(args) > 1:
            o = js(args[1])
            for k in ("limit", "snapshotPosition", "beforePosition"):
                if k in o:
                    oq[k] = vec.sym(o[k])
        rid = t.add(oq)

        def finish(ans):
            res = ans[rid]["result"]
            want = resolve(exp)
            oks = [record_cmp(vec, g, w) for g, w in zip(res["transactions"], want["transactions"])]
            ok = len(res["transactions"]) == len(want["transactions"]) and all(o for o, _ in oks)
            ok = ok and res["snapshotPosition"] == vec.sym(want["snapshotPosition"])
            wn = vec.sym(want.get("nextBeforePosition"))
            ok = ok and ((res.get("nextBeforePosition") is None) if wn == "absent" else res.get("nextBeforePosition") == wn)
            R.add(vec, qid, "AGREE" if ok else "DISAGREE", diffs=[d for _, d in oks if d],
                  paging={"oracle": [res["snapshotPosition"], res.get("nextBeforePosition")],
                          "golden": [vec.sym(want["snapshotPosition"]), wn]})
        return t, finish
    t.not_modeled = call
    return t, None


def translate_page(vec, q, R, t, call):
    qid, exp = q.get("id"), q.get("expected")
    bodies = vec.vec.get("bodies") or {}
    if "expectedError" in q:
        if "limit: 0" in call:
            r0 = t.add({"kind": "entityPage", "entityType": "Page", "limit": 0, "cut": vec.cut({"validAt": 50})})
            r1 = t.add({"kind": "entityPage", "entityType": "Page", "limit": 201, "cut": vec.cut({"validAt": 50})})

            def finish(ans):
                got = {k: (ans[r].get("error") or {}) for k, r in (("limit0", r0), ("limit201", r1))}
                want = (q["expectedError"]["_tag"], q["expectedError"]["reason"])
                ok = all((e.get("_tag"), e.get("reason")) == want for e in got.values())
                R.add(vec, qid, "AGREE" if ok else "DISAGREE", oracle=got, golden=q["expectedError"])
            return t, finish
        # O02 P6: continuation errors through the oracle cursor model
        first = t.add({"kind": "entityPage", "entityType": "Page", "limit": 2,
                       "cut": {"position": {"afterCommand": vec.cmd_index["C1"]}, "recordedAt": 1000, "validAt": 50}})
        cont = {"kind": "entityPage", "entityType": "Other" if "'Other'" in call else "Page", "limit": 2,
                "cursorFrom": {"query": first}}
        mv = re.search(r"basis: \{ validAt: (\d+) \}", call)
        if mv:
            cont["cut"] = {"validAt": int(mv.group(1))}
        rc = t.add(cont)

        def finish(ans):
            e = ans[rc].get("error") or {}
            got, want = (e.get("_tag"), e.get("reason")), (q["expectedError"]["_tag"], q["expectedError"]["reason"])
            if got == want:
                verdict = "AGREE"
            elif e and got[0] == want[0] and want[1] not in ("malformed", "other-scope", "other-query"):
                verdict = "VECTOR-BUG"
            else:
                verdict = "DISAGREE"
            R.add(vec, qid, verdict, oracle=e, golden=q["expectedError"],
                  note="ACC 4.7 E-CURSOR reasons are malformed|other-scope|other-query (CURSOR_TRANSITIONS); "
                       "the golden reason is not one of them, so the contract wins (EXP-O02 brief)"
                  if verdict == "VECTOR-BUG" else None)
        return t, finish
    c1, c2 = vec.cmd_index["C1"], vec.cmd_index["C2"]
    if qid in ("S1", "S2", "S3"):
        cut, page_index = {"position": {"afterCommand": c1}, "recordedAt": 1000, "validAt": 50}, int(qid[1]) - 1
        gsnap = exp["snapshot"]
    elif qid == "F1":
        cut, page_index, gsnap = {"position": {"afterCommand": c2}, "recordedAt": 1000, "validAt": 50}, None, q["expectedSnapshot"]
    else:
        cut, page_index, gsnap = {"position": {"afterCommand": c2}, "recordedAt": 150, "validAt": 50}, None, q["expectedSnapshot"]
    rid = t.add({"kind": "entityPage", "entityType": "Page", "limit": 2, "cut": cut})

    def finish(ans):
        res = ans[rid]["result"]
        pages = res["pages"]
        want_list = [exp] if page_index is not None else exp
        got_list = [pages[page_index]] if page_index is not None else pages
        ok, amb_hit = len(want_list) == len(got_list), False
        for gp, wp in zip(got_list, want_list):
            want_rows = [vec.sym(r) for key in wp["entities"] for r in bodies[key[len("@bodies."):]]]
            got_rows = [r for e in gp["entities"] for r in e["triples"]]
            fields = [f for f in TRIPLE_FIELDS if f in want_rows[0] and f not in ("retractedAt", "retractTxId")]
            ok = ok and multiset(oracle_rows(got_rows, fields)) == multiset([norm_row(r, fields) for r in want_rows])
            ok = ok and [e["entityId"] for e in gp["entities"]] == [r["entityId"] for r in want_rows]
            for w in want_rows:
                g = next((x for x in got_rows if x["id"] == w["id"]), None)
                if isinstance(w["retractedAt"], str):
                    amb_hit = True
                    w_info = {"oracleRaw": g and g["retractedAt"]}
                    continue
                ok = ok and g is not None and g["retractedAt"] is None and w["retractedAt"] is None
            ok = ok and (wp["nextCursor"] == "present") == gp["hasMore"]
        gs = vec.sym(gsnap)
        ocut = res["cut"]
        ok = ok and gs["recordedPosition"] == ocut["position"] and num(gs["recordedAt"]) == num(ocut["recordedAt"])
        R.add(vec, qid, "AGREE" if ok else "DISAGREE",
              note=("page:d retirement fields are AMB-01 and not compared (oracle entityPage bodies use the raw "
                    "lifetime); " if amb_hit else "") +
              "cursor tokens not modeled: the pinned cut (P, R = reader clock 1000 or 150, V = 50) was given explicitly",
              **({} if ok else {"oracle": pages}))
    return t, finish


# --------------------------------------------------------------------------- command outcome comparison


def compare_commands(vec, report, R):
    outcomes = {o["command"]: o["expected"] for o in report["commandOutcomes"]}
    for gc, idx in vec.golden_cmds:
        exp = gc.get("expect")
        if exp is None:
            continue
        got = outcomes[idx]
        item = f"cmd:{gc.get('id') or idx}"
        if exp == "AMBIGUOUS":
            R.add(vec, item, "AMBIGUOUS", ambiguity=gc.get("ambiguity"), oracle=got)
            continue
        ok = got["outcome"] == exp["outcome"]
        detail = {}
        if ok and exp["outcome"] == "rejected":
            err = exp.get("error") or {}
            tag = err.get("_tag")
            if tag and not tag.startswith("UNSPECIFIED"):
                if got.get("errorTag") != tag:
                    ok = False
                    detail["tag"] = [got.get("errorTag"), tag]
            elif tag or err.get("messageIncludes"):
                detail["tagNotCompared"] = {"golden": tag or err.get("messageIncludes"), "oracleCategory": got.get("category"),
                                            "oracleErrorTag": got.get("errorTag")}
            if "transactionId" in err and got.get("transactionId") != vec.sym(err["transactionId"]):
                ok = False
                detail["transactionId"] = [got.get("transactionId"), vec.sym(err["transactionId"])]
            if err.get("violations"):
                gv = sorted((v["code"], v["subject"], v["actual"], bits(v["validAt"])) for v in err["violations"])
                ov = sorted((v["code"], v["subject"], v["actual"], bits(v["validAt"])) for v in got.get("violations", []))
                if gv != ov:
                    ok = False
                    detail["violations"] = {"oracle": ov, "golden": gv}
            if err.get("violationCodesInclude"):
                if not set(err["violationCodesInclude"]) <= set(got.get("codes", [])):
                    ok = False
                    detail["codes"] = [got.get("codes"), err["violationCodesInclude"]]
            # rejected commands allocate no position
            if any(r["command"] == idx for r in report_catalog(report)):
                ok = False
                detail["position"] = "oracle allocated a position for a rejected command"
        if not ok:
            detail["oracle"] = got
            detail["golden"] = exp
        R.add(vec, item, "AGREE" if ok else "DISAGREE", **detail)


def report_catalog(report):
    for q in report["queries"]:
        if q["id"] == "__catalog":
            return q["result"]
    return []


# --------------------------------------------------------------------------- vector builders


def build_generic(vec, R):
    """Vectors with ordinary `commands` (c5, c6, g1-I64-01, q8f, g9-half-open, g9-history-cuts, g10)."""
    for gc in vec.vec.get("commands", []):
        if "ops" in gc:
            vec.add_command(gc)
        elif gc.get("call", "").startswith("Triples.retractByPattern("):
            pat = js(call_args(gc["call"], "Triples.retractByPattern")[0])
            vec.add_command(gc, ops=[{"op": "retract-pattern", "pattern": pat}], meta={})
        else:
            R.add(vec, f"cmd:{gc.get('id')}", "NOT-MODELED", call=gc.get("call"),
                  note="the oracle does not model journal fact ids, so this retract cannot be expressed")
    queries = list(vec.vec.get("queries", []))
    tmpl = vec.vec.get("queryTemplate")
    if tmpl:   # G9-HO-01: the same membership through match, queryAll and the native facts relation
        queries = [dict(q, call="Triples.match({ attribute: ':iv/x' }, basis)",
                        expected=["$id:" + x for x in q["expected"]] if q["expected"] else [])
                   for q in queries]
    return queries


def tiny_v4(vec, fixture, R):
    """The documented tiny-v4 fixture as an O-REPLAY command stream."""
    label_rule = {"_tag": "Required", "v": 1, "entityType": "CapacityEntity", "attribute": ":capacity/label"}
    for gc in fixture["commands"]:
        if gc["kind"] == "config-release":
            vec.add_command(gc, internal=True)
            continue
        meta = vec.meta(gc.get("meta") or {"commandId": gc.get("commandId")})
        meta["enforce"] = {"constraints": [label_rule]}
        vec.add_command(gc, ops=vec.ops(gc["ops"]), meta=meta)
    attrs = {}
    for a in fixture["assertions"]:
        short = a["attribute"].split("/", 1)[1]
        name = re.sub(r"-(\w)", lambda m: m.group(1).upper(), short)
        attrs[name] = {"attribute": a["attribute"], "type": a["value"]["type"], "cardinality": "one"}
    vec.schema = {"version": 1, "entityTypes": {"CapacityEntity": {"attributes": attrs}}}


def tiny_v4_table_check(vec, fixture, report, R):
    """Every one of the 100 documented assertion versions, field by field, against the oracle relation."""
    rows = {r["id"]: r for r in answers(report)["__assertions"]["result"]["assertions"]}
    bad = []
    for a in fixture["assertions"]:
        want = vec.sym({k: a[k] for k in ("entityId", "attribute", "value", "entityType", "recordedAt",
                                          "recordedPosition", "txId", "validFrom", "validTo", "createdBy")})
        rb = a.get("retiredBy") or {}
        want.update(vec.sym({"retractedAt": rb.get("retractedAt"), "retractedPosition": rb.get("retractedPosition"),
                             "retractTxId": rb.get("retractTxId")}))
        got = rows.get(a["identity"])
        fields = list(want.keys())
        if got is None or norm_row(got, fields) != norm_row(want, fields):
            bad.append(a["identity"])
    R.add(vec, "fixture-table(100 rows)", "AGREE" if not bad and len(rows) == 100 else "DISAGREE",
          mismatched=bad, oracleRows=len(rows))


def g5_cases(vec, shared):
    """G5 aggregate vectors -> list of (suffix, commands, queries, golden-expectation)."""
    v = vec.vec
    out = []

    def fixture(inputs, attr=":s/v", fam="integer"):
        ops = []
        for k, item in enumerate(inputs, 1):
            if isinstance(item, dict):
                ops.append({"op": "assert", "ref": f"g{k}", "entityId": f"s:{k}", "attribute": ":s/g",
                            "value": {"type": "string", "value": item["g"]}, "validFrom": 0})
                val = item["v"]
            else:
                val = item
            ops.append({"op": "assert", "ref": f"v{k}", "entityId": f"s:{k}", "attribute": attr,
                        "value": {"type": "integer", "value": val}, "validFrom": 0})
        return [{"clock": 100, "meta": {"actor": "golden", "commandId": f"{vec.id}:C1"}, "operations": ops}] if ops else []

    cut = {"validAt": 10}
    if v["id"] in ("G5-SUM-12", "G5-SUM-13"):
        ents = ["agg:a", "agg:b"] if v["id"] == "G5-SUM-12" else ["agg:c", "agg:c"]
        ops = [{"op": "assert", "ref": f"m{i}", "entityId": e, "attribute": ":conf/amount",
                "value": {"type": "number", "value": 10}, "validFrom": 0} for i, e in enumerate(ents)]
        cmds = [{"clock": 100, "meta": {"actor": "golden", "commandId": f"{vec.id}:C1"}, "operations": ops}]
        q = {"id": "Q", "kind": "aggregate", "cut": cut, "match": {"attributes": {"amount": ":conf/amount"}},
             "aggregates": [{"op": "sum", "var": "amount", "as": "?sum"}, {"op": "count", "var": "amount", "as": "?count"}]}
        out.append(("", cmds, [q], v))
        return out
    if v["id"] == "G5-SUM-09":
        q1 = {"id": "Q1", "kind": "aggregate", "cut": cut, "match": {"attributes": {"v": ":s/v"}},
              "aggregates": [{"op": "sum", "var": "v", "as": "?total"}, {"op": "count", "var": "v", "as": "?count"}]}
        q2 = {"id": "Q2", "kind": "aggregate", "cut": cut, "match": {"attributes": {"g": ":s/g", "v": ":s/v"}},
              "groupBy": ["g"], "aggregates": [{"op": "sum", "var": "v", "as": "?total"}]}
        out.append(("", [], [q1, q2], {"Q1": v["queries"][0]["expected"], "Q2": v["queries"][1]["expected"]}))
        return out
    if v["id"] == "G5-SUM-11":
        for i, c in enumerate(v["cases"]):
            q = {"id": "Q", "kind": "aggregate", "cut": cut, "match": {"attributes": {"v": ":s/v"}},
                 "integerAvg": "convert", "aggregates": [{"op": "avg", "var": "v", "as": "?avg"}]}
            out.append((f"-case{i + 1}", fixture(c["inputs"]), [q], c))
        return out
    grouped = any(isinstance(x, dict) for x in v["inputs"])
    if v["id"] == "G5-SUM-10":
        q = {"id": "Q", "kind": "aggregate", "cut": cut, "match": {"attributes": {"v": ":s/v"}},
             "aggregates": [{"op": "avg", "var": "v", "as": "?avg"}]}
    elif grouped:
        q = {"id": "Q", "kind": "aggregate", "cut": cut, "match": {"attributes": {"g": ":s/g", "v": ":s/v"}},
             "groupBy": ["g"], "aggregates": [{"op": "sum", "var": "v", "as": "?total"}]}
    else:
        q = {"id": "Q", "kind": "aggregate", "cut": cut, "match": {"attributes": {"v": ":s/v"}},
             "aggregates": [{"op": "sum", "var": "v", "as": "?total"}]}
    out.append(("", fixture(v["inputs"]), [q], v))
    return out


def g5_compare(vec, suffix, report, gold, R):
    ans = answers(report)

    def rows_of(a):
        return [{k: (norm_typed(x) if isinstance(x, dict) else x) for k, x in r} if isinstance(r, list) else
                {k: (norm_typed(x) if isinstance(x, dict) else x) for k, x in r.items()} for r in a["result"]["rows"]]

    def want_rows(results):
        out = []
        for r in results:
            d = {}
            for k, x in r.items():
                x = vec.sym(x) if isinstance(x, str) else x
                if isinstance(x, dict):
                    d[k] = norm_typed(x)
                elif isinstance(x, (int, float)) and not isinstance(x, bool) and k == "?count":
                    d[k] = ("integer", str(x))
                elif isinstance(x, (int, float)) and not isinstance(x, bool):
                    d[k] = ("number", bits(x))
                else:
                    d[k] = x
            out.append(d)
        return out

    if vec.id == "G5-SUM-09":
        for qid in ("Q1", "Q2"):
            got = rows_of(ans[qid])
            want = want_rows(gold[qid]["results"])
            R.add(vec, qid, "AGREE" if same(got, want) else "DISAGREE", oracle=got, golden=want,
                  note="?count is compared as int64 0 (the oracle's count family); AMB-10 representation not compared")
        return
    a = ans["Q"]
    item = "Q" + suffix
    if "expectedError" in gold:
        code = gold["expectedError"].get("code") or gold["expectedError"].get("_tag")
        e = a.get("error")   # O02 P2: compare with the 4.7 id, _tag or reason
        got = [e.get("error"), e.get("_tag"), e.get("reason")] if e else rows_of(a)
        R.add(vec, item, "AGREE" if e and code in got else "DISAGREE", oracle=got, golden=gold["expectedError"])
        return
    if vec.id == "G5-SUM-11":
        got = rows_of(a)
        want = [{"?avg": ("number", int(gold["expected"]["bits"], 16))}]
        R.add(vec, item, "AGREE" if same(got, want) else "DISAGREE", oracle=got, golden=gold["expected"],
              note="conversion syntax is AMB-11; the oracle's integerAvg=convert switch was used")
        return
    if gold.get("expected") == "AMBIGUOUS":
        got = rows_of(a)
        info = {rd["id"]: same(got, want_rows(rd["expected"]["results"])) for rd in gold["readings"]}
        R.add(vec, item, "AMBIGUOUS", ambiguity=gold["ambiguity"], oracle=got, readingsMatched=info)
        return
    got = rows_of(a)
    want = want_rows(gold["expected"]["results"])
    R.add(vec, item, "AGREE" if same(got, want) else "DISAGREE", oracle=got, golden=want)


def g1_i64_02(vec, R):
    v = vec.vec
    tmpl = v["commandTemplate"]
    cases = v["cases"] + [v["contrastCase"]]
    queries = []
    for c in cases:
        ops = []
        for op in tmpl["ops"]:
            o = json.loads(json.dumps(op).replace("<case>", c["case"]))
            if o["label"] == "BAD":
                o["value"]["value"] = c["text"]
            o["label"] = f"{o['label']}-{c['case']}"
            ops.append(o)
        gc = {"id": c["case"], "instant": 100, "meta": {"actor": "golden", "commandId": f"g1i64-02:{c['case']}"},
              "ops": ops, "expect": c.get("expect", tmpl["expect"])}
        vec.vec.setdefault("commands", []).append(gc)
        vec.add_command(gc)
        for side in ("ok", "bad"):
            queries.append({"id": f"post:{c['case']}:{side}", "call": f"Triples.match({{ entityId: 'n:{side}-{c['case']}' }})",
                            "expected": [] if c.get("expect", tmpl["expect"])["outcome"] == "rejected"
                            else [f"$id:{side.upper()}-{c['case']}"]})
    return queries


# --------------------------------------------------------------------------- driver


def run_vector(vec, queries, R, extra=None):
    # pass 1: positions and txIds
    rep1 = run_case(f"{vec.id}.pass1", vec.case([]))
    vec.catalog_by_cmd = {r["command"]: r for r in report_catalog(rep1)}
    # pass 2: queries
    translated = []
    oracle_queries = []
    for q in queries:
        t, fin = translate(vec, q, R)
        if fin is None:
            R.add(vec, q.get("id"), "NOT-MODELED", call=t.not_modeled)
            continue
        translated.append(fin)
        oracle_queries += t.oq
    report = run_case(vec.id, vec.case(oracle_queries))
    ans = answers(report)
    for fin in translated:
        try:
            fin(ans)
        except Exception as error:  # a converter bug must be visible, never silently pass
            R.add(vec, "converter-error", "CONVERTER-ERROR", error=repr(error))
    compare_commands(vec, report, R)
    if extra:
        extra(report)
    return report


def _reading(row, prefix):
    info = row.get("readingsMatched") or row.get("oracle") or {}
    for key, val in info.items():
        if key.startswith(prefix):
            return val
    return None


def ruled(row):
    """Q21 (RULINGS.md) ruled reading per AMB id, and whether the oracle's answer takes it."""
    amb, item = row.get("ambiguity"), row["item"]
    oracle = json.loads(json.dumps(row.get("oracle"), default=str))
    if amb == "AMB-01":
        a = _reading(row, "A-")
        return "Q21 AMB-01 A (match keeps the raw lifetime)", bool(a and a["matchesRawContract"])
    if amb == "AMB-04":
        return "Q21 AMB-04 B (bit-exact -0)", _reading(row, "B-") is True
    if amb == "AMB-06":
        if item.startswith("cmd:"):
            return "Q21 AMB-06 A (command commits)", oracle.get("outcome") == "committed"
        return "Q21 AMB-06 A (pattern sees staged rows)", _reading(row, "A-") is True
    if amb == "AMB-08":
        return ("Q21 AMB-08 / Q14b (one value; representative = lowest (recordedPosition, op index) = Z1 -0.0)",
                oracle.get("nums") == [["num", 0x8000000000000000]])
    if amb == "AMB-09":
        return "Q21 AMB-09 B (one binding row: SUM 10, COUNT 1)", _reading(row, "B-") is True
    if amb == "AMB-12":
        if item.startswith("cmd:"):
            return ("Q21 AMB-12 B (E-INVALID-VALUE)", oracle.get("outcome") == "rejected"
                    and oracle.get("errorTag") == "InvalidTripleError" and oracle.get("reason") == "invalid-value")
        return "Q21 AMB-12 B (reject the empty interval)", _reading(row, "B-") is True
    if amb == "AMB-16":
        return "Q21 AMB-16 A (integer range predicates)", _reading(row, "A-") is True
    if amb == "AMB-17":
        return "Q21 AMB-17 A (find fails on a conflicted document attribute)", _reading(row, "A-") is True
    return f"no Q21 ruling handled for {amb}", False


def main():
    R = Result()
    files = sorted(GOLD.glob("*.json"))
    vector_count = 0
    for f in files:
        doc = json.loads(f.read_text())
        for v in doc["vectors"]:
            vector_count += 1
            vec = Vec(f.name, v, doc)
            if f.name == "g5-sum-overflow.json":
                for suffix, cmds, qs, gold in g5_cases(vec, doc):
                    case = {"format": "triplex-db-2/o-replay-case/1", "caseId": f"golden/{vec.id}{suffix}",
                            "defaultScope": "fresh", "commands": cmds, "queries": qs}
                    report = run_case(f"{vec.id}{suffix}", case)
                    g5_compare(vec, suffix, report, gold, R)
                continue
            if f.name == "g9-tiny-v4-retirement.json":
                fx = doc["fixtures"]["tiny-v4"]
                tiny_v4(vec, fx, R)
                vec.vec["commands"] = fx["commands"]
                run_vector(vec, v["queries"], R,
                           extra=(lambda rep, vec=vec, fx=fx: tiny_v4_table_check(vec, fx, rep, R))
                           if v["id"] == "G9-V4-07" else None)
                continue
            if v["id"] == "G1-I64-02":
                qs = g1_i64_02(vec, R)
                run_vector(vec, qs, R)
                continue
            qs = build_generic(vec, R)
            run_vector(vec, qs, R)
    # O02 P7: every AMBIGUOUS item against its Q21 ruled reading
    for row in R.rows:
        if row["verdict"] == "AMBIGUOUS":
            ruling, matched = ruled(row)
            row["ruling"] = ruling
            row["ruledReadingMatched"] = matched
            row["verdict"] = "AGREE-RULED" if matched else "DISAGREE"
    # summary
    by_vec = {}
    for row in R.rows:
        by_vec.setdefault(row["vector"], []).append(row["verdict"])
    counts = {}
    for row in R.rows:
        counts[row["verdict"]] = counts.get(row["verdict"], 0) + 1

    def vec_verdict(vs):
        if "DISAGREE" in vs or "CONVERTER-ERROR" in vs:
            return "DISAGREE"
        if "VECTOR-BUG" in vs:
            return "AGREE+VECTOR-BUG"
        if "AMBIGUOUS" in vs:
            return "AGREE+AMBIGUOUS" if any(v.startswith("AGREE") for v in vs) else "AMBIGUOUS"
        if "NOT-MODELED" in vs:
            return "AGREE+NOT-MODELED"
        return "AGREE"
    vec_counts = {}
    vec_rows = {}
    for k, vs in by_vec.items():
        vv = vec_verdict(vs)
        vec_rows[k] = vv
        vec_counts[vv] = vec_counts.get(vv, 0) + 1
    out = {"format": "triplex-db-2/v-o01-golden-vs-oracle/1", "vectors": vector_count, "itemCounts": counts,
           "vectorCounts": vec_counts, "vectorVerdicts": vec_rows, "assumptions": ASSUMPTIONS, "items": R.rows}
    (OUT / "results.json").write_text(json.dumps(out, indent=1, ensure_ascii=True, default=str) + "\n")
    print(json.dumps({k: out[k] for k in ("vectors", "itemCounts", "vectorCounts")}, indent=1))
    for row in R.rows:
        if row["verdict"] in ("DISAGREE", "CONVERTER-ERROR", "UNCOMPARED", "AGREE-ONE-CONTRACT", "VECTOR-BUG"):
            print("--", row["vector"], row["item"], row["verdict"],
                  json.dumps({k: v for k, v in row.items() if k not in ("vector", "item", "verdict")}, default=str)[:600])


if __name__ == "__main__":
    main()

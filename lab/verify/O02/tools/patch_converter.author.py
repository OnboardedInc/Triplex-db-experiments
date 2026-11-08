"""Make the O02-adapted copy of V-O01's convert_and_run.py (scratch only; the verifier's file is untouched).

Each patch adapts the converter to an output change the contract or a ruling required of the oracle:
  P1 oracle_error: ACC 4.7 error output (error id + _tag + reason); ConflictingValuesError read from _tag.
  P2 g5_compare: golden expectedError {code|_tag} compared with the oracle's id, _tag or reason (4.7).
  P3 Repository.count -> oracle `count` kind (Q21 AMB-17 A: find returns documents, count does not).
  P4 Repository.timeline -> oracle `timeline` kind (Q21 AMB-03: no V filter; AMB-02 field names).
  P5 journal facts (:_tx/change, :_tx/changed-entity) read through `match` (now modeled, brief fact 4).
  P6 G10-CUR-01 E1/E2 through the oracle cursor model; E3 compares _tag and reason; a golden reason that
     is not an ACC 4.7 E-CURSOR reason is reported as VECTOR-BUG (contract wins).
  P7 AMBIGUOUS items: checked against the Q21 ruled reading -> AGREE-RULED, or DISAGREE.
  P8 ordinary match compares the raw-lifetime contract only (Q21 AMB-01 A).
  P9 optional lane: env O02_LANE passes --lane to the oracle CLI.

  python3 -I patch_converter.py SRC DST
"""
import sys
from pathlib import Path

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
t = src.read_text()


def rep(old, new, count=1):
    global t
    n = t.count(old)
    if n != count:
        raise SystemExit(f"patch anchor found {n} times, expected {count}: {old[:90]!r}")
    t = t.replace(old, new)


# P9
rep('''    proc = subprocess.run([sys.executable, "-I", str(CLI), str(cpath), "-o", str(opath)],
                          capture_output=True, text=True)''',
    '''    lane = os.environ.get("O02_LANE")
    proc = subprocess.run([sys.executable, "-I", str(CLI), str(cpath), "-o", str(opath)] +
                          (["--lane", lane] if lane else []), capture_output=True, text=True)''')
rep("import json\nimport re\n", "import json\nimport os\nimport re\n")

# P1
rep('''def oracle_error(err):
    if err["error"] == "ConflictingValuesError":
        return {"error": err["error"], "conflicts": conflict_set(err)}
    return {"error": err["error"], "message": err.get("message")}''',
    '''def oracle_error(err):
    # O02 P1: ACC 4.7 output (error id, _tag, reason)
    if err.get("_tag") == "ConflictingValuesError" or err["error"] == "ConflictingValuesError":
        return {"error": "ConflictingValuesError", "conflicts": conflict_set(err)}
    return {"error": err.get("_tag") or err["error"], "message": err.get("message")}''')

# P2
rep('''        got = a.get("error", {}).get("error") if "error" in a else rows_of(a)
        R.add(vec, item, "AGREE" if got == code else "DISAGREE", oracle=got, golden=gold["expectedError"])''',
    '''        e = a.get("error")   # O02 P2: compare with the 4.7 id, _tag or reason
        got = [e.get("error"), e.get("_tag"), e.get("reason")] if e else rows_of(a)
        R.add(vec, item, "AGREE" if e and code in got else "DISAGREE", oracle=got, golden=gold["expectedError"])''')

# P3
rep('''        oq = {"kind": "find", "entityType": etype, "where": where_items(where), "cut": cut}''',
    '''        oq = {"kind": "count" if is_count else "find", "entityType": etype, "where": where_items(where), "cut": cut}''')

# P4
rep('''        rids = {n: t.add({"kind": "assertionSnapshot", "mode": "known-at-valid", "cut": cut,
                          "pattern": {"entityId": ent, "attribute": props[n]["attribute"]}}) for n in names}''',
    '''        rids = {n: t.add({"kind": "timeline", "entityType": etype, "entityId": ent,   # O02 P4 (AMB-02/03)
                          "attribute": props[n]["attribute"], "cut": cut}) for n in names}''')
rep('''            for r in rows:
                d = {"identity": r["id"]}
                if "value" in fields:
                    d["value"] = model_value(r["value"])
                if "recordedAt" in fields:
                    d["recordedAt"] = num(float(r["recordedAt"]))
                kr = r["knownRetirement"]
                d["knownRetirement"] = None if kr is None else {"retractedAt": num(float(kr["recordedAt"])),
                                                                 "retractTxId": kr["txId"]}''',
    '''            for r in rows:
                d = {"identity": r["identity"]}
                if "value" in fields:
                    d["value"] = model_value(r["value"])
                if "recordedAt" in fields:
                    d["recordedAt"] = num(float(r["recordedAt"]))
                kr = r["knownRetirement"]
                d["knownRetirement"] = None if kr is None else {"retractedAt": num(float(kr["retractedAt"])),
                                                                 "retractTxId": kr["retractTxId"]}''')

# P5
rep('''    if call.startswith("Triples.match(") and "$tx:" in call:
        pat = js(call_args(call, "Triples.match")[0])
        rid = t.add({"kind": "transaction", "txId": vec.sym(pat["entityId"])})

        def finish(ans):
            rec = ans[rid]["result"]
            n = len(rec["changes"]) if pat.get("attribute") == ":_tx/change" else len(rec["changedEntities"])
            got = {"count": n}
            R.add(vec, qid, "AGREE-DERIVED" if same(got, exp) else "DISAGREE", oracle=got, golden=exp,
                  note="journal facts are not an oracle query; derived from the transaction record")
        return t, finish''',
    '''    if call.startswith("Triples.match(") and "$tx:" in call:
        pat = js(call_args(call, "Triples.match")[0])
        rid = t.add({"kind": "match", "cut": vec.cut({}),   # O02 P5: journal facts are queryable facts
                     "pattern": {"entityId": vec.sym(pat["entityId"]), "attribute": pat["attribute"]}})

        def finish(ans):
            a = ans[rid]
            got = {"count": a["result"]["count"]} if "result" in a else a["error"]
            R.add(vec, qid, "AGREE" if same(got, exp) else "DISAGREE", oracle=got, golden=exp)
        return t, finish''')
rep('''        if e.startswith("$tx:"):
            rid = t.add({"kind": "transaction", "txId": vec.sym(e)})

            def finish(ans):
                got = sorted(ans[rid]["result"]["changedEntities"])
                want = sorted(r["?e"] for r in exp["results"])
                R.add(vec, qid, "AGREE-DERIVED" if got == want else "DISAGREE", oracle=got, golden=want,
                      note="journal facts are not an oracle query; derived from changedEntities")
            return t, finish''',
    '''        if e.startswith("$tx:"):
            rid = t.add({"kind": "match", "cut": vec.cut({}),   # O02 P5
                         "pattern": {"entityId": vec.sym(e), "attribute": js(a)}})

            def finish(ans):
                got = sorted(r["value"]["value"] for r in ans[rid]["result"]["raw"])
                want = sorted(r["?e"] for r in exp["results"])
                R.add(vec, qid, "AGREE" if got == want else "DISAGREE", oracle=got, golden=want)
            return t, finish''')

# P6
rep('''            def finish(ans):
                got = {"limit0": ans[r0].get("error", "pages returned"), "limit201": ans[r1].get("error", "pages returned")}
                ok = "error" in ans[r0] and "error" in ans[r1]
                R.add(vec, qid, "AGREE" if ok else "DISAGREE", oracle=got, golden=q["expectedError"],
                      note="golden cites EntityPage.ts:95 (limit 1..200); tag/reason not comparable (oracle has no cursor errors)")
            return t, finish
        t.not_modeled = call + "  [cursor continuation error: the oracle has no cursor model]"
        return t, None''',
    '''            def finish(ans):
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
        mv = re.search(r"basis: \\{ validAt: (\\d+) \\}", call)
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
        return t, finish''')

# P8
rep('''        verdict = "AGREE" if ok_raw and ok_snap else ("AGREE-ONE-CONTRACT" if ok_raw or ok_snap else "DISAGREE")''',
    '''        verdict = "AGREE" if ok_raw else "DISAGREE"   # O02 P8: AMB-01 A, the match contract is the raw lifetime''')

# P7
rep('''    # summary
    by_vec = {}''', '''    # O02 P7: every AMBIGUOUS item against its Q21 ruled reading
    for row in R.rows:
        if row["verdict"] == "AMBIGUOUS":
            ruling, matched = ruled(row)
            row["ruling"] = ruling
            row["ruledReadingMatched"] = matched
            row["verdict"] = "AGREE-RULED" if matched else "DISAGREE"
    # summary
    by_vec = {}''')
rep('''def main():
    R = Result()''', '''def _reading(row, prefix):
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
    R = Result()''')
rep('''        if row["verdict"] in ("DISAGREE", "CONVERTER-ERROR", "UNCOMPARED", "AGREE-ONE-CONTRACT"):''',
    '''        if row["verdict"] in ("DISAGREE", "CONVERTER-ERROR", "UNCOMPARED", "AGREE-ONE-CONTRACT", "VECTOR-BUG"):''')
rep('''        if "DISAGREE" in vs or "CONVERTER-ERROR" in vs:
            return "DISAGREE"''', '''        if "DISAGREE" in vs or "CONVERTER-ERROR" in vs:
            return "DISAGREE"
        if "VECTOR-BUG" in vs:
            return "AGREE+VECTOR-BUG"''')

dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(t)
print("patched ->", dst)

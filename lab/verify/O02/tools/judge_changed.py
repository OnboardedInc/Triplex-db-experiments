"""V-O02: judge every item whose verdict the converter patch changed, without the patched converter.

Reads only the golden vectors, lab/acceptance/obligations.json (errorTable, goldenResolutions) and the
oracle's own run outputs (lab/verify/O02/runs/*.expected.json, core lane, produced by convert_and_run.py).
Each check states what the contract or ruling requires and compares the oracle answer with it directly.

  python3 -I lab/verify/O02/tools/judge_changed.py   -> lab/verify/O02/results/judge_changed.json
"""
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
GOLD = ROOT / "lab/acceptance/golden"
RUNS = ROOT / "lab/verify/O02/runs"
OUT = ROOT / "lab/verify/O02/results/judge_changed.json"
CONTRACT = json.loads((ROOT / "lab/acceptance/obligations.json").read_text())
ERRORS = {r["id"]: r for r in CONTRACT["errorTable"]}


def gold(file, vid):
    for v in json.loads((GOLD / file).read_text())["vectors"]:
        if v["id"] == vid:
            return v
    raise KeyError(vid)


def gq(v, qid):
    return next(q for q in v["queries"] if q.get("id") == qid)


def run(name):
    return json.loads((RUNS / f"{name}.expected.json").read_text())


def answer(rep, qid, n=0):
    return next(q for q in rep["queries"] if q["id"] == f"{qid}#{n}")


def catalog(rep):
    return {r["command"]: r for r in next(q for q in rep["queries"] if q["id"] == "__catalog")["result"]}


def bits(x):
    return struct.unpack(">Q", struct.pack(">d", float(x)))[0]


ROWS = []


def check(vector, item, ok, why, **detail):
    ROWS.append(dict(vector=vector, item=item, verdict="AGREE" if ok else "DISAGREE", rule=why, **detail))


def error_is(node, error_id):
    row = ERRORS[error_id]
    reasons = row["reason"].split("|")
    return (node.get("error") == error_id and node.get("_tag") == row["tag"] and node.get("reason") in reasons
            and node.get("phase") == row["phase"])


# 1. Conflict errors (P1): _tag, reason and the conflict set, against ACC 4.7 E-CONFLICTING-VALUES and AMB-13
CONFLICTS = [("c5-duplicates-conflicts.json", "C5-03", q) for q in ("Q1", "Q2", "Q4", "Q5", "Q6")] + \
            [("c5-duplicates-conflicts.json", "C5-04", q) for q in ("V10", "V19.999999999999996")] + \
            [("c5-duplicates-conflicts.json", "C5-07", q) for q in ("Q1", "Q2")] + \
            [("c5-duplicates-conflicts.json", "C5-08", "Q2"), ("c5-duplicates-conflicts.json", "C5-09", "Q1"),
             ("c5-duplicates-conflicts.json", "C5-09", "Q5")]
for f, vid, qid in CONFLICTS:
    g = gq(gold(f, vid), qid)["expectedError"]
    e = answer(run(vid), qid).get("error") or {}
    want = sorted((c["entityId"], c["attribute"]) for c in g["conflicts"])
    got = sorted((c["entityId"], c["attribute"]) for c in e.get("conflicts", []))
    check(vid, qid, error_is(e, "E-CONFLICTING-VALUES") and g["_tag"] == e.get("_tag") and got == want,
          "ACC 4.7 E-CONFLICTING-VALUES (tag, reason, phase) + AMB-13 conflict set", oracle=e, golden=g)

# 1b. count (P3): C5.3, only filter attributes fail it
a = answer(run("C5-03"), "Q7")
check("C5-03", "Q7", a.get("result", {}).get("total") == gq(gold("c5-duplicates-conflicts.json", "C5-03"), "Q7")["expected"],
      "C5.3: count({name}) does not reference the conflicted color", oracle=a.get("result") or a.get("error"))

# 2. Aggregate errors (P2): the oracle error must be the contract's row, not only share a tag or reason
for vid, eid, rule in (("G5-SUM-01", "E-INTEGER-OVERFLOW", "AG-SUM-I"), ("G5-SUM-05", "E-INTEGER-OVERFLOW", "AG-SUM-I"),
                       ("G5-SUM-08", "E-INTEGER-OVERFLOW", "AG-SUM-I"), ("G5-SUM-10", "E-INTEGER-AVG", "AG-AVG-I")):
    g = gold("g5-sum-overflow.json", vid)["expectedError"]
    q = answer(run(vid), "Q", 0) if False else next(x for x in run(vid)["queries"] if x["id"] == "Q")
    e = q.get("error") or {}
    golden_ok = (g.get("code") in (None, ERRORS[eid]["reason"])) and (g.get("_tag") in (None, ERRORS[eid]["tag"]))
    phase_ok = "phase" not in g or g["phase"].startswith(e.get("phase") or "?")
    check(vid, "Q", error_is(e, eid) and "result" not in q and golden_ok and phase_ok,
          f"ACC 4.4 {rule} -> {eid} (tag, reason, phase), no partial rows; golden code/_tag/phase consistent",
          oracle=e, golden=g)

# 3. timeline (P4): AMB-02 logical content and AMB-03 (no V filter), against the golden rows
for f, vid, qid, cmds in (("g9-history-cuts.json", "G9-CUT-01", "T2", None), ("g9-history-cuts.json", "G9-CUT-01", "T3", None),
                          ("g9-tiny-v4-retirement.json", "G9-V4-03", "G9-V4-03-Q4", "tiny"),
                          ("g9-tiny-v4-retirement.json", "G9-V4-04", "G9-V4-04-Q4", "tiny"),
                          ("g9-tiny-v4-retirement.json", "G9-V4-06", "G9-V4-06-Q4", "tiny")):
    v = gold(f, vid)
    q = gq(v, qid)
    rep = run(vid)
    cat = catalog(rep)
    golden_cmds = json.loads((GOLD / f).read_text())["fixtures"]["tiny-v4"]["commands"] if cmds else v["commands"]
    tx = {c["id"]: cat[i]["txId"] for i, c in enumerate(golden_cmds) if i in cat}
    groups = q["expected"] if isinstance(q["expected"], dict) else {"status": q["expected"]}
    answers = [x["result"] for x in rep["queries"] if x["id"].startswith(qid + "#")]
    ok = True
    for prop, rows in groups.items():
        res = next(r for r in answers if r["attribute"].endswith("/" + prop))
        got = {r["identity"]: r for r in res["assertions"]}
        ok &= sorted(got) == sorted(r["identity"] for r in rows)
        for w in rows:
            o = got.get(w["identity"])
            if o is None:
                ok = False
                continue
            if "value" in w:
                ok &= o["value"]["value"] == w["value"]
            if "recordedAt" in w:
                ok &= bits(o["recordedAt"]) == bits(w["recordedAt"])
            kr, wk = o["knownRetirement"], w["knownRetirement"]
            if wk is None:
                ok &= kr is None
            else:
                ok &= kr is not None and bits(kr["retractedAt"]) == bits(wk["retractedAt"]) and \
                    kr["retractTxId"] == tx[wk["retractTxId"].split(":", 1)[1]]
    check(vid, qid, ok, "RS-RETIREMENT-CONTENT (AMB-02) + RS-TIMELINE (AMB-03)")

# 4. journal facts (P5): C2 of C6-01 asserts A3, A4 and retracts A2, A1 -> 4 :_tx/change facts, 2 changed entities
rep = run("C6-01")
v = gold("c6-journal.json", "C6-01")
c2 = next(c for c in v["commands"] if c["id"] == "C2")
n_changes = len(c2["ops"])
entities = set()
labels = {op["label"]: op["entityId"] for c in v["commands"] for op in c["ops"] if op["op"] == "assert"}
for op in c2["ops"]:
    entities.add(op["entityId"] if op["op"] == "assert" else labels[op["id"].split(":", 1)[1]])
a11 = answer(rep, "Q11")["result"]
check("C6-01", "Q11", sorted(r["value"]["value"] for r in a11["raw"]) == sorted(entities) ==
      sorted(r["?e"] for r in gq(v, "Q11")["expected"]["results"]), "R-JNL-5 / brief fact 4: one :_tx/changed-entity per entity")
check("C6-01", "Q12", answer(rep, "Q12")["result"]["count"] == n_changes == gq(v, "Q12")["expected"]["count"],
      "one :_tx/change per asserted or retracted fact")
check("C6-01", "Q13", answer(rep, "Q13")["result"]["count"] == len(entities) == gq(v, "Q13")["expected"]["count"],
      "one :_tx/changed-entity per changed entity")

# 5. cursors (P6): CURSOR_TRANSITIONS.permittedErrors + RULINGS Q33h R-PAGE-3 / R-PAGE-4
rep = run("G10-CUR-01")
for qid, reason, rule in (("E1", "other-query", "Q33h R-PAGE-4: a different basis is other-query"),
                          ("E2", "other-query", "CE-OTHER-QUERY: another entity type is another query")):
    e = answer(rep, qid, 1).get("error") or {}
    check("G10-CUR-01", qid, error_is(e, "E-CURSOR") and e["reason"] == reason, rule, oracle=e)
e0, e1 = (answer(rep, "E3", n).get("error") or {} for n in (0, 1))
check("G10-CUR-01", "E3", all(error_is(x, "E-CURSOR") and x["reason"] == "malformed" for x in (e0, e1)),
      "Q33h R-PAGE-3: limit 0 and 201 are PaginationCursorError / malformed", oracle=[e0, e1])

# 6. AMBIGUOUS items (P7): the converter's ruled reading must be the contract's GOLDEN_RESOLUTIONS reading
res = json.loads((ROOT / "lab/verify/O02/results/patched.core.json").read_text())
sel = {(r["vector"], r["query"]): r["reading"] for r in CONTRACT["goldenResolutions"]}
for row in res["items"]:
    if row["verdict"] != "AGREE-RULED" or row["item"].startswith("cmd:"):
        continue
    key = (row["vector"], "G5-SUM-13" if row["vector"] == "G5-SUM-13" else row["item"])
    reading = sel.get(key)
    info = row.get("readingsMatched") or row.get("oracle") or {}
    val = info.get(reading)
    if row["vector"] == "Q8F-05":
        # refinement (Q29b): representative = lowest (recordedPosition, op index); Z1 (-0.0) is op 0 of C1
        v = gold("q8f-card-many.json", "Q8F-05")
        c1 = v["commands"][0]["ops"]
        lowest = min(((0, i), op) for i, op in enumerate(c1) if op["entityId"] == "card:5")[1]
        want = int(lowest["value"]["bits"], 16)
        got = next(x for x in run("Q8F-05")["queries"] if x["id"] == "Q1#0")["result"]["properties"]["nums"]["values"]
        ok = reading == "B-ieee-equality" and len(got) == 1 and int(got[0]["value"]["bits"], 16) == want
        check(row["vector"], row["item"], ok, "AMB-08 B + Q29b refinement: one element, lowest support's sign",
              oracle=got, lowestSupport=lowest["label"])
        continue
    ok = val is True or (isinstance(val, dict) and val.get("matchesRawContract") is True)
    check(row["vector"], row["item"], ok, f"GOLDEN_RESOLUTIONS reading {reading} matched by the oracle answer", reading=reading)
# the two command-level AMBIGUOUS expectations
rep = run("C6-03")
o = next(x for x in rep["commandOutcomes"] if x["command"] == 0)["expected"]
check("C6-03", "cmd:C1", o["outcome"] == "committed", "AMB-06 A: retract-pattern over staged facts commits")
rep = run("G9-HO-03")
o = next(x for x in rep["commandOutcomes"] if x["command"] == 0)["expected"]
check("G9-HO-03", "cmd:C1", o["outcome"] == "rejected" and o.get("error") == "E-INVALID-VALUE" and
      o.get("errorTag") == ERRORS["E-INVALID-VALUE"]["tag"] and o.get("reason") == ERRORS["E-INVALID-VALUE"]["reason"],
      "AMB-12 B: validTo <= validFrom is E-INVALID-VALUE before mutation", oracle=o)

counts = {}
for r in ROWS:
    counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
OUT.write_text(json.dumps({"checked": len(ROWS), "counts": counts, "rows": ROWS}, indent=1, default=str) + "\n")
print(json.dumps(counts))
for r in ROWS:
    if r["verdict"] != "AGREE":
        print("--", r["vector"], r["item"], r["rule"], json.dumps({k: v for k, v in r.items() if k in ("oracle", "golden")})[:400])

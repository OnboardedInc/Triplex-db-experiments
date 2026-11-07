"""V-O02 planted wrong expectations, aimed at the areas the O02 converter patch (P1 to P8) touches.

Copies the golden vectors to DIR, plants one wrong expectation per row of PLANTS, runs the patched converter
(lab/verify/O02/convert_and_run.py, byte-identical to the author's) in --negative-control mode, and checks that
every planted item comes back DISAGREE. Also runs V-O01's original 8 mutants through the same patched converter.

  python3 -I lab/verify/O02/tools/plant_errors.py DIR [CONVERTER]   -> lab/verify/O02/results/planted[.<converter>].json
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
CONVERTER = ROOT / (sys.argv[2] if len(sys.argv) > 2 else "lab/verify/O02/convert_and_run.py")
BASE = Path(sys.argv[1])
RESULT = "planted.json" if len(sys.argv) <= 2 else f"planted.{Path(sys.argv[2]).stem}.json"


def fresh(name):
    d = BASE / name
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    for f in (ROOT / "lab/acceptance/golden").glob("*.json"):
        shutil.copy(f, d / f.name)
    return d


def edit(d, fn, fun):
    p = d / fn
    doc = json.loads(p.read_text())
    fun(doc)
    p.write_text(json.dumps(doc))


def vec(doc, vid):
    return next(v for v in doc["vectors"] if v["id"] == vid)


def q(doc, vid, qid):
    return next(x for x in vec(doc, vid)["queries"] if x.get("id") == qid)


def reading(query, rid):
    return next(r for r in query["readings"] if r["id"] == rid)


# (patch, file, vector, item, mutation, function)
PLANTS = []


def plant(patch, fn, vid, item, why):
    def deco(fun):
        PLANTS.append((patch, fn, vid, item, why, fun))
        return fun
    return deco


C5, C6, G1, G5, G9C, G9V, G10, Q8 = ("c5-duplicates-conflicts.json", "c6-journal.json", "g1-int64.json", "g5-sum-overflow.json",
                                       "g9-history-cuts.json", "g9-tiny-v4-retirement.json", "g10-cursor.json",
                                       "q8f-card-many.json")


@plant("P1", C5, "C5-03", "Q1", "conflict set names the wrong attribute (:item/name)")
def _(doc):
    q(doc, "C5-03", "Q1")["expectedError"]["conflicts"] = [{"entityId": "item:3", "attribute": ":item/name"}]


@plant("P1", C5, "C5-07", "Q2", "conflict expected with the wrong _tag (QueryError)")
def _(doc):
    q(doc, "C5-07", "Q2")["expectedError"]["_tag"] = "QueryError"


@plant("P2", G5, "G5-SUM-01", "Q", "overflow expected as number-overflow")
def _(doc):
    vec(doc, "G5-SUM-01")["expectedError"]["code"] = "number-overflow"


@plant("P2", G5, "G5-SUM-10", "Q", "same tag DatalogValidationError, wrong reason (mixed-family)")
def _(doc):
    vec(doc, "G5-SUM-10")["expectedError"]["code"] = "mixed-family"


@plant("P2", G5, "G5-SUM-02", "Q", "exact total off by one (2^62 + 1)")
def _(doc):
    vec(doc, "G5-SUM-02")["expected"]["results"][0]["?total"] = "$int64:4611686018427387905"


@plant("P3", C5, "C5-03", "Q7", "count({name: 'three'}) = 2")
def _(doc):
    q(doc, "C5-03", "Q7")["expected"] = 2


@plant("P3", C5, "C5-03", "Q6", "count({color: 'red'}) succeeds with 1 although color is conflicted")
def _(doc):
    x = q(doc, "C5-03", "Q6")
    x.pop("expectedError")
    x["expected"] = 1


@plant("P3+P7", C5, "C5-03", "Q8", "AMB-17 reading A names the wrong conflicted entity")
def _(doc):
    reading(q(doc, "C5-03", "Q8"), "A-document-references-all-attributes")["expectedError"]["conflicts"] = [
        {"entityId": "item:4", "attribute": ":item/color"}]


@plant("P4", G9C, "G9-CUT-01", "T2", "retractTxId of A1 is C1's tx instead of C2's")
def _(doc):
    q(doc, "G9-CUT-01", "T2")["expected"][0]["knownRetirement"]["retractTxId"] = "$tx:C1"


@plant("P4", G9V, "G9-V4-06", "G9-V4-06-Q4", "retractedAt of 0/present/2 is 1005.25 instead of 1006.25")
def _(doc):
    q(doc, "G9-V4-06", "G9-V4-06-Q4")["expected"]["present"][1]["knownRetirement"]["retractedAt"] = 1005.25


@plant("P4", G9V, "G9-V4-04", "G9-V4-04-Q4", "known retirement of 0/label/0 hidden (null)")
def _(doc):
    q(doc, "G9-V4-04", "G9-V4-04-Q4")["expected"]["label"][0]["knownRetirement"] = None


@plant("P5", C6, "C6-01", "Q12", ":_tx/change count 3 instead of 4")
def _(doc):
    q(doc, "C6-01", "Q12")["expected"]["count"] = 3


@plant("P5", C6, "C6-01", "Q11", "changed entities include j:3 (changed by C3, not C2)")
def _(doc):
    q(doc, "C6-01", "Q11")["expected"]["results"].append({"?e": "j:3"})


@plant("P6", G10, "G10-CUR-01", "E3", "invalid limit expected as other-query")
def _(doc):
    q(doc, "G10-CUR-01", "E3")["expectedError"]["reason"] = "other-query"


@plant("P6", G10, "G10-CUR-01", "E1", "basis change expected as malformed (a 4.7 reason, but the wrong one)")
def _(doc):
    q(doc, "G10-CUR-01", "E1")["expectedError"]["reason"] = "malformed"


@plant("P6", G10, "G10-CUR-01", "E2", "foreign cursor expected with tag ReadError")
def _(doc):
    q(doc, "G10-CUR-01", "E2")["expectedError"]["_tag"] = "ReadError"


@plant("P7", G5, "G5-SUM-13", "Q", "AMB-09 reading B says SUM 20")
def _(doc):
    reading(vec(doc, "G5-SUM-13"), "B-binding-set")["expected"]["results"][0]["?sum"] = 20


@plant("P7", C6, "C6-02", "Q2", "AMB-04 reading B says +0.0")
def _(doc):
    reading(q(doc, "C6-02", "Q2"), "B-exact-value-domain")["expected"] = {"type": "number", "value": 0.0,
                                                                         "bits": "0000000000000000"}


@plant("P7", G1, "G1-I64-01", "Q7", "AMB-16 reading A drops n:p59 (gt is off by one)")
def _(doc):
    reading(q(doc, "G1-I64-01", "Q7"), "A-range-on-int64-supported")["expected"] = ["n:max"]


@plant("P7", G9C, "G9-CUT-01", "Q3", "AMB-01 reading A replaced by the snapshot rendering")
def _(doc):
    reading(q(doc, "G9-CUT-01", "Q3"), "A-raw-lifetime")["expected"] = ["@A1.unretired"]


@plant("P8", G9C, "G9-CUT-01", "Q2", "ordinary match expected in the snapshot shape (no AMB marker)")
def _(doc):
    x = q(doc, "G9-CUT-01", "Q2")
    x["expected"] = ["@A1.unretired"]
    x.pop("ambiguity")
    x.pop("readings")


@plant("P7 fixture", Q8, "Q8F-05", "Q1", "fixture order swapped: Z2 (+0.0) is now op 0, so the representative is +0.0")
def _(doc):
    ops = vec(doc, "Q8F-05")["commands"][0]["ops"]
    ops.reverse()


def run(d):
    proc = subprocess.run([sys.executable, "-I", str(CONVERTER), "--negative-control", str(d)], capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(f"converter failed: {proc.stderr[-2000:]}")
    return json.loads((d / "out/results.json").read_text())


def verdicts(res):
    out = {}
    for r in res["items"]:
        out.setdefault((r["vector"], r["item"]), []).append(r)
    return out


# 1. new plants, all in one copy (each targets a different item)
d = fresh("plants")
for patch, fn, vid, item, why, fun in PLANTS:
    edit(d, fn, fun)
res = verdicts(run(d))
rows = []
for patch, fn, vid, item, why, fun in PLANTS:
    got = [r["verdict"] for r in res.get((vid, item), [])]
    rows.append({"patch": patch, "vector": vid, "item": item, "mutation": why, "verdict": " ".join(got) or "MISSING"})
q8 = json.loads((d / "out/runs/Q8F-05.expected.json").read_text())
q8nums = next(x for x in q8["queries"] if x["id"] == "Q1#0")["result"]["properties"]["nums"]["values"]

# 2. V-O01's 8 mutants through the patched converter
neg = fresh("negative-control")
o01 = []


def m_q8f(doc):
    doc["vectors"][2]["queries"][0]["expected"]["nums"][0]["bits"] = "c000000000000001"
    t = doc["vectors"][0]["queries"][0]["expected"]["tags"]
    t[6], t[7] = t[7], t[6]
    o01.extend([("Q8F-03", "Q1", "bit flip in one binary64"), ("Q8F-01", "Q1", "UTF-16 order instead of codepoint order")])


def m_cut(doc):
    for x in doc["vectors"][0]["queries"]:
        if x["id"] == "N4":
            x["expected"] = [["A1", 100, 200, "$pos:C2", "$tx:C2"]]
        if x["id"] == "Q4":
            x["expected"] = ["@A1.raw"]
    o01.extend([("G9-CUT-01", "N4", "future retirement leaks into the snapshot"), ("G9-CUT-01", "Q4", "exclusive R")])


def m_g5(doc):
    doc["vectors"][6]["expected"]["results"][0]["?total"] = "$int64:9007199254740992"
    o01.append(("G5-SUM-07", "Q", "binary64 rounding of an int64 sum"))


def m_c5(doc):
    doc["vectors"][1]["queries"][3]["expected"][0]["assertionIds"] = ["$id:A1"]
    doc["vectors"][6]["commands"][2]["expect"] = {"outcome": "committed"}
    o01.extend([("C5-02", "Q4", "wrong surviving support"), ("C5-07", "cmd:C3", "worsened violation accepted")])


def m_ho(doc):
    doc["vectors"][0]["queries"][6]["expected"] = ["A1", "A2"]
    o01.append(("G9-HO-01", "V30.5", "inclusive validTo"))


for fn, fun in ((Q8, m_q8f), (G9C, m_cut), (G5, m_g5), (C5, m_c5), ("g9-half-open.json", m_ho)):
    edit(neg, fn, fun)
res2 = verdicts(run(neg))
neg_rows = [{"vector": v, "item": i, "mutation": w, "verdict": " ".join(r["verdict"] for r in res2.get((v, i), [])) or "MISSING"}
            for v, i, w in o01]

out = {"converter": str(CONVERTER.relative_to(ROOT)),
       "plants": {"planted": len(rows), "caught": sum(r["verdict"] == "DISAGREE" for r in rows), "rows": rows},
       "q8f05SwappedOracleAnswer": q8nums,
       "o01NegativeControl": {"planted": len(neg_rows), "caught": sum(r["verdict"] == "DISAGREE" for r in neg_rows),
                              "rows": neg_rows}}
(ROOT / "lab/verify/O02/results" / RESULT).write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps({k: (v if k == "q8f05SwappedOracleAnswer" else {kk: vv for kk, vv in v.items() if kk != "rows"})
                  for k, v in out.items() if k != "converter"}, indent=1))
for r in rows + neg_rows:
    print(r.get("patch", "O01"), r["vector"], r["item"], r["verdict"], "|", r["mutation"])

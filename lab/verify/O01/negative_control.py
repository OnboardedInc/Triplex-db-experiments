"""Comparator control for convert_and_run.py: copy the golden vectors to DIR, plant
seven known-wrong expectations (one per mutation family), and check that every one
comes back DISAGREE.

  python3 -I lab/verify/O01/negative_control.py DIR
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
S = Path(sys.argv[1])
if S.exists():
    shutil.rmtree(S)
S.mkdir(parents=True)
for f in (ROOT / "lab/acceptance/golden").glob("*.json"):
    shutil.copy(f, S / f.name)


def mut(fn, fun):
    p = S / fn
    d = json.loads(p.read_text())
    fun(d)
    p.write_text(json.dumps(d))


PLANTED = []


def q8f(d):
    d["vectors"][2]["queries"][0]["expected"]["nums"][0]["bits"] = "c000000000000001"
    PLANTED.append(("Q8F-03", "Q1", "bit flip in one binary64"))
    t = d["vectors"][0]["queries"][0]["expected"]["tags"]
    t[6], t[7] = t[7], t[6]
    PLANTED.append(("Q8F-01", "Q1", "UTF-16 order instead of codepoint order"))


def cut(d):
    for q in d["vectors"][0]["queries"]:
        if q["id"] == "N4":
            q["expected"] = [["A1", 100, 200, "$pos:C2", "$tx:C2"]]
        if q["id"] == "Q4":
            q["expected"] = ["@A1.raw"]
    PLANTED.append(("G9-CUT-01", "N4", "future retirement leaks into the snapshot"))
    PLANTED.append(("G9-CUT-01", "Q4", "exclusive R"))


def g5(d):
    d["vectors"][6]["expected"]["results"][0]["?total"] = "$int64:9007199254740992"
    PLANTED.append(("G5-SUM-07", "Q", "binary64 rounding of an int64 sum"))


def c5(d):
    d["vectors"][1]["queries"][3]["expected"][0]["assertionIds"] = ["$id:A1"]
    PLANTED.append(("C5-02", "Q4", "wrong surviving support"))
    d["vectors"][6]["commands"][2]["expect"] = {"outcome": "committed"}
    PLANTED.append(("C5-07", "cmd:C3", "worsened violation accepted"))


def ho(d):
    d["vectors"][0]["queries"][6]["expected"] = ["A1", "A2"]
    PLANTED.append(("G9-HO-01", "V30.5", "inclusive validTo"))


mut("q8f-card-many.json", q8f)
mut("g9-history-cuts.json", cut)
mut("g5-sum-overflow.json", g5)
mut("c5-duplicates-conflicts.json", c5)
mut("g9-half-open.json", ho)

subprocess.run([sys.executable, "-I", str(ROOT / "lab/verify/O01/convert_and_run.py"), "--negative-control", str(S)],
               check=True, capture_output=True)
res = json.loads((S / "out/results.json").read_text())
verdicts = {(r["vector"], r["item"]): r["verdict"] for r in res["items"]}
caught = [(v, i, why, verdicts.get((v, i))) for v, i, why in PLANTED]
out = {"planted": len(PLANTED), "caught": sum(1 for c in caught if c[3] == "DISAGREE"),
       "rows": [{"vector": v, "item": i, "mutation": w, "verdict": x} for v, i, w, x in caught]}
(ROOT / "lab/verify/O01/negative_control.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps(out, indent=1))
sys.exit(0 if out["planted"] == out["caught"] else 1)

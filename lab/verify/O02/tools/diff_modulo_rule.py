"""V-O04e: re-judge a differential's differing rows with the in-flight `rule` text ignored, so a row whose only change is
0.4.3's longer ER-INFLIGHT-ALL-OR-NONE label (it now names Q66a) is told apart from a row whose acceptable answers changed.

  python3 -I diff_modulo_rule.py DIFFERENTIAL.json OUT.json
"""
import json
import subprocess
import sys
from pathlib import Path

D = json.loads(Path(sys.argv[1]).read_text())
OLD, NEW = Path(D["old"]), Path(D["new"])
WORK = Path(sys.argv[2]).with_suffix(".work")
WORK.mkdir(parents=True, exist_ok=True)


def run(root, case, out):
    if out.exists():
        out.unlink()
    p = subprocess.run([sys.executable, "-I", str(root / "lab/oracles/replay/cli.py"), str(case), "-o", str(out)], capture_output=True, text=True)
    if p.returncode == 2:
        return {"refused": p.stderr.strip()}
    doc = json.loads(out.read_text())
    doc.pop("oracle", None)
    doc.pop("caseSha256", None)
    for q in doc.get("queries", []):
        if "inFlight" in q:
            q["inFlight"].pop("rule", None)
    return doc


rows = []
for r in D["rows"]:
    case = Path(r["case"])
    a, b = run(OLD, case, WORK / "old.json"), run(NEW, case, WORK / "new.json")
    qa = {q["id"]: q for q in a.get("queries", [])} if "refused" not in a else None
    qb = {q["id"]: q for q in b.get("queries", [])} if "refused" not in b else None
    changed = None if qa is None or qb is None else sorted(k for k in set(qa) | set(qb) if qa.get(k) != qb.get(k))
    rows.append({"case": case.name, "features": r["features"], "ruleTextOnly": a == b, "oldRefused": "refused" in a,
                 "newRefused": "refused" in b, "queriesChangedBeyondRuleText": changed,
                 "otherSectionsEqual": None if qa is None or qb is None else
                 {k: v for k, v in a.items() if k != "queries"} == {k: v for k, v in b.items() if k != "queries"}})
out = {"source": sys.argv[1], "rows": rows, "ruleTextOnly": sum(r["ruleTextOnly"] for r in rows), "total": len(rows)}
Path(sys.argv[2]).write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps({k: v for k, v in out.items() if k != "rows"}))
for r in rows:
    print(("RULE-TEXT-ONLY " if r["ruleTextOnly"] else "ANSWER-CHANGED ") + r["case"], r["features"],
          "refused old/new:", r["oldRefused"], r["newRefused"], "queries:", r["queriesChangedBeyondRuleText"],
          "other sections equal:", r["otherSectionsEqual"])

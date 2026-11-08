"""V-O02: every qlever-lane DISAGREE must be a legacy lane outcome (contract 0.3.3 LEGACY_LANE_OUTCOMES, RULINGS
Q31j, plus Q33i's G1-I64-02 min-exact), and the oracle's qlever answer must be the one that outcome describes:
the committing command is rejected with E-VALUE-OUT-OF-RANGE before mutation, and every query then answers over
the scope without it (no entity, empty match/find, AG-EMPTY-UNGROUPED one row of nulls, AG-EMPTY-GROUPED no rows).

  python3 -I lab/verify/O02/tools/qlever_legacy_check.py -> lab/verify/O02/results/qlever_legacy_check.json
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
res = json.loads((ROOT / "lab/verify/O02/results/patched.qlever.json").read_text())
contract = json.loads((ROOT / "lab/acceptance/obligations.json").read_text())
legacy = set(contract["legacyLaneOutcomes"])
Q33I_EXTRA = {"G1-I64-02#min-exact"}


def legacy_key(row):
    v, i = row["vector"], row["item"]
    if v == "G5-SUM-11":
        return f"{v}#case{i.split('case')[1]}" if "case" in i else v
    if v == "G1-I64-02":
        return f"{v}#{i.split(':')[1]}"
    return v


def empty_answer(row):
    o = row.get("oracle")
    if row["item"].startswith("cmd:"):
        return o.get("outcome") == "rejected" and o.get("error") == "E-VALUE-OUT-OF-RANGE" and \
            o.get("errorTag") == "InvalidTripleError" and o.get("reason") == "value-out-of-range" and o.get("phase") == "preflight"
    if row["vector"] == "G5-SUM-08":
        return o == []                                            # AG-EMPTY-GROUPED
    if row["vector"].startswith("G5-SUM"):
        return isinstance(o, list) and len(o) == 1 and all(x is None for x in o[0].values())   # AG-EMPTY-UNGROUPED
    if isinstance(o, dict) and "items" in o:
        return o["items"] == []
    if isinstance(o, dict):
        return all(x is None for x in o.values())                 # get/getMany: no entity
    return o in ([], None)


rows, unexplained = [], []
for row in res["items"]:
    if row["verdict"] not in ("DISAGREE", "CONVERTER-ERROR"):
        continue
    key = legacy_key(row)
    covered = "0.3.3 LEGACY_LANE_OUTCOMES" if key in legacy else ("Q33i (not yet compiled)" if key in Q33I_EXTRA else None)
    ok = row["verdict"] == "DISAGREE" and empty_answer(row)
    note = None
    if row["verdict"] == "CONVERTER-ERROR":
        note = "converter cannot render Triples.get of an assertion the lane never created: " + row.get("error", "")
    rows.append({"vector": row["vector"], "item": row["item"], "legacy": covered, "oracleMatchesLegacyOutcome": ok, "note": note})
    if covered is None:
        unexplained.append(row)
out = {"disagreeOrError": len(rows), "unexplained": len(unexplained),
       "oracleMatchesLegacyOutcome": sum(r["oracleMatchesLegacyOutcome"] for r in rows), "rows": rows}
(ROOT / "lab/verify/O02/results/qlever_legacy_check.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps({k: v for k, v in out.items() if k != "rows"}))
for r in rows:
    print(r)

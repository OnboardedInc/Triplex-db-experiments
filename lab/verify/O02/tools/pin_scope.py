"""V-O03 recommended pin scope for O-REPLAY 0.3.1: which contract 0.3.5 obligations that use O-REPLAY it may close,
and which stay blocked because a selected case needs something the oracle refuses (X-NOT-MODELED) or answers wrong.

Blocking areas, from the V-O03 probes (results/probe_035.json):
  erasure            R-CMD-13 refuses (Q24, Q31f): CS-ERASURE cases, ER-*, CO-ERASURE-FRONTIER, pii-erasure, GS-16
  scale-evolution    R-DEC-15 refuses (DS-*): DEC-SCALE-WIDEN, DEC-SCALE-WIDEN-MIGRATE, DEC-SCALE-NARROW
  tdk1-keys          R-DEC-17 refuses key bytes: DEC-*-TDK1, DEC-ORDER-KEY-INDEPENDENT (need O-TDK1, not listed)
  wrong-answer       DR-JSON-CONVERT (Q38d): toDecimal(json, p, s) answered E-INVALID-CONVERSION

  python3 -I lab/verify/O02/tools/pin_scope.py -> lab/verify/O02/v-o03/results/pin_scope.json
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
C = json.loads((ROOT / "lab/acceptance/obligations.json").read_text())


def area(set_name, sel):
    if set_name == "CS-ERASURE" or sel.startswith("ER-") or sel in ("CO-ERASURE-FRONTIER", "pii-erasure", "GS-16",
                                                                     "GS-16-WITNESS-POS", "GS-16-WITNESS-NEG"):
        return "erasure"
    if sel in ("DEC-SCALE-WIDEN", "DEC-SCALE-WIDEN-MIGRATE", "DEC-SCALE-NARROW"):
        return "scale-evolution"
    if sel in ("DEC-SMALL-PRECISION-TDK1", "DEC-LARGE-PRECISION-TDK1", "DEC-ORDER-KEY-INDEPENDENT"):
        return "tdk1-keys"
    if sel == "DR-JSON-CONVERT" or (set_name == "CS-DECIMAL-ROUTING" and sel == "all"):
        return "wrong-answer"
    return None


may, blocked = [], []
for o in C["obligations"]:
    if "O-REPLAY" not in (o.get("oracles") or []):
        continue
    hits = {}
    for c in o["cases"]:
        for s in c["select"]:
            a = area(c["set"], s)
            if a:
                hits.setdefault(a, []).append(f"{c['set']}:{s}")
    gates = (o.get("closure") or {}).get("params", {}).get("gates") or []
    row = {"id": o["id"], "oracles": o["oracles"], "gates": gates}
    if hits:
        blocked.append(dict(row, blockedBy=hits))
    else:
        may.append(row)
caveats = {
    "G7.outbox.publication-sequence": "outbox delivery semantics come from O-DOMAIN; outbox steps are not O-REPLAY ops "
                                      "(an unknown op name is answered E-INVALID-VALUE per Q33f R-CMD-9)",
    "GS.19": "as G7.outbox.publication-sequence",
    "G1.types.storage-widening-safe": "a case that redeclares a decimal attribute is refused (R-DEC-15); others answer",
    "G7.migration.schema-evolution": "a case that redeclares a decimal attribute is refused (R-DEC-15); others answer",
}
out = {"contract": C["version"], "oracle": "O-REPLAY 0.3.1 at 8cc2c26", "usesOReplay": len(may) + len(blocked),
       "mayClose": len(may), "blocked": len(blocked), "blockedRows": blocked,
       "mayCloseIds": [r["id"] for r in may], "caseLevelCaveats": caveats}
(ROOT / "lab/verify/O02/v-o03/results/pin_scope.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps({k: out[k] for k in ("contract", "usesOReplay", "mayClose", "blocked")}))
for r in blocked:
    print(r["id"], "|", ", ".join(f"{k}: {len(v)}" for k, v in r["blockedBy"].items()), "|", r["gates"])

"""V-O02: does any golden vector exercise a 0.3.3 rule that O-REPLAY 0.2.0 does not model?

Scans every golden file for: decimal values; json values (and -0 inside them); datetime values equal to -0;
transactions/transactionsForEntity limits outside 1..1000; negative bases; receipts; calls with divide/round or
'decimal'; erasure operations; range predicates with a string constant (possible cross-family ordering).

  python3 -I lab/verify/O02/tools/scan_golden_delta.py -> lab/verify/O02/results/scan_golden_delta.json
"""
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
KEYS = ("decimal-value", "json-value", "json-negzero", "datetime-value", "datetime-negzero", "receipts", "erase-op",
        "negative-basis", "transactions-limit", "decimal-arith-call", "string-range-predicate")
hits = {k: [] for k in KEYS}


def negzero_in(x):
    if isinstance(x, float):
        return x == 0 and math.copysign(1, x) < 0
    if isinstance(x, list):
        return any(negzero_in(i) for i in x)
    if isinstance(x, dict):
        return any(negzero_in(i) for i in x.values())
    return False


def walk(node, path, file):
    if isinstance(node, dict):
        t = node.get("type")
        if t == "decimal":
            hits["decimal-value"].append(f"{file}:{path}")
        if t == "json":
            hits["json-value"].append(f"{file}:{path}")
            if negzero_in(node.get("value")):
                hits["json-negzero"].append(f"{file}:{path}")
        if t == "datetime":
            hits["datetime-value"].append(f"{file}:{path}")
            if str(node.get("bits", "")).lower().replace("0x", "") == "8000000000000000" or negzero_in(node.get("value")):
                hits["datetime-negzero"].append(f"{file}:{path}")
        if "receipts" in node:
            hits["receipts"].append(f"{file}:{path}")
        if node.get("op") in ("erase", "erasure", "shred"):
            hits["erase-op"].append(f"{file}:{path}")
        for k in ("recordedAt", "validAt"):
            v = node.get(k)
            if isinstance(v, (int, float)) and not isinstance(v, bool) and v < 0:
                hits["negative-basis"].append(f"{file}:{path}.{k}")
        for k, v in node.items():
            walk(v, f"{path}.{k}", file)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk(v, f"{path}[{i}]", file)
    elif isinstance(node, str) and path.endswith(".call"):
        if re.search(r"transactions(ForEntity)?\(.*limit: *(0\b|-|[1-9]\d{3,})", node):
            hits["transactions-limit"].append(f"{file}:{path}")
        if re.search(r"\b(divide|round)\(|decimal", node):
            hits["decimal-arith-call"].append(f"{file}:{path}")
        if re.search(r"\b(gt|gte|lt|lte)\s*:\s*'", node):
            hits["string-range-predicate"].append(f"{file}:{path} {node[:80]}")


for f in sorted((ROOT / "lab/acceptance/golden").glob("*.json")):
    walk(json.loads(f.read_text()), "$", f.name)
out = {k: {"count": len(v), "where": v[:20]} for k, v in hits.items()}
(ROOT / "lab/verify/O02/results/scan_golden_delta.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps({k: v["count"] for k, v in out.items()}))
for k, v in out.items():
    if v["count"]:
        print(k, v["where"][:6])

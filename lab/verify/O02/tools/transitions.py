"""Per-item verdict transitions between two converter result files (same oracle, different converter).

  python3 -I transitions.py BEFORE.json AFTER.json
"""
import json
import sys
from collections import Counter

a = json.load(open(sys.argv[1]))
b = json.load(open(sys.argv[2]))


def keyed(d):
    out = {}
    for r in d["items"]:
        k = (r["vector"], r["item"])
        out.setdefault(k, []).append(r)
    return out


ka, kb = keyed(a), keyed(b)
trans = Counter()
detail = []
for k in sorted(set(ka) | set(kb), key=str):
    va = sorted(r["verdict"] for r in ka.get(k, []))
    vb = sorted(r["verdict"] for r in kb.get(k, []))
    trans[(" ".join(va) or "-", " ".join(vb) or "-")] += 1
    if va != vb:
        detail.append((k, va, vb))
for (x, y), n in sorted(trans.items()):
    print(f"{n:4d}  {x:30s} -> {y}")
print()
for k, va, vb in detail:
    print(k, va, "->", vb)

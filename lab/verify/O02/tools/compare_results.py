"""Compare two converter result files item by item (vector, item, verdict) and print counts.

  python3 -I compare_results.py MINE.json AUTHOR.json
"""
import json
import sys


def load(p):
    d = json.load(open(p))
    rows = {}
    for r in d["items"]:
        rows.setdefault((r["vector"], r["item"]), []).append(r["verdict"])
    return d, rows


a, ra = load(sys.argv[1])
b, rb = load(sys.argv[2])
print("mine  ", json.dumps(a["itemCounts"], sort_keys=True), json.dumps(a["vectorCounts"], sort_keys=True))
print("author", json.dumps(b["itemCounts"], sort_keys=True), json.dumps(b["vectorCounts"], sort_keys=True))
diff = [(k, ra.get(k), rb.get(k)) for k in sorted(set(ra) | set(rb), key=str) if sorted(ra.get(k) or []) != sorted(rb.get(k) or [])]
vv = [(k, a["vectorVerdicts"].get(k), b["vectorVerdicts"].get(k)) for k in sorted(set(a["vectorVerdicts"]) | set(b["vectorVerdicts"]))
      if a["vectorVerdicts"].get(k) != b["vectorVerdicts"].get(k)]
print("item verdict differences:", len(diff))
for d in diff:
    print("  ", d)
print("vector verdict differences:", len(vv))
for d in vv:
    print("  ", d)

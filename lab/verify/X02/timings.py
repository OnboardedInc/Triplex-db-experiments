#!/usr/bin/env python3
"""V-X02: per-workload query time (s) from G2 receipts: python3 -I timings.py <receipt.json>..."""
import json
import sys

rows = {}
names = []
for path in sys.argv[1:]:
    r = json.load(open(path))
    name = path.split("/")[-1].replace(".json", "")[-14:]
    names.append(name)
    for w in (r.get("timings") or {}).get("workloads", []):
        rows.setdefault(w["id"], {})[name] = (round((w.get("queryMs") or 0) / 1000, 1), w.get("status"))
print("workload " + " ".join(f"{n:>24}" for n in names))
for wid in sorted(rows):
    print(f"{wid:>8} " + " ".join(f"{str(rows[wid].get(n, ('-', '-'))):>24}" for n in names))

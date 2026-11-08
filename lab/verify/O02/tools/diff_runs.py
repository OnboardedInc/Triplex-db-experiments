"""V-O03: compare the oracle's raw answers (not converter verdicts) between two run directories of the same cases.

Ignores the `oracle` block (version, source hashes) and `caseSha256`. Reports every query result, command outcome,
receipt-consistency or state difference, so an answer change hidden from the converter's comparisons still shows.

  python3 -I diff_runs.py OLD_RUNS NEW_RUNS [OUT.json]
"""
import json
import sys
from pathlib import Path

old, new = Path(sys.argv[1]), Path(sys.argv[2])


def strip(doc):
    doc = dict(doc)
    doc.pop("oracle", None)
    doc.pop("caseSha256", None)
    return doc


def walk(a, b, path, out):
    if type(a) is not type(b):
        out.append((path, a, b))
        return
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                out.append((f"{path}.{k}", a.get(k, "<absent>"), b.get(k, "<absent>")))
            else:
                walk(a[k], b[k], f"{path}.{k}", out)
    elif isinstance(a, list):
        if len(a) != len(b):
            out.append((path + ".len", len(a), len(b)))
        for i, (x, y) in enumerate(zip(a, b)):
            walk(x, y, f"{path}[{i}]", out)
    elif a != b:
        out.append((path, a, b))


rows = []
names = sorted(p.name for p in old.glob("*.expected.json"))
missing = sorted(set(p.name for p in new.glob("*.expected.json")) ^ set(names))
for name in names:
    if not (new / name).exists():
        continue
    a, b = strip(json.loads((old / name).read_text())), strip(json.loads((new / name).read_text()))
    diffs = []
    walk(a, b, "$", diffs)
    for path, x, y in diffs:
        rows.append({"file": name, "path": path, "old": x, "new": y})
summary = {"files": len(names), "filesOnlyInOne": missing, "differences": len(rows),
           "filesWithDifferences": sorted({r["file"] for r in rows})}
if len(sys.argv) > 3:
    Path(sys.argv[3]).write_text(json.dumps({"summary": summary, "rows": rows}, indent=1, default=str) + "\n")
print(json.dumps(summary, indent=1))
for r in rows[:80]:
    print(r["file"], r["path"], json.dumps(r["old"], default=str)[:120], "->", json.dumps(r["new"], default=str)[:120])

"""V-O04b: how much the random differential cases exercise (outcomes, query results vs errors, error ids, kinds).

  python3 -I fuzz_stats.py CASE_DIR SAMPLE -> prints a JSON tally (and writes lab/verify/O02/v-o04b/results/fuzz_stats.json)
"""
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
CLI = ROOT / "lab/oracles/replay/cli.py"
cases = sorted(Path(sys.argv[1]).glob("fuzz-*.case.json"))[: int(sys.argv[2])]
outcomes, results, errors, kinds_ok = Counter(), Counter(), Counter(), Counter()
refused = 0
for p in cases:
    o = p.with_suffix(".stats.json")
    proc = subprocess.run([sys.executable, "-I", str(CLI), str(p), "-o", str(o)], capture_output=True, text=True)
    if proc.returncode == 2:
        refused += 1
        continue
    d = json.loads(o.read_text())
    for c in d["commandOutcomes"]:
        e = c["expected"]
        outcomes[e["outcome"] + ("/" + e.get("error", "") if e.get("error") else "")] += 1
    for q in d["queries"]:
        if "error" in q:
            errors[q["error"]["error"]] += 1
        else:
            results[q["kind"]] += 1
            kinds_ok[q["kind"]] += 1
out = {"cases": len(cases), "refused": refused, "commandOutcomes": dict(outcomes), "queryResultsByKind": dict(results),
       "queryErrors": dict(errors)}
(ROOT / "lab/verify/O02/v-o04b/results/fuzz_stats.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps(out, indent=1))

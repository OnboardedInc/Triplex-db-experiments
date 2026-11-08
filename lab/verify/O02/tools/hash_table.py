"""V-O02 per-file sha256 table for O-REPLAY 0.2.0, verified three ways:

1. the file bytes at the author's commit 03519ae (git cat-file blob; passed in as a directory extracted from
   `git archive 03519ae lab/oracles/replay`), 2. the working tree on verify/O02 (after the merge with main),
3. the oracle's own self-reported `oracle.sourceSha256` in an output document it wrote during this verification.
Also checks the golden files against the contract's goldenFilesPinned, and hashes the converter artifacts.

  python3 -I lab/verify/O02/tools/hash_table.py EXTRACTED_03519AE_ROOT -> lab/verify/O02/results/hashes.json
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
AT = Path(sys.argv[1])
ORACLE = "lab/oracles/replay"


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


self_report = json.loads((ROOT / "lab/verify/O02/runs/C5-03.expected.json").read_text())["oracle"]
rows = []
for p in sorted((AT / ORACLE).rglob("*")):
    if not p.is_file() or "__pycache__" in p.parts:
        continue
    rel = p.relative_to(AT).as_posix()
    here = ROOT / rel
    a, b = sha(p), (sha(here) if here.exists() else None)
    name = p.relative_to(AT / ORACLE).as_posix()
    rep = self_report["sourceSha256"].get(name)
    rows.append({"path": rel, "sha256": a, "sameOnVerifyO02": a == b,
                 "oracleSelfReport": None if rep is None else rep == a})
extra = sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / ORACLE).rglob("*")
               if p.is_file() and "__pycache__" not in p.parts and not (AT / p.relative_to(ROOT)).exists())
contract = json.loads((ROOT / "lab/acceptance/obligations.json").read_text())
golden = [{"path": k, "pinned": v, "sha256": sha(ROOT / k), "match": sha(ROOT / k) == v}
          for k, v in contract["goldenFilesPinned"].items()]
tools = [{"path": p.relative_to(ROOT).as_posix(), "sha256": sha(p)}
         for p in sorted((ROOT / "lab/verify/O02").glob("*.py")) + sorted((ROOT / "lab/verify/O02/tools").glob("*.py"))]
ext = Path("/Users/sam/Claude/Projects/triplex-db-2/EXP-O02-oracle-conformance/converter-rerun")
author = [{"path": str(p), "sha256": sha(p)} for p in sorted(ext.glob("*"))] if ext.exists() else []
out = {"oracleVersion": self_report["version"], "commit": "03519ae5208790f669b5011b22af8a5658dab83c",
       "files": rows, "filesNotAt03519ae": extra,
       "allSameOnVerifyO02": all(r["sameOnVerifyO02"] for r in rows),
       "selfReportedAllMatch": all(r["oracleSelfReport"] is not False for r in rows),
       "selfReportedCount": len(self_report["sourceSha256"]),
       "goldenFilesPinned": golden, "goldenAllMatch": all(g["match"] for g in golden),
       "verifierTools": tools, "authorEvidence": author,
       "contractOraclePins": {"O-REPLAY": contract["oracleFilesPinned"]["O-REPLAY"],
                              "oraclesEntry": [o for o in contract["oracles"] if o.get("id") == "O-REPLAY"]
                              if isinstance(contract["oracles"], list) else contract["oracles"].get("O-REPLAY")}}
(ROOT / "lab/verify/O02/results/hashes.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps({k: out[k] for k in ("oracleVersion", "allSameOnVerifyO02", "selfReportedAllMatch", "selfReportedCount",
                                      "goldenAllMatch", "filesNotAt03519ae", "contractOraclePins")}, indent=1))
for r in rows:
    print(r["sha256"], r["path"], "" if r["sameOnVerifyO02"] else "CHANGED", {None: "", True: "self-report ok"}.get(
        r["oracleSelfReport"], "SELF-REPORT MISMATCH"))

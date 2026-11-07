"""V-O03 per-file sha256 table for O-REPLAY at a commit, verified four ways:

1. bytes at the commit (a directory extracted from `git archive <commit> lab/oracles/replay`),
2. the working tree on verify/O02 after the merge,
3. the oracle's self-reported `oracle.sourceSha256` in an output it wrote during this verification,
4. the author's hash file, when given.

  python3 -I hash_verify.py EXTRACTED_ROOT COMMIT RUN_OUTPUT.json OUT.json [AUTHOR_HASH_FILE]
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
AT, COMMIT, RUN, OUT = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4])
AUTHOR = Path(sys.argv[5]) if len(sys.argv) > 5 else None
ORACLE = "lab/oracles/replay"


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


author = {}
if AUTHOR:
    for line in AUTHOR.read_text().splitlines():
        if line.strip():
            h, path = line.split(None, 1)
            author[path.strip()] = h
oracle = json.loads(RUN.read_text())["oracle"]
rows = []
for p in sorted((AT / ORACLE).rglob("*")):
    if not p.is_file() or "__pycache__" in p.parts:
        continue
    rel = p.relative_to(AT).as_posix()
    here = ROOT / rel
    h = sha(p)
    name = p.relative_to(AT / ORACLE).as_posix()
    rep = oracle["sourceSha256"].get(name)
    rows.append({"path": rel, "sha256": h, "sameOnVerifyO02": here.exists() and sha(here) == h,
                 "oracleSelfReport": None if rep is None else rep == h,
                 "author": None if not author else author.get(rel) == h})
tree = {p.relative_to(ROOT).as_posix() for p in (ROOT / ORACLE).rglob("*") if p.is_file() and "__pycache__" not in p.parts}
at = {r["path"] for r in rows}
out = {"commit": COMMIT, "oracleVersion": oracle["version"], "files": rows, "count": len(rows),
       "onlyInWorkingTree": sorted(tree - at), "onlyAtCommit": sorted(at - tree),
       "authorPathsMissingHere": sorted(set(author) - at),
       "allSameOnVerifyO02": all(r["sameOnVerifyO02"] for r in rows),
       "selfReportedAllMatch": all(r["oracleSelfReport"] is not False for r in rows),
       "selfReported": len(oracle["sourceSha256"]),
       "authorAllMatch": None if not author else all(r["author"] for r in rows) and not (set(author) - at)}
OUT.write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps({k: v for k, v in out.items() if k != "files"}, indent=1))
for r in rows:
    flags = [k for k in ("sameOnVerifyO02", "oracleSelfReport", "author") if r[k] is False]
    print(r["sha256"], r["path"], ("MISMATCH " + ",".join(flags)) if flags else "")

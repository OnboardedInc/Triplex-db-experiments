"""CX-VO04H: probe the integer page selector inside the reference continuation (Q70m's 'any other').

Run against a scratch git archive: python3 -I probe_reference_page.py SCRATCH_ROOT OUT_DIR
"""
import json
from pathlib import Path
import subprocess
import sys

ROOT, OUT = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
HERE = Path(__file__).resolve().parents[4]
if ROOT == HERE or HERE in ROOT.parents or ROOT in HERE.parents:
    raise SystemExit("oracle must be outside the worktree")
OUT.mkdir(parents=True, exist_ok=True)
ops = [{"op": "assert", "ref": f"a{k}", "entityId": f"e{k}", "attribute": ":t/v", "entityType": "T",
        "value": {"type": "integer", "value": str(k)}, "validFrom": 0} for k in range(4)]
rows = []
for label, value, expected in (("integer-zero", 0, "answer"), ("string-zero", "0", "malformed"),
                               ("float-zero", 0.0, "malformed"), ("negative-two", -2, "malformed"),
                               ("boolean-true", True, "malformed")):
    case = {"format": "triplex-db-2/o-replay-case/1", "caseId": f"CX-VO04H/reference-page/{label}",
            "commands": [{"clock": 100, "operations": ops}], "queries": [
                {"id": "a", "kind": "entityPage", "entityType": "T", "limit": 1, "cut": {"validAt": 1}},
                {"id": "b", "kind": "entityPage", "entityType": "T", "limit": 1,
                 "cursorFrom": {"query": "a", "page": value}}]}
    path, output = OUT / f"{label}.case.json", OUT / f"{label}.expected.json"
    path.write_text(json.dumps(case) + "\n")
    # [CX-VO04H] Why: inspect exit status and output existence separately; crash exit 1 is not a typed malformed exit 2.
    # Rejected: calling any nonzero code a refusal (it would hide the decimal-page ValueError).
    proc = subprocess.run([sys.executable, "-I", str(ROOT / "lab/oracles/replay/cli.py"), str(path), "-o", str(output)],
                          cwd=ROOT, capture_output=True, text=True)
    (OUT / f"{label}.stderr.txt").write_text(proc.stderr)
    result = json.loads(output.read_text())["queries"][1] if output.exists() else None
    ok = proc.returncode == 0 and result is not None if expected == "answer" else proc.returncode == 2 and not output.exists()
    rows.append({"label": label, "page": value, "ruling": "Q70m any other integer continuation parameter",
                 "expected": expected, "exit": proc.returncode, "outputWritten": output.exists(),
                 "match": ok, "continuation": result, "stderr": proc.stderr})
(OUT / "summary.json").write_text(json.dumps({"root": str(ROOT), "rows": rows}, indent=2) + "\n")
for r in rows:
    print(r["label"], "exit", r["exit"], "match", r["match"])

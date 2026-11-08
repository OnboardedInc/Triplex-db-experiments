"""V-O04h: plant a new paged query kind (an output carrying a next* field, not in run.CONTINUATIONS) into a SCRATCH copy
of O-REPLAY and run its self-check, once per plant, restoring the files after each. The Q70l self-check section
"Q70l continuation table" must fail for every plant; a plant it passes is a way a new paged kind can stay off the table.

  python3 -I plant_paged_kind.py SCRATCH_ROOT OUT.json     (SCRATCH_ROOT: an extracted `git archive`, never the repo)

Plants:
  P1 tuple literal     ("nextPage", 1) in the kind's own function (the author's unit-test shape)
  P2 computed key      field = "next" + "Page"; (field, 1)
  P3 helper elsewhere  the kind (views.py) calls entities.page_out(), which builds ("nextPage", 1)
  P4 dict literal      the kind returns V.OrderedOut([...]) holding a dict {"nextPage": 1}
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2])
HERE = Path(__file__).resolve().parents[4]
if HERE == ROOT or HERE in ROOT.parents or ROOT in HERE.parents:
    raise SystemExit("refusing: SCRATCH_ROOT must be a scratch copy outside the repository")
PKG = ROOT / "lab/oracles/replay"
FILES = ["views.py", "entities.py", "run.py"]
ORIGINAL = {f: (PKG / f).read_text() for f in FILES}
HOOK = 'for _kind in ("orderKey", "decimalKey", "tdk1Key"):'

PLANTS = {
    "P1 tuple literal": {
        "views.py": '\n\ndef q_fake_paged(run, query):\n    return V.OrderedOut([("rows", []), ("nextPage", 1)])\n',
        "register": 'QUERIES["fakePaged"] = W.q_fake_paged\n'},
    "P2 computed key": {
        "views.py": '\n\ndef q_fake_paged(run, query):\n    field = "next" + "Page"\n    return V.OrderedOut([("rows", []), (field, 1)])\n',
        "register": 'QUERIES["fakePaged"] = W.q_fake_paged\n'},
    "P3 helper elsewhere": {
        "entities.py": '\n\ndef page_out(rows):\n    return V.OrderedOut([("rows", rows), ("nextPage", 1)])\n',
        "views.py": '\n\ndef q_fake_paged(run, query):\n    from . import entities as EN\n    return EN.page_out([])\n',
        "register": 'QUERIES["fakePaged"] = W.q_fake_paged\n'},
    "P4 dict literal": {
        "views.py": '\n\ndef q_fake_paged(run, query):\n    return V.OrderedOut([("rows", []), ("page", {"nextPage": 1})])\n',
        "register": 'QUERIES["fakePaged"] = W.q_fake_paged\n'},
}


def section(report):
    for s in report.get("sections", []):
        if "Q70l" in s.get("section", ""):
            return s
    return None


# [CX-VO04I] Why: inspect mixed containers after JSON serialization, including null-valued keys.
# Rejected: only repeating the author's top-level OrderedOut plants (insufficient shape diversity).
PLANTS.update({
    "P5 mixed array tree": {
        "views.py": '\n\ndef q_fake_paged(run, query):\n    return V.OrderedOut([("pages", [{"items": [0, {"payload": V.OrderedOut([("nextOffset", None)])}]}])])\n',
        "register": 'QUERIES["fakePaged"] = W.q_fake_paged\n'},
    "P6 tuple in object": {
        "views.py": '\n\ndef q_fake_paged(run, query):\n    return {"payload": ([], {"nested": [{"next" + "Token": "token"}]})}\n',
        "register": 'QUERIES["fakePaged"] = W.q_fake_paged\n'},
    "P7 missing fixture": {
        "views.py": '\n\ndef q_fake_paged(run, query):\n    raise V.OracleInputError("missing fake fixture")\n',
        "register": 'QUERIES["fakePaged"] = W.q_fake_paged\n'},
    "P8 unencodable output": {
        "views.py": '\n\ndef q_fake_paged(run, query):\n    return {"payload": {1, 2}}\n',
        "register": 'QUERIES["fakePaged"] = W.q_fake_paged\n'},
})
rows = []
try:
    for name, plant in PLANTS.items():
        for f in FILES:
            (PKG / f).write_text(ORIGINAL[f])
        for f in ("views.py", "entities.py"):
            if f in plant:
                (PKG / f).write_text(ORIGINAL[f] + plant[f])
        run_py = ORIGINAL["run.py"]
        assert run_py.count(HOOK) == 1
        (PKG / "run.py").write_text(run_py.replace(HOOK, plant["register"] + HOOK))
        proc = subprocess.run([sys.executable, "-I", str(PKG / "cli.py"), "--self-check"], capture_output=True, text=True, cwd=str(ROOT))
        # [CX-VO04I] Why: demonstrate that each registered plant actually emits nextPage through the public CLI.
        # Rejected: interpreting AST text alone as evidence of a paged output (it could be unreachable).
        artifacts = OUT.parent / "plant-artifacts"
        artifacts.mkdir(exist_ok=True)
        stem = name.split()[0]
        case_file = artifacts / f"{stem}.case.json"
        case_file.write_text(json.dumps({"format": "triplex-db-2/o-replay-case/1", "caseId": f"CX-VO04I/{stem}",
                                        "queries": [{"id": "fake", "kind": "fakePaged"}]}) + "\n")
        fake = subprocess.run([sys.executable, "-I", str(PKG / "cli.py"), str(case_file)],
                              capture_output=True, text=True, cwd=str(ROOT))
        (artifacts / f"{stem}.expected.json").write_text(fake.stdout)
        (artifacts / f"{stem}.self-check.json").write_text(proc.stdout)
        try:
            report = json.loads(proc.stdout)
        except ValueError:
            rows.append({"plant": name, "exit": proc.returncode, "stderr": proc.stderr[-400:]})
            continue
        sec = section(report)
        failed = [r["check"] for r in (sec or {}).get("checks", []) if not r.get("pass")]
        rows.append({"plant": name, "exit": proc.returncode, "selfCheckStatus": report.get("status"),
                     "q70lSection": {k: v for k, v in (sec or {}).items() if k != "checks"}, "failedChecks": failed,
                     "fakeQueryExit": fake.returncode, "runtimeCheck": next((c for c in (sec or {}).get("checks", []) if c["check"].endswith(":fakePaged")), None),
                     "fakeQueryOutput": json.loads(fake.stdout)["queries"] if fake.returncode == 0 else fake.stderr})
finally:
    for f in FILES:
        (PKG / f).write_text(ORIGINAL[f])
OUT.write_text(json.dumps({"root": str(ROOT), "plants": rows}, indent=1) + "\n")
for r in rows:
    print(json.dumps(r)[:400])

assert len(rows) == len(PLANTS)
assert all(r.get("exit") == 1 and r.get("selfCheckStatus") == "FAIL" and r.get("failedChecks") for r in rows), rows
assert all(r.get("fakeQueryExit") == 0 for r in rows[:6]), rows
assert all(r["runtimeCheck"]["exercised"] == 4 and not r["runtimeCheck"]["errors"] and r["runtimeCheck"]["nextFields"] for r in rows[:6]), rows
assert all(r["runtimeCheck"]["exercised"] == 0 and len(r["runtimeCheck"]["errors"]) == 4 for r in rows[6:]), rows

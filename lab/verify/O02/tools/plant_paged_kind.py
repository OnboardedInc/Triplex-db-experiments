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
        try:
            report = json.loads(proc.stdout)
        except ValueError:
            rows.append({"plant": name, "exit": proc.returncode, "stderr": proc.stderr[-400:]})
            continue
        sec = section(report)
        failed = [r["check"] for r in (sec or {}).get("checks", []) if not r.get("pass")]
        rows.append({"plant": name, "exit": proc.returncode, "selfCheckStatus": report.get("status"),
                     "q70lSection": {k: v for k, v in (sec or {}).items() if k != "checks"}, "failedChecks": failed})
finally:
    for f in FILES:
        (PKG / f).write_text(ORIGINAL[f])
OUT.write_text(json.dumps({"root": str(ROOT), "plants": rows}, indent=1) + "\n")
for r in rows:
    print(json.dumps(r)[:400])

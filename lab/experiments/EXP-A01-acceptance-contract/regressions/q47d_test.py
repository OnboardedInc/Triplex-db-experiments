"""Q47d regression: a pending row in RULINGS-PENDING.md neither fails generation (nor --verify) nor gains authority.
Also checks that the 0.3.6 prohibition and a pending-as-compiled mutant are caught with the row present."""
import json, pathlib, subprocess, sys
REPO = pathlib.Path("/Users/sam/projects/triplex-db-2")
ACC = REPO / "lab/acceptance"
PEND = ACC / "RULINGS-PENDING.md"
GEN = ACC / "build_contract.py"
orig = PEND.read_text()
before = {n: (ACC / n).read_text() for n in ("obligations.json", "ACCEPTANCE.md", "load-contract.json", "budgets.json", "capability-matrix.md")}
fails = []


def run(path, *args):
    return subprocess.run([sys.executable, "-I", str(path), *args], capture_output=True, text=True, cwd=str(REPO))


try:
    PEND.write_text(orig.rstrip("\n") + "\n\n| Q | Ruling | Basis |\n| --- | --- | --- |\n| Q99z probe | a held ruling row with no authority | test |\n")
    r = run(GEN)
    out = r.stdout + r.stderr
    if r.returncode != 0 or "second regeneration byte-identical" not in out:
        fails.append("generation or --verify failed with a pending row present: " + out.strip().splitlines()[0][:200])
    r2 = run(GEN, "--verify")
    if r2.returncode != 0:
        fails.append("standalone --verify failed with a pending row present")
    d = json.loads((ACC / "obligations.json").read_text())
    if d["pendingRulings"]["ids"] != ["Q99z"]:
        fails.append(f"pending id not listed: {d['pendingRulings']['ids']}")
    if any(x["id"].startswith("Q99") for x in d["rulings"]):
        fails.append("pending row gained authority (compiled ruling)")
    if d["inputs"]["lab/acceptance/RULINGS-PENDING.md"] != d["pendingRulings"]["sha256"]:
        fails.append("pending file hash not recorded consistently")
    src = GEN.read_text()
    for name, a, b in (
            ("0.3.6 prohibition reinstated", '    # RULINGS Q47d: pending rows are listed, never compiled, and never fail generation by existing\n',
             '    # RULINGS Q47d: pending rows are listed, never compiled, and never fail generation by existing\n    if re.search(r"^\\| Q\\d+", (REPO / "lab/acceptance/RULINGS-PENDING.md").read_text(), re.M):\n        e.append("RULINGS-PENDING.md still holds ruling rows")\n'),
            ("pending rows read as RULINGS.md rows", '    return ruling_row_ids((REPO / "lab/acceptance/RULINGS.md").read_text())',
             '    return ruling_row_ids((REPO / "lab/acceptance/RULINGS.md").read_text() + (REPO / PENDING_RULINGS_FILE).read_text())')):
        assert src.count(a) == 1, name
        mut = ACC / "_q47d_mut.py"
        mut.write_text(src.replace(a, b, 1).replace("        (HERE / name).write_text(text)", "        pass"))
        rm = run(mut)
        mut.unlink()
        first = (rm.stdout + rm.stderr).strip().splitlines()
        if name == "0.3.6 prohibition reinstated":
            # the regression this ruling forbids: with a pending row present, generation must not fail; so the mutant failing proves the
            # harness detects the regression (the shipped generator passed above)
            if rm.returncode == 0:
                fails.append(f"mutant '{name}' unexpectedly passed")
            else:
                print(f"DETECTED regression '{name}': {first[1] if len(first) > 1 else first[0]}")
        else:
            if rm.returncode == 0 or not first or not first[0].startswith("CONTRACT INVALID"):
                fails.append(f"mutant '{name}' not caught")
            else:
                print(f"CAUGHT '{name}': {first[1][:160]}")
finally:
    PEND.write_text(orig)
    r = run(GEN)
    after = {n: (ACC / n).read_text() for n in before}
    if r.returncode != 0 or after != before:
        fails.append("restore did not reproduce the original outputs byte for byte")
print("Q47d external test:", "PASS" if not fails else "FAIL " + "; ".join(fails))

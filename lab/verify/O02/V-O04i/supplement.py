"""CX-VO04I additional controls and raw differential receipts; run after rerun.py via heavy.mjs."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
BASE = HERE / "results"
OUT = HERE / "supplement-results"
OUT.mkdir(exist_ok=True)
SCRATCH = Path(json.loads((BASE / "provenance.json").read_text())["scratch"])
NEW, OLD = SCRATCH / "atf195f30", SCRATCH / "at3c52a1d"
PY = sys.executable
LOG = []


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def save(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2) + "\n")


def run(name, args, cwd=NEW):
    start = time.time()
    proc = subprocess.run([str(a) for a in args], cwd=cwd, capture_output=True, text=True)
    (OUT / f"{name}.stdout.txt").write_text(proc.stdout)
    (OUT / f"{name}.stderr.txt").write_text(proc.stderr)
    LOG.append({"name": name, "argv": [str(a) for a in args], "cwd": str(cwd), "exit": proc.returncode,
                "seconds": round(time.time() - start, 3)})
    save("commands.json", LOG)
    print(name, "exit", proc.returncode, flush=True)
    return proc


# [CX-VO04I] Why: the first batch acquired a slot during tool enhancement; keep its exact
# original tool bytes and receipts, and bind the enhancements in a distinct later attempt.
# Rejected: overwriting first-attempt outputs or labeling later tool hashes as earlier ones.
save("provenance.json", {"scratch": str(SCRATCH), "reason": "Stronger plant assertions, actual exponent lexeme and 5000-digit page control; raw differential receipts",
                         "toolHashes": {p.name: sha(p) for p in HERE.glob("*.py")},
                         "hostDiskFreeBytesBefore": shutil.disk_usage(SCRATCH).free,
                         "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
run("self-check.048", [PY, "-I", OLD / "lab/oracles/replay/cli.py", "--self-check", "-o", OUT / "self-check.048.json"], cwd=OLD)
run("plant-plus", [PY, "-I", HERE / "plant_paged_kind_plus.py", NEW, OUT / "plant_paged_kind.json"])
run("reference-page-plus", [PY, "-I", HERE / "probe_reference_page_plus.py", NEW, OUT / "reference-page"])
run("differential.reference-page-plus", [PY, "-I", ROOT / "lab/verify/O02/tools/differential.py", OLD, NEW,
    SCRATCH / "diff-pages-plus", 0, 0, OUT / "reference-page", f"--out={OUT / 'differential.reference-page.json'}"])

# [CX-VO04I] Why: save both raw output documents (or lack of one), exits and stderr for each difference.
# Rejected: claiming the first differing JSON field alone completely accounts for the difference.
detail = OUT / "differential-details"
detail.mkdir()
for result in [*BASE.glob("differential.seed*.json"), OUT / "differential.reference-page.json"]:
    for index, row in enumerate(json.loads(result.read_text())["rows"]):
        stem = result.stem + f".{index:03d}"
        source = Path(row["case"])
        shutil.copy2(source, detail / f"{stem}.case.json")
        for revision, tree in (("048", OLD), ("049", NEW)):
            run(f"detail.{stem}.{revision}", [PY, "-I", tree / "lab/oracles/replay/cli.py", source,
                                            "-o", detail / f"{stem}.{revision}.json"], cwd=tree)

run("self-check.049-final", [PY, "-I", NEW / "lab/oracles/replay/cli.py", "--self-check", "-o", OUT / "self-check.049-final.json"])
manifest_path = Path("/Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/hashes.0.4.9.txt")
shutil.copy2(manifest_path, OUT / "author-hashes.0.4.9.txt")
shutil.copy2("/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS-PENDING.md", OUT / "RULINGS-PENDING.input.md")
report = subprocess.check_output(["git", "show", "f195f30:lab/experiments/EXP-O04-oracle-erasure/REPORT-0.4.9.md"], cwd=ROOT)
(OUT / "author-report.input.md").write_bytes(report)
files = {}
for line in manifest_path.read_text().splitlines():
    if line.strip():
        digest, name = line.split(None, 1)
        files[name] = {"author": digest, "actual": sha(NEW / name)}
assert len(files) == 29
assert all(r["author"] == r["actual"] for r in files.values())
sources = {str(p.relative_to(NEW / "lab/oracles/replay")): sha(p)
           for p in (NEW / "lab/oracles/replay").glob("*.py")}
reported = json.loads((BASE / "self-check.json").read_text())["oracleSourceSha256"]
assert len(reported) == 13 and reported == sources
lanes = {}
for lane in ("core", "qlever"):
    outputs = list((SCRATCH / f"runs-{lane}").glob("*.json"))
    bad = []
    for p in outputs:
        d = json.loads(p.read_text())
        identity = d.get("oracle", {})
        if identity.get("version") != "0.4.9" or identity.get("sourceSha256") != sources:
            bad.append(p.name)
    lanes[lane] = {"documents": len(outputs), "mismatches": bad}
    assert outputs and not bad, lanes
save("source-final.json", {"files": files, "authorMatched": len(files), "selfReportedMatched": len(reported),
                          "converterSources": lanes, "hostDiskFreeBytesAfter": shutil.disk_usage(SCRATCH).free})
print("source-final 29/29; self-reported 13/13; converter documents", lanes, flush=True)

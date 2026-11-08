"""CX-VO04H fresh verification. Run through lab/bin/heavy.mjs; oracle execution is archive-only.

Usage: python3 -I lab/verify/O02/V-O04h/rerun.py
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
OUT = HERE / "results/cx-vo04h"
OUT.mkdir(parents=True, exist_ok=True)
RESUME = len(sys.argv) == 3 and sys.argv[1] == "--resume"
SCRATCH = Path(sys.argv[2]) if RESUME else Path(tempfile.mkdtemp(prefix="CX-VO04H-", dir="/private/tmp"))
NEW, OLD = SCRATCH / "at3c52a1d", SCRATCH / "at91ba352"
PY = sys.executable
LOG = json.loads((OUT / "commands.json").read_text()) if RESUME else []


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + "\n")


def run(name, args, cwd=NEW, env=None):
    start = time.time()
    proc = subprocess.run([str(a) for a in args], cwd=cwd, env=env, capture_output=True, text=True)
    (OUT / f"{name}.stdout.txt").write_text(proc.stdout)
    (OUT / f"{name}.stderr.txt").write_text(proc.stderr)
    LOG.append({"name": name, "argv": [str(a) for a in args], "cwd": str(cwd), "exit": proc.returncode,
                "seconds": round(time.time() - start, 3), "environmentOverrides":
                {k: env[k] for k in ("O02_LANE",) if env and k in env}})
    save("commands.json", LOG)
    print(name, "exit", proc.returncode, proc.stdout[:180].replace("\n", " "), flush=True)
    return proc


# [CX-VO04H] Why: select tracked oracle, fixtures and golden inputs at each commit, then overlay only verifier tools.
# Rejected: running from the worktree (it contains an older oracle and would not verify the requested revision).
paths = ["lab/oracles/replay", "lab/acceptance", "lab/verify/O02/convert_and_run.py", "lab/verify/O02/tools",
         "qualification/capacity/historical-assertion-metadata-v2/oracle.mjs",
         "qualification/capacity/historical-assertion-metadata-v1/oracle.mjs",
         "qualification/capacity/configured-entities-v1/xtdb-tiny-v4/oracle.json",
         "qualification/capacity/configured-entities-v1/CONTRACT.md",
         "qualification/workloads/temporal-workloads.json", "qualification/workloads/event_oracles.py"]
archives = []
for rev, dest in (() if RESUME else (("3c52a1d", NEW), ("91ba352", OLD))):
    dest.mkdir()
    archive = SCRATCH / f"{rev}.tar"
    subprocess.run(["git", "archive", "--format=tar", f"--output={archive}", rev, *paths], cwd=ROOT, check=True)
    with tarfile.open(archive) as tf:
        tf.extractall(dest, filter="data")
    archives.append({"commit": subprocess.check_output(["git", "rev-parse", rev], cwd=ROOT, text=True).strip(),
                     "archive": str(archive), "sha256": sha(archive), "paths": paths})

tools = ROOT / "lab/verify/O02/tools"
for dest in (() if RESUME else (NEW, OLD)):
    for name in ("probe_q52.py", "probe_q49.py", "probe_035.py", "probe_delta_033.py", "plant_paged_kind.py"):
        shutil.copy2(tools / name, dest / "lab/verify/O02/tools" / name)
if not RESUME:
    save("provenance.json", {"verifierHead": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
                             "scratch": str(SCRATCH), "archives": archives,
                             "toolHashes": {p.name: sha(p) for p in tools.glob("*.py")},
                             "python": sys.version, "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
else:
    save("resume-provenance.json", {"scratch": str(SCRATCH), "reason": "Verifier harness did not create probe_delta_033's fixed output directory; first failure retained",
                                    "toolHashes": {p.name: sha(p) for p in tools.glob("*.py")}, "runnerSha256": sha(Path(__file__))})

for name in (() if RESUME else ("probe_q52", "probe_q49", "probe_035")):
    for control in (False, True):
        args = [PY, "-I", NEW / f"lab/verify/O02/tools/{name}.py", SCRATCH / name, f"--results={OUT}"]
        if control:
            args.append("--self-test")
        run(name + (".self-test" if control else ""), args)
(NEW / "lab/verify/O02/results").mkdir(exist_ok=True)
run("probe_delta_033.retry1" if RESUME else "probe_delta_033", [PY, "-I", NEW / "lab/verify/O02/tools/probe_delta_033.py", SCRATCH / "delta"])
shutil.copy2(NEW / "lab/verify/O02/results/probe_delta_033.json", OUT / "probe_delta_033.json")
run("unit-tests", [PY, "-I", NEW / "lab/oracles/replay/cli.py", "--test"])
run("self-check", [PY, "-I", NEW / "lab/oracles/replay/cli.py", "--self-check", "-o", OUT / "self-check.json"])
run("plant_paged_kind", [PY, "-I", tools / "plant_paged_kind.py", NEW, OUT / "plant_paged_kind.json"])

for lane in ("core", "qlever"):
    env = dict(os.environ, O02_LANE=lane)
    run(f"converter.{lane}", [PY, "-I", NEW / "lab/verify/O02/convert_and_run.py"], env=env)
    shutil.copy2(NEW / "lab/verify/O02/results.json", OUT / f"converter.{lane}.json")
    shutil.copytree(NEW / "lab/verify/O02/cases", SCRATCH / f"golden-{lane}")
    run(f"converter-compare.{lane}", [PY, "-I", tools / "compare_results.py", OUT / f"converter.{lane}.json",
         f"/Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/results.048.{lane}.json"])

old_results = OUT / "at-0.4.7"
old_results.mkdir()
run("probe_q52.at-0.4.7", [PY, "-I", OLD / "lab/verify/O02/tools/probe_q52.py", SCRATCH / "q52-old", f"--results={old_results}"], cwd=OLD)

# [CX-VO04H] Why: compare the requested 0.4.7 baseline using seeds 49 and 4949 and the current checked probe corpus.
# Rejected: inheriting the paused run against acf9fce (0.4.5), which is not the brief's differential baseline.
for seed, count in ((49, 500), (4949, 800)):
    dirs = [SCRATCH / n for n in ("probe_q52", "probe_q49", "probe_035", "delta", "golden-core", "golden-qlever")] if seed == 49 else []
    run(f"differential.seed{seed}", [PY, "-I", tools / "differential.py", OLD, NEW, SCRATCH / f"diff-{seed}", count, seed,
                                   *dirs, f"--out={OUT / f'differential.seed{seed}.json'}"])

sample = next((SCRATCH / "probe_q52").glob("*.expected.json"))
run("hashes", [PY, "-I", tools / "hash_verify.py", NEW, "3c52a1d", sample, OUT / "hashes.3c52a1d.json",
               "/Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/hashes.0.4.8.txt"])
print("RETAINED", SCRATCH, flush=True)

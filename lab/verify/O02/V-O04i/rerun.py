"""CX-VO04I: archive-only O-REPLAY 0.4.9 review. Run via lab/bin/heavy.mjs."""
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
OUT = HERE / "results"
OUT.mkdir(parents=True, exist_ok=True)
SCRATCH = Path(tempfile.mkdtemp(prefix="CX-VO04I-", dir="/private/tmp"))
NEW, OLD = SCRATCH / "atf195f30", SCRATCH / "at3c52a1d"
TOOLS = ROOT / "lab/verify/O02/tools"
PY = sys.executable
LOG = []


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def save(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + "\n")


def run(name, args, cwd=NEW, env=None):
    start = time.time()
    proc = subprocess.run([str(a) for a in args], cwd=cwd, env=env, capture_output=True, text=True)
    (OUT / f"{name}.stdout.txt").write_text(proc.stdout)
    (OUT / f"{name}.stderr.txt").write_text(proc.stderr)
    LOG.append({"name": name, "argv": [str(a) for a in args], "cwd": str(cwd), "exit": proc.returncode,
                "seconds": round(time.time() - start, 3),
                "environmentOverrides": {k: env[k] for k in ("O02_LANE",) if env and k in env}})
    save("commands.json", LOG)
    print(name, "exit", proc.returncode, proc.stdout[:180].replace("\n", " "), flush=True)
    return proc


# [CX-VO04I] Why: isolate immutable author revisions and overlay only verifier tools.
# Rejected: executing this branch's older oracle or modifying the author's checkout.
paths = ["lab/oracles/replay", "lab/acceptance", "lab/verify/O02/convert_and_run.py", "lab/verify/O02/tools",
         "qualification/capacity/historical-assertion-metadata-v2/oracle.mjs",
         "qualification/capacity/historical-assertion-metadata-v1/oracle.mjs",
         "qualification/capacity/configured-entities-v1/xtdb-tiny-v4/oracle.json",
         "qualification/capacity/configured-entities-v1/CONTRACT.md",
         "qualification/workloads/temporal-workloads.json", "qualification/workloads/event_oracles.py"]
archives = []
for rev, dest in (("f195f30", NEW), ("3c52a1d", OLD)):
    dest.mkdir()
    archive = SCRATCH / f"{rev}.tar"
    subprocess.run(["git", "archive", "--format=tar", f"--output={archive}", rev, *paths], cwd=ROOT, check=True)
    with tarfile.open(archive) as tf:
        tf.extractall(dest, filter="data")
    archives.append({"commit": subprocess.check_output(["git", "rev-parse", rev], cwd=ROOT, text=True).strip(),
                     "archive": str(archive), "sha256": sha(archive), "paths": paths})
    for name in ("probe_q52.py", "probe_q49.py", "probe_035.py", "probe_delta_033.py"):
        shutil.copy2(TOOLS / name, dest / "lab/verify/O02/tools" / name)

save("provenance.json", {"verifierHead": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
                         "scratch": str(SCRATCH), "archives": archives, "python": sys.version,
                         "toolHashes": {str(p.relative_to(ROOT)): sha(p) for p in [*TOOLS.glob("*.py"), *HERE.glob("*.py")]},
                         "hostDiskFreeBytesBefore": shutil.disk_usage(SCRATCH).free,
                         "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
run("unit-tests", [PY, "-I", NEW / "lab/oracles/replay/cli.py", "--test"])
run("self-check", [PY, "-I", NEW / "lab/oracles/replay/cli.py", "--self-check", "-o", OUT / "self-check.json"])
run("plant_paged_kind", [PY, "-I", HERE / "plant_paged_kind.py", NEW, OUT / "plant_paged_kind.json"])
run("probe_reference_page", [PY, "-I", HERE / "probe_reference_page.py", NEW, OUT / "reference-page"])
for name in ("probe_q52", "probe_q49", "probe_035"):
    for control in (False, True):
        args = [PY, "-I", NEW / f"lab/verify/O02/tools/{name}.py", SCRATCH / name, f"--results={OUT}"]
        if control:
            args.append("--self-test")
        run(name + (".self-test" if control else ""), args)
(NEW / "lab/verify/O02/results").mkdir(exist_ok=True)
run("probe_delta_033", [PY, "-I", NEW / "lab/verify/O02/tools/probe_delta_033.py", SCRATCH / "delta"])
shutil.copy2(NEW / "lab/verify/O02/results/probe_delta_033.json", OUT / "probe_delta_033.json")

for lane in ("core", "qlever"):
    run(f"converter.{lane}", [PY, "-I", NEW / "lab/verify/O02/convert_and_run.py"], env=dict(os.environ, O02_LANE=lane))
    shutil.copy2(NEW / "lab/verify/O02/results.json", OUT / f"converter.{lane}.json")
    shutil.copytree(NEW / "lab/verify/O02/cases", SCRATCH / f"golden-{lane}")
    shutil.copytree(NEW / "lab/verify/O02/runs", SCRATCH / f"runs-{lane}")
    run(f"converter-compare.{lane}", [PY, "-I", TOOLS / "compare_results.py", OUT / f"converter.{lane}.json",
        f"/Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/results.048.{lane}.json"])

# [CX-VO04I] Why: reuse the exact previous 493-case corpus and seeds, binding all input bytes.
# Rejected: changing the finite corpus and attributing the changed denominator to an oracle revision.
prior = Path("/private/tmp/CX-VO04H-2xsggws9")
prior_dirs = [prior / n for n in ("probe_q52", "probe_q49", "probe_035", "delta", "golden-core", "golden-qlever")]
prior_manifest = []
for source in prior_dirs:
    assert source.is_dir(), source
    dest = SCRATCH / "prior-corpus" / source.name
    dest.mkdir(parents=True)
    for p in sorted(source.glob("*.case.json")):
        shutil.copy2(p, dest / p.name)
        prior_manifest.append({"source": str(p), "copy": str(dest / p.name), "sha256": sha(p)})
save("prior-corpus.json", prior_manifest)
for seed, count in ((49, 500), (4949, 800)):
    dirs = [SCRATCH / "prior-corpus" / d.name for d in prior_dirs] if seed == 49 else []
    run(f"differential.seed{seed}", [PY, "-I", TOOLS / "differential.py", OLD, NEW, SCRATCH / f"diff-{seed}", count, seed,
                                   *dirs, f"--out={OUT / f'differential.seed{seed}.json'}"])
run("differential.reference-page", [PY, "-I", TOOLS / "differential.py", OLD, NEW, SCRATCH / "diff-pages", 0, 0,
                                   OUT / "reference-page", f"--out={OUT / 'differential.reference-page.json'}"])
sample = next((SCRATCH / "probe_q52").glob("*.expected.json"))
run("hashes", [PY, "-I", TOOLS / "hash_verify.py", NEW, "f195f30", sample, OUT / "hashes.f195f30.json",
               "/Users/sam/Claude/Projects/triplex-db-2/EXP-O04b-oracle-0.4.2/hashes.0.4.9.txt"])
refusals = []
for p in sorted((NEW / "lab/oracles/replay").glob("*.py")):
    for number, line in enumerate(p.read_text().splitlines(), 1):
        if "X-NOT-MODELED" in line:
            refusals.append({"path": str(p.relative_to(NEW)), "line": number, "text": line})
save("refusal-sites.json", refusals)
print("RETAINED", SCRATCH, flush=True)

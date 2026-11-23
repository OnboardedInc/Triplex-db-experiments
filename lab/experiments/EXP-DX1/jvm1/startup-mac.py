"""Stage and run the Mac start-up read gate in one managed, ephemeral Datomic container (timings diagnostic)."""

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import uuid

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
TAG = "tx2-datomic:dx-jvm1-startup-read"
# [DX-THIN1] Why: the integration builder reruns this gate under its own holder and image tag, optionally with the owner head.
# Rejected: borrowing the JVM1 holder's slot reservation or image tag.
HOLDER = os.environ.get("DX_JVM1_GATE_HOLDER", "DX-JVM1")
OWNER_HEAD = os.environ.get("DX_W1_OWNER_HEAD", "0")
if HOLDER not in ("DX-JVM1", "DX-THIN1") or OWNER_HEAD not in ("0", "1"):
    raise SystemExit("The start-up read gate runs as DX-JVM1 or DX-THIN1, with DX_W1_OWNER_HEAD 0 or 1")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prep1_manage():
    # [DX-JVM1] Why: reuse PREP1's admission, retry and build-receipt handling for the one shared selftest slot.
    # Rejected: a second reservation path that could start a container outside the lab pool.
    spec = importlib.util.spec_from_file_location("prep1_manage", HERE.parent / "prep1" / "manage.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def stage(out):
    out.mkdir()
    attempt = str(uuid.uuid4())
    root = out / "stage"
    files = ("lab/config/slots.json", "lab/config/datomic", "packages/datomic/gateway", "packages/datomic/src/codec-spec.json")
    for name in files:
        source, target = REPO / name, root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            shutil.copy2(source, target)
    config = root / files[1]
    (config / "attempt").write_text(attempt + "\n")
    (config / "subject-head").write_text(OWNER_HEAD + "\n")
    tag = TAG if HOLDER == "DX-JVM1" else "tx2-dxthin-managed:" + attempt.replace("-", "")[:16]
    shutil.copyfile(HERE / "startup-stack.sh", config / "entrypoint.sh")
    shutil.copyfile(HERE / "startup-read.clj", config / "startup-read.clj")
    recipe = config / "Dockerfile"
    original = recipe.read_text()
    first_from = original.index("FROM ")
    recipe.write_text(original[:first_from]
                      + "FROM postgres:17-alpine AS prep_pg\nFROM node:22.23.2-bookworm-slim AS prep_node\n"
                      + original[first_from:] + """
COPY --from=prep_pg / /opt/thin-pg/
COPY --from=prep_node /usr/local/bin/node /usr/local/bin/node
RUN ln -s /opt/thin-pg/lib/ld-musl-aarch64.so.1 /lib/ld-musl-aarch64.so.1 \\
 && echo '/opt/thin-pg/lib:/opt/thin-pg/usr/lib:/opt/thin-pg/usr/local/lib' > /etc/ld-musl-aarch64.path \\
 && cp -a /opt/thin-pg/usr/share/icu/. /usr/share/icu/
""")
    esbuild = REPO / "node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild"
    metafile = out / "bundle.json"
    subprocess.run([
        esbuild, str(HERE.relative_to(REPO) / "startup-gate.ts"), "--bundle", "--platform=node", "--format=esm",
        "--banner:js=import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);",
        "--metafile=" + str(metafile), "--outfile=" + str(config / "probe.mjs"),
    ], cwd=REPO, check=True)
    slots = root / files[0]
    profile = json.loads(slots.read_text())
    if os.environ.get("DOCKER_HOST") != profile["dockerHost"]:
        raise SystemExit("Lab Docker endpoint does not match the configured endpoint")
    profile["lanes"]["datomic"]["image"] = tag
    slots.write_text(json.dumps(profile, indent=2) + "\n")
    runner = [HERE / n for n in ("startup-mac.py", "startup-stack.sh", "startup-read.clj", "startup-gate.ts")]
    runner += [REPO / p for p in json.loads(metafile.read_text())["inputs"]]
    inputs = {
        "attempt": attempt, "mode": "jvm1-startup-read", "holder": HOLDER, "timings": "diagnostic",
        "subjectOwnerHead": OWNER_HEAD == "1", "imageTag": tag,
        "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip(),
        "dirty": subprocess.check_output(["git", "status", "--porcelain"], cwd=REPO, text=True).splitlines(),
        "stage": {str(p.relative_to(root)): sha(p) for p in sorted(root.rglob("*")) if p.is_file() and p != slots},
        "runner": {str(p.relative_to(REPO)): sha(p) for p in sorted(set(runner))},
    }
    with (out / "inputs.json").open("x") as file:
        json.dump(inputs, file, indent=2)
        file.write("\n")
    return inputs


def summarize(out):
    log = next(p for p in sorted(out.glob("selftest-*.log")) if "JVM1_STARTUP_DONE" in p.read_text(errors="replace"))
    lines = [line for line in log.read_text(errors="replace").splitlines() if line.startswith("JVM1_STARTUP_")]
    events = {}
    for line in lines:
        kind, _, body = line.partition(" ")
        if body.startswith("{"):
            row = json.loads(body)
            events.setdefault(kind, {})[row.get("arm", "")] = row
    today = events["JVM1_STARTUP_POST"]["today"]
    warm = events["JVM1_STARTUP_POST"]["startup-read"]
    read = events["JVM1_STARTUP_READ"]["startup-read"]
    checks = {
        "readRanOnceAndCompleted": all(read[r]["status"] == "complete" and read[r]["owners"]["read"] == read[r]["owners"]["selected"] > 0
                                       for r in ("tx", "gw-w")),
        "noReaderThreadAfterRead": read["threadsAfter"] == [],
        "exactReadsPassed": today["exact"] == today["saves"] and warm["exact"] == warm["saves"],
        "activeSetReadsDropped": warm["activeSet"]["sqlPerSave"] < 0.25 * today["activeSet"]["sqlPerSave"],
        # The never-touched people share index leaves with their saved neighbours, so they can warm too; what the
        # step must show is that it selected exactly the owners the traffic before the restart saved.
        "selectedExactlyTheActiveSet": all(read[r]["owners"]["selected"] == today["activeSet"]["saves"] for r in ("tx", "gw-w")),
    }
    inputs = json.loads((out / "inputs.json").read_text())
    if inputs.get("subjectOwnerHead"):
        checks["coveringWriterSavedEveryPostSave"] = all(arm["ownerHeadSaves"] == arm["saves"] for arm in (today, warm))
    elif "ownerHeadSaves" in today:
        checks["noCoveringWriterSave"] = today["ownerHeadSaves"] == warm["ownerHeadSaves"] == 0
    summary = {"log": log.name, "logSha256": sha(log), "events": events, "checks": checks, "pass": all(checks.values()),
               "timings": "diagnostic"}
    with (out / "summary.json").open("x") as file:
        json.dump(summary, file, indent=2)
        file.write("\n")
    print(json.dumps({"checks": checks, "today": today["activeSet"], "startupRead": warm["activeSet"],
                      "control": [today["control"], warm["control"]], "read": read}, indent=1))
    return summary


if __name__ == "__main__":
    target = Path(sys.argv[1]).resolve()
    if sys.argv[2:] == ["--summarize"]:
        raise SystemExit(0 if summarize(target)["pass"] else 1)
    if sys.argv[2:] == ["--resume"]:
        prep1_manage().run_stage(target, json.loads((target / "inputs.json").read_text()))
        raise SystemExit(0 if summarize(target)["pass"] else 1)
    manage = prep1_manage()
    inputs = stage(target)
    manage.run_stage(target, inputs)
    raise SystemExit(0 if summarize(target)["pass"] else 1)

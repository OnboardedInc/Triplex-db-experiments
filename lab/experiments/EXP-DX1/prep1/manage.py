"""Stage one SQL-backed Mac probe in a managed, ephemeral Datomic reservation."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid

EXPERIMENT = Path(__file__).resolve().parent
REPO = EXPERIMENT.parents[3]
GIB = 1024**3


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def record(path, obj):
    with path.open("x") as file:
        json.dump(obj, file, indent=2)
        file.write("\n")


def disk_floor():
    if shutil.disk_usage(REPO).free < 5 * GIB:
        raise SystemExit("Host free disk below 5 GiB")


def main(out, mode="ortho", seconds="10", subject="1", numeric_owner="0", prefetch="0", ordered="0", serial="0"):
    if mode not in ("ortho", "prepare", "two", "live", "profile", "cheap", "census", "recovery", "subject-recovery", "subject-query", "subject-native-suite", "subject-profile", "lookup-profile", "rolling-recovery"):
        raise SystemExit("Unknown managed probe mode")
    if subject not in ("0", "1"):
        raise SystemExit("Subject writer setting must be 0 or 1")
    if numeric_owner not in ("0", "1") or (numeric_owner == "1" and subject != "1"):
        raise SystemExit("Numeric owner mode requires the prepared writer")
    if prefetch not in ("0", "1") or (prefetch == "1" and subject != "1"):
        raise SystemExit("Prefetch requires the prepared writer")
    if ordered not in ("0", "1") or (ordered == "1" and (subject != "1" or prefetch != "0")):
        raise SystemExit("Ordered IDs require the prepared writer without hints")
    if serial not in ("0", "1") or (serial == "1" and (ordered != "1" or numeric_owner != "1")):
        raise SystemExit("Serial apply requires ordered IDs and a numeric owner")
    owner_head = os.environ.get("DX_W1_OWNER_HEAD", "0")
    if owner_head not in ("0", "1") or (owner_head == "1" and (mode, ordered, numeric_owner) != ("rolling-recovery", "1", "1")):
        raise SystemExit("The owner head gate requires the ordered rolling-recovery fixture")
    lookup_every = 3 if serial == "1" and mode == "rolling-recovery" else 0
    out.mkdir()
    attempt = str(uuid.uuid4())
    stage = out / "stage"
    files = ("lab/config/slots.json", "lab/config/datomic", "packages/datomic/gateway",
             "packages/datomic/src/codec-spec.json")
    for name in files:
        source, target = REPO / name, stage / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            shutil.copy2(source, target)

    config = stage / files[1]
    (config / "attempt").write_text(attempt + "\n")
    (config / "mode").write_text(mode + "\n")
    (config / "subject").write_text(subject + "\n")
    (config / "subject-owner").write_text(numeric_owner + "\n")
    (config / "subject-prefetch").write_text(prefetch + "\n")
    (config / "subject-ordered").write_text(ordered + "\n")
    (config / "subject-serial").write_text(serial + "\n")
    (config / "subject-head").write_text(owner_head + "\n")
    (config / "lookup-every").write_text(str(lookup_every) + "\n")
    if mode == "live":
        if not 1 <= int(seconds) <= 60:
            raise SystemExit("Live window must be 1 to 60 seconds")
        (config / "seconds").write_text(seconds + "\n")
    shutil.copyfile(EXPERIMENT / "stack.sh", config / "entrypoint.sh")
    shutil.copyfile(EXPERIMENT / "observe.clj", config / "observe.clj")
    clojure_driver = {
        "recovery": ("gate.clj", "recovery.clj"),
        "subject-recovery": ("subject_gate.clj", "subject_conflicts.clj", "subject_recovery.clj"),
        "subject-query": ("subject_gate.clj", "subject_conflicts.clj", "subject_recovery.clj"),
    }.get(mode, ())
    clojure_inputs = [EXPERIMENT / name for name in clojure_driver]
    if clojure_inputs:
        clojure_inputs.append(EXPERIMENT.parent / "wfix1/regression.clj")
        for source in clojure_inputs:
            shutil.copyfile(source, config / source.name)
    # [DX-PREP1] Why: the in-memory suite needs only the Datomic JVM.
    # Rejected: copying PostgreSQL and Node layers onto the shared VM for a native-only gate.
    if mode != "subject-native-suite":
        recipe = config / "Dockerfile"
        before, main, rest = recipe.read_text().partition("FROM ${DATOMIC_BASE}")
        assert main and "\nARG DATOMIC_BASE=" in before
        recipe.write_text(before + "FROM postgres:17-alpine AS prep_pg\nFROM node:22.23.2-bookworm-slim AS prep_node\n"
                          + main + rest + """
COPY --from=prep_pg / /opt/thin-pg/
COPY --from=prep_node /usr/local/bin/node /usr/local/bin/node
RUN ln -s /opt/thin-pg/lib/ld-musl-aarch64.so.1 /lib/ld-musl-aarch64.so.1 \
 && echo '/opt/thin-pg/lib:/opt/thin-pg/usr/lib:/opt/thin-pg/usr/local/lib' > /etc/ld-musl-aarch64.path \
 && cp -a /opt/thin-pg/usr/share/icu/. /usr/share/icu/
""")
    disk_floor()
    esbuild = REPO / "node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild"
    metafile = out / "bundle.json"
    driver = {"live": "live.ts", "rolling-recovery": "rolling-gate.ts"}.get(mode, "probe.ts")
    if not clojure_inputs and mode != "subject-native-suite":
        subprocess.run([
            esbuild, str(EXPERIMENT.relative_to(REPO) / driver), "--bundle", "--platform=node",
            "--format=esm", "--banner:js=import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);",
            "--metafile=" + str(metafile), "--outfile=" + str(config / "probe.mjs"),
        ], cwd=REPO, check=True)

    slots = stage / files[0]
    profile = json.loads(slots.read_text())
    if os.environ.get("DOCKER_HOST") != profile["dockerHost"]:
        raise SystemExit("Lab Docker endpoint does not match the configured endpoint")
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip()
    tag = f"dx-w1-head-{out.name}-{head[:8]}" if owner_head == "1" else f"dx-prep1-{mode}"
    profile["lanes"]["datomic"]["image"] = f"tx2-datomic:{tag}"
    slots.write_text(json.dumps(profile, indent=2) + "\n")
    source_paths = [p for p in EXPERIMENT.iterdir() if p.suffix in (".ts", ".clj", ".py", ".sh", ".mjs")]
    if clojure_inputs:
        source_paths.extend(clojure_inputs)
    elif mode != "subject-native-suite":
        source_paths.extend(REPO / p for p in json.loads(metafile.read_text())["inputs"])
    if owner_head == "1":
        for name, source in [("serial-gate.clj", EXPERIMENT.parent / "w1/serial/gate.clj"),
                             ("regression.clj", EXPERIMENT.parent / "wfix1/regression.clj"),
                             *((name, EXPERIMENT / name) for name in ("subject_gate.clj", "subject_conflicts.clj", "owner_layout_gate.clj"))]:
            shutil.copyfile(source, config / name)
            source_paths.append(source)
        (config / "source").write_text(head + "\n")
    inputs = {
        "attempt": attempt,
        "mode": mode,
        "timings": "diagnostic",
        "subject": subject == "1",
        "numericOwner": numeric_owner == "1",
        "prefetch": prefetch == "1",
        "orderedIds": ordered == "1",
        "serialApply": serial == "1",
        "lookupEvery": lookup_every,
        "ownerHead": owner_head == "1",
        "explicitProbes": mode == "lookup-profile" and prefetch == "1",
        "head": head,
        "stage": {str(p.relative_to(stage)): sha(p) for p in sorted(stage.rglob("*"))
                  if p.is_file() and p != slots},
        "runner": {str(p.relative_to(REPO)): sha(p) for p in sorted(set(source_paths))},
    }
    record(out / "inputs.json", inputs)
    run_stage(out, inputs)


def run_stage(out, inputs):
    stage = out / "stage"
    slots = stage / "lab/config/slots.json"
    holder = "DX-W1" if inputs.get("ownerHead") else "DX-PREP1"
    engine_state = out / "engine-state" if inputs.get("ownerHead") else REPO / "runs/engines/prep1"
    env = dict(os.environ, TX2_CONFIG_DIR=str(stage), TX2_SLOTS_FILE=str(slots), TX2_ENGINE_DIR=str(engine_state))
    attempt = inputs["attempt"]
    if any(sha(stage / path) != digest for path, digest in inputs["stage"].items()):
        raise SystemExit("Staged source bytes changed")
    # [DX-PREP1] Why: retain each refusal and let the existing manager decide whether the shared slot fits.
    # Rejected: borrowing a resident or starting a container before admission.
    for action in ("build", "selftest"):
        for i in range(1, 121):
            disk_floor()
            path = out / f"{action}-{i}.log"
            if action == "build" and (out / "image.json").is_file():
                break
            if path.exists():
                continue
            args = ["node", "lab/bin/heavy.mjs", "--poll-ms", "100", "--label", f"{holder}-{out.name}-{action}", "--"]
            args += ["node", "lab/bin/engine.mjs", action, "--lane", "datomic", "--holder", holder]
            if action == "selftest":
                args += ["--scratch-gib", "1"]
            with path.open("x") as log:
                code = subprocess.run(args, cwd=REPO, env=env, stdout=log, stderr=subprocess.STDOUT).returncode
            if code == 0:
                if action == "build":
                    output = path.read_text()
                    receipt = json.loads(output[output.rindex("\n{") + 1:])["receipt"]
                    shutil.copyfile(receipt, out / "image.json")
                else:
                    image = json.loads(slots.read_text())["lanes"]["datomic"]["imageId"]
                    record(out / "terminal.json", {"attempt": attempt, "exit": code, "image": image,
                                                  "holder": holder, "slot": "tx2-datomic-selftest",
                                                  "log": path.name, "sha256": sha(path),
                                                  "timings": "diagnostic"})
                print(f"{action} finished", flush=True)
                break
            diagnostics = path.read_text(errors="replace").splitlines()
            # [DX-PREP1] Why: retry only an admission refusal after the child exits.
            # Rejected: matching an earlier queue message and rerunning a failing diagnostic image.
            refused = any(line.startswith("[lab] REFUSED: ") and any(reason in line for reason in
                          ("pool refuses selftest", "selftest already owned/running", "measurement lease"))
                          for line in diagnostics)
            if action == "selftest" and refused:
                print(f"{action} waiting for reservation ({i})", flush=True)
                time.sleep(15)
                continue
            raise SystemExit(f"{action} exited {code}, see {path.name}")
        else:
            raise SystemExit("Datomic reservation unavailable")


if __name__ == "__main__":
    out = Path(sys.argv[1]).resolve()
    if sys.argv[2:] == ["--resume"]:
        if (out / "terminal.json").exists():
            raise SystemExit("Attempt already terminated successfully")
        run_stage(out, json.loads((out / "inputs.json").read_text()))
    else:
        main(out, *sys.argv[2:])

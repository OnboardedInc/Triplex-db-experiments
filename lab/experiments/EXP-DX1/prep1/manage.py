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
    if mode not in ("ortho", "prepare", "two", "live", "profile", "cheap", "census", "recovery", "subject-recovery", "subject-query", "subject-native-suite", "subject-profile", "lookup-profile", "rolling-recovery", "production"):
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
    combined = os.environ.get("DX_CHK1_APPEND_GATE") == "1"
    if combined and (mode, ordered, serial) != ("rolling-recovery", "1", "1"):
        raise SystemExit("DX-CHK1 runs the ordered serial rolling6 append fixture")
    if combined and owner_head == "1":
        raise SystemExit("Run the owner head gate and the DX-CHK1 append gate as separate attempts")
    # [DX-THIN1] Why: the integration builder reruns the owner-head recovery gate under its own holder.
    # Rejected: borrowing the W1 holder's reservation and image tag.
    holder = (os.environ.get("DX_CHK1_HOLDER", "DX-CHK1") if combined
              else os.environ.get("DX_CHK1_HOLDER", "DX-W1") if owner_head == "1"
              else os.environ.get("DX_CHK1_HOLDER", "DX-REAL2") if mode == "production" else "DX-PREP1")
    assert holder in ("DX-CHK1", "DX-THIN1", "DX-PREP1", "DX-W1", "DX-REAL2", "DX-W3") and (not combined or holder in ("DX-CHK1", "DX-THIN1"))
    assert mode != "production" or holder in ("DX-REAL2", "DX-THIN1", "DX-W3")
    # [DX-W3] Why: run the production gate with the general writer's hints on or off (default: no file, as before).
    # Rejected: a second gate copy; the hints arm differs from the control only in this one setting.
    general_prefetch = os.environ.get("DX_W3_GENERAL_PREFETCH")
    if general_prefetch not in (None, "0", "1") or (general_prefetch is not None and (mode != "production" or holder != "DX-W3")):
        raise SystemExit("DX_W3_GENERAL_PREFETCH is 0 or 1, for the production gate under the DX-W3 holder")
    assert owner_head != "1" or holder in ("DX-W1", "DX-THIN1")
    # [DX-W1] Why: match both saves per owner-layout arm to their transactor read counters.
    # Rejected: treating empty peer I/O metadata as zero native storage reads.
    lookup_every = 1 if owner_head == "1" else 3 if serial == "1" and mode == "rolling-recovery" else 0
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
    if combined:
        (config / "subject-retirement").write_text("1\n")
        (config / "chk1-replay").write_text("1\n")
    (config / "lookup-every").write_text(str(lookup_every) + "\n")
    if general_prefetch is not None:
        (config / "general-prefetch").write_text(general_prefetch + "\n")
    fresh_first = os.environ.get("DX_PREP1_TEST_FRESH_FIRST") == "1"
    if fresh_first:
        # [DX-THIN1] Why: the one branch keeps INT1's rolling gate, which has no fresh-first arm (PREP1 dropped it).
        # Rejected: staging a marker the merged gate would ignore.
        raise SystemExit("The fresh-first fixture runs only on exp/DX-PREP1-parallel-prepare")
    if fresh_first:
        if mode != "rolling-recovery":
            raise SystemExit("Fresh-first fixture requires rolling recovery")
        (config / "fresh-first").touch()
    tail_sql = os.environ.get("DX_PREP1_TEST_TAIL_SQL") == "1"
    if tail_sql:
        if mode != "subject-recovery" or ordered != "1":
            raise SystemExit("Tail SQL fixture requires ordered subject recovery")
        (config / "tail-sql").write_text("1\n")
    pgdata_mode = os.environ.get("DX_PREP1_TEST_PGDATA", "")
    pgdata_copy = pgdata_mode in ("1", "wal")
    if pgdata_copy:
        if mode != "subject-recovery":
            raise SystemExit("PGDATA copy fixture requires subject recovery")
        shutil.copyfile(EXPERIMENT / "copy-pgdata.sh", config / "copy-pgdata.sh")
        if pgdata_mode == "wal":
            (config / "pgdata-wal").touch()
    if mode == "production":
        # [DX-REAL2] Why: the gate reads the committed shape parameters, never a copy edited in the stage.
        if (subject, numeric_owner, prefetch, ordered) != ("1", "1", "0", "1"):
            raise SystemExit("The production gate runs the server writer: subject, numeric owner and ordered IDs")
        shutil.copyfile(EXPERIMENT.parent / "real2/production-shape.json", config / "production-shape.json")
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
        original = recipe.read_text()
        first_from = original.index("FROM ")
        # [DX-CHK1] Why: preserve the global base ARG for every stage.
        # Rejected: prepending stages before the pinned Java declaration.
        recipe.write_text(original[:first_from]
                          + "FROM postgres:17-alpine AS prep_pg\nFROM node:22.23.2-bookworm-slim AS prep_node\n"
                          + original[first_from:] + """
COPY --from=prep_pg / /opt/thin-pg/
COPY --from=prep_node /usr/local/bin/node /usr/local/bin/node
RUN ln -s /opt/thin-pg/lib/ld-musl-aarch64.so.1 /lib/ld-musl-aarch64.so.1 \
 && echo '/opt/thin-pg/lib:/opt/thin-pg/usr/lib:/opt/thin-pg/usr/local/lib' > /etc/ld-musl-aarch64.path \
 && cp -a /opt/thin-pg/usr/share/icu/. /usr/share/icu/
""")
    disk_floor()
    esbuild = REPO / "node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild"
    metafile = out / "bundle.json"
    driver = {"live": "live.ts", "rolling-recovery": "rolling-gate.ts", "production": "production-gate.ts"}.get(mode, "probe.ts")
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
    tag_mode = "subject-recovery" if mode == "rolling-recovery" else mode
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip()
    # [DX-THIN1] Why: REAL2's production gate keeps its own tag; under the integration holder it takes a private one.
    profile["lanes"]["datomic"]["image"] = (f"tx2-dxw3-native:{hashlib.sha256(attempt.encode()).hexdigest()[:15]}" if holder == "DX-W3"
                                            else f"tx2-datomic:dx-w1-head-{out.name}-{head[:8]}" if owner_head == "1" and holder == "DX-W1"
                                            else f"tx2-dxthin-native:{hashlib.sha256(attempt.encode()).hexdigest()[:15]}"
                                            if owner_head == "1" or (mode == "production" and holder == "DX-THIN1")
                                            else (f"tx2-dxthin-native:{hashlib.sha256(attempt.encode()).hexdigest()[:15]}"
                                                  if holder == "DX-THIN1" else f"tx2-datomic:dx-chk1-rolling-{attempt[:8]}")
                                            if combined else f"tx2-datomic:dx-real2-{tag_mode}" if mode == "production"
                                            else f"tx2-datomic:dx-prep1-{tag_mode}")
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
        "holder": holder,
        "appendRetirement": combined,
        "timings": "diagnostic",
        "subject": subject == "1",
        "numericOwner": numeric_owner == "1",
        "prefetch": prefetch == "1",
        "orderedIds": ordered == "1",
        "serialApply": serial == "1",
        "lookupEvery": lookup_every,
        "generalPrefetch": general_prefetch,
        "ownerHead": owner_head == "1",
        "freshFirst": fresh_first,
        "tailSql": tail_sql,
        "pgDataCopy": pgdata_copy,
        "pgDataWal": pgdata_mode == "wal",
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
    engine_state = out / "engine-state" if inputs.get("ownerHead") else REPO / "runs/engines/prep1"
    env = dict(os.environ, TX2_CONFIG_DIR=str(stage), TX2_SLOTS_FILE=str(slots), TX2_ENGINE_DIR=str(engine_state))
    attempt = inputs["attempt"]
    holder = inputs.get("holder", "DX-PREP1")
    if holder in ("DX-CHK1", "DX-THIN1") and shutil.disk_usage(REPO).free < 10 * GIB:
        raise SystemExit("DX-CHK1 host free disk below 10 GiB")
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

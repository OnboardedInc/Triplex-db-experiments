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


def main(out, mode="ortho"):
    if mode not in ("ortho", "prepare", "two", "live"):
        raise SystemExit("Mode must be ortho, prepare, two or live")
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
    shutil.copyfile(EXPERIMENT / "stack.sh", config / "entrypoint.sh")
    shutil.copyfile(EXPERIMENT / "observe.clj", config / "observe.clj")
    recipe = config / "Dockerfile"
    recipe.write_text("FROM postgres:17-alpine AS prep_pg\nFROM node:22.23.2-bookworm-slim AS prep_node\n"
                      + recipe.read_text() + """
COPY --from=prep_pg / /opt/thin-pg/
COPY --from=prep_node /usr/local/bin/node /usr/local/bin/node
RUN ln -s /opt/thin-pg/lib/ld-musl-aarch64.so.1 /lib/ld-musl-aarch64.so.1 \
 && echo '/opt/thin-pg/lib:/opt/thin-pg/usr/lib:/opt/thin-pg/usr/local/lib' > /etc/ld-musl-aarch64.path \
 && cp -a /opt/thin-pg/usr/share/icu/. /usr/share/icu/
""")
    disk_floor()
    esbuild = REPO / "node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild"
    metafile = out / "bundle.json"
    driver = "live.ts" if mode == "live" else "probe.ts"
    subprocess.run([
        esbuild, str(EXPERIMENT.relative_to(REPO) / driver), "--bundle", "--platform=node",
        "--format=esm", "--banner:js=import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);",
        "--metafile=" + str(metafile), "--outfile=" + str(config / "probe.mjs"),
    ], cwd=REPO, check=True)

    slots = stage / files[0]
    profile = json.loads(slots.read_text())
    if os.environ.get("DOCKER_HOST") != profile["dockerHost"]:
        raise SystemExit("Lab Docker endpoint does not match the configured endpoint")
    profile["lanes"]["datomic"]["image"] = f"tx2-datomic:dx-prep1-{mode}"
    slots.write_text(json.dumps(profile, indent=2) + "\n")
    engine_dir = REPO / "runs/engines/prep1"
    env = dict(os.environ, TX2_CONFIG_DIR=str(stage), TX2_SLOTS_FILE=str(slots),
               TX2_ENGINE_DIR=str(engine_dir))
    source_paths = [p for p in EXPERIMENT.iterdir() if p.suffix in (".ts", ".clj", ".py", ".sh")]
    source_paths.extend(REPO / p for p in json.loads(metafile.read_text())["inputs"])
    inputs = {
        "attempt": attempt,
        "mode": mode,
        "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip(),
        "stage": {str(p.relative_to(stage)): sha(p) for p in sorted(stage.rglob("*"))
                  if p.is_file() and p != slots},
        "runner": {str(p.relative_to(REPO)): sha(p) for p in sorted(set(source_paths))},
    }
    record(out / "inputs.json", inputs)

    # [DX-PREP1] Why: retain each refusal and let the existing manager decide whether the shared slot fits.
    # Rejected: borrowing a resident or starting a container before admission.
    for action in ("build", "selftest"):
        for i in range(1, 121):
            disk_floor()
            path = out / f"{action}-{i}.log"
            args = ["node", "lab/bin/heavy.mjs", "--poll-ms", "100", "--label", f"DX-PREP1-{action}", "--",
                    "node", "lab/bin/engine.mjs", action, "--lane", "datomic", "--holder", "DX-PREP1"]
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
                                                  "holder": "DX-PREP1", "slot": "tx2-datomic-selftest",
                                                  "log": path.name, "sha256": sha(path)})
                print(f"{action} finished", flush=True)
                break
            lines = path.read_text(errors="replace")
            if action == "selftest" and any(x in lines for x in
                    ("pool refuses selftest", "selftest already owned/running", "measurement lease")):
                print(f"{action} waiting for reservation ({i})", flush=True)
                time.sleep(15)
                continue
            raise SystemExit(f"{action} exited {code}, see {path.name}")
        else:
            raise SystemExit("Datomic reservation unavailable")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve(), *sys.argv[2:])

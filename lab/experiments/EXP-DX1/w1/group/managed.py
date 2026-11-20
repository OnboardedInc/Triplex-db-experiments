"""Build and run the isolated SQL diagnostic using the lab's shared admission manager."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid

parser = argparse.ArgumentParser()
parser.add_argument("destination", type=Path)
parser.add_argument("--field", choices=["queue","growth","small-cost","small-layout","small-capacity","retention","ledger-proof","write-clock"])
parser.add_argument("--offers", type=int, default=10000)
args = parser.parse_args()
if args.field == "retention" and not 64 <= args.offers <= 10000:
    parser.error("retention requires 64 to 10000 offers")
repo = Path.cwd()
out = args.destination.resolve()
out.mkdir()
cfg = out / "config"
experiment = Path("lab/experiments/EXP-DX1/w1/group")
for rel in ["lab/config/slots.json", "lab/config/datomic", "packages/datomic/gateway", "packages/datomic/src/codec-spec.json"]:
    src, dest = repo / rel, cfg / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    if src.is_dir():
        shutil.copytree(src, dest)
    else:
        shutil.copy2(src, dest)
container = cfg / "lab/config/datomic"
(container / "attempt").write_text(str(uuid.uuid4())+"\n")
if args.field:
    (container / "field-study").write_text(args.field)
    if args.field in ("growth", "small-cost", "small-layout", "retention"):
        shutil.copy2(experiment.parent / "field/field_probe.clj", cfg / "packages/datomic/gateway/src/triplex/gateway/field_probe.clj")
    if args.field in ("small-cost", "small-layout", "retention"):
        shutil.copy2(experiment.parent / "small/native_cost.clj", cfg / "packages/datomic/gateway/src/triplex/gateway/native_cost.clj")
    if args.field == "retention":
        shutil.copy2(experiment.parent / "small/retention.clj", cfg / "packages/datomic/gateway/src/triplex/gateway/retention.clj")
        (container / "offers").write_text(str(args.offers) + "\n")
esbuild = repo / "node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild"
subprocess.run([esbuild, experiment / "local.ts", "--bundle", "--platform=node", "--format=esm",
                "--banner:js=import {createRequire as w1Require} from 'node:module'; const require=w1Require(import.meta.url);",
                "--outfile=" + str(container / "local.mjs")], check=True)
recipe = container / "Dockerfile"
recipe.write_text("FROM postgres:17-alpine AS w1pg\nFROM node:22.23.2-bookworm-slim AS w1node\n" +
                  recipe.read_text() + """
COPY --from=w1pg / /opt/thin-pg/
COPY --from=w1node /usr/local/bin/node /usr/local/bin/node
RUN ln -s /opt/thin-pg/lib/ld-musl-aarch64.so.1 /lib/ld-musl-aarch64.so.1 && echo '/opt/thin-pg/lib:/opt/thin-pg/usr/lib:/opt/thin-pg/usr/local/lib' > /etc/ld-musl-aarch64.path && cp -a /opt/thin-pg/usr/share/icu/. /usr/share/icu/ && /opt/thin-pg/usr/local/bin/postgres --version
""")
(container / "entrypoint.sh").write_text('#!/bin/bash\nset -eu\n[[ "$1" == selftest ]]\nexec node /config/local.mjs\n')
def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()
slots = cfg / "lab/config/slots.json"
s = json.loads(slots.read_text())
s["lanes"]["datomic"]["image"] = ("tx2-datomic:dx-w1-" + args.field + "-" + (container / "attempt").read_text()[:8]) if args.field else "tx2-datomic:dx-w1-group"
# The manager rewrites only the recorded image fields and expects the canonical slots formatting.
slots.write_text(json.dumps(s, indent=2) + "\n")
env = dict(os.environ, TX2_CONFIG_DIR=str(cfg), TX2_SLOTS_FILE=str(slots), TX2_ENGINE_DIR=str(out.parent / "engine-state"))
assert env.get("DOCKER_HOST") == s["dockerHost"]
files = {str(f.relative_to(cfg)):digest(f) for f in cfg.rglob("*") if f.is_file()}
(out / "inputs.json").write_text(json.dumps({"head":subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip(),
    "stage":files,"runner":{str(f):digest(f) for folder in ([experiment,experiment.parent / "field",experiment.parent / "small"] if args.field else [experiment]) for f in folder.iterdir() if f.is_file()}},indent=2)+"\n")
scratch = 8 if args.field == "growth" else 1
for action in ["build","selftest"]:
    for attempt in range(1,121):
        if shutil.disk_usage(repo).free < 5*1024**3:
            sys.exit("Below the lab disk floor")
        logfile = out / f"{action}-{attempt}.log"
        cmd = ["node","lab/bin/heavy.mjs","--poll-ms","300","--label","DX-W1-"+action,"--","node","lab/bin/engine.mjs",action,"--lane","datomic","--holder","DX-W1"]
        if action == "selftest" and args.field:
            cmd.extend(["--scratch-gib",str(scratch)])
        with logfile.open("x") as log:
            rc = subprocess.run(cmd, env=env, stdout=log, stderr=subprocess.STDOUT).returncode
        if rc == 0:
            if action == "selftest":
                image = json.loads(slots.read_text())["lanes"]["datomic"]["imageId"]
                (out / "terminal.json").write_text(json.dumps({"exit":rc,"slot":"tx2-datomic-selftest","holder":"DX-W1","image":image,"log":logfile.name,"sha256":digest(logfile)})+"\n")
            print(action, "complete", flush=True)
            break
        err = logfile.read_text(errors="replace")
        if action == "selftest" and any(msg in err for msg in ["pool refuses selftest","selftest already owned/running","measurement lease","active measurement"]):
            if "disk:" in err and args.field == "growth": scratch = 3 if scratch == 8 else 1
            time.sleep(15)
            continue
        sys.exit(f"{action} failed, see {logfile.name}")
    else:
        sys.exit("Lab slot unavailable")

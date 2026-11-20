"""Run the write audit on an owned Mac Datomic selftest reservation with PostgreSQL storage."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


root = Path.cwd()
source = Path(__file__).resolve().parent
out = Path(sys.argv[1]).resolve()
out.mkdir()
stage = out / "config"
for name in ("lab/config/slots.json", "lab/config/datomic", "packages/datomic/gateway", "packages/datomic/src/codec-spec.json"):
    target = stage / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if (root / name).is_dir():
        shutil.copytree(root / name, target)
    else:
        shutil.copy2(root / name, target)

config = stage / "lab/config/datomic"
attempt = str(uuid.uuid4())
for name in ("regression.clj", "sql_gate.clj", "sql.mjs"):
    shutil.copy2(source / name, config / name)
(config / "attempt").write_text(attempt + "\n")
gateway = {str(f.relative_to(stage / "packages/datomic/gateway")): sha(f)
           for f in sorted((stage / "packages/datomic/gateway").rglob("*")) if f.is_file()}
gateway["codec-spec.json"] = sha(stage / "packages/datomic/src/codec-spec.json")
(config / "gateway-source.json").write_text(json.dumps(gateway, sort_keys=True) + "\n")
recipe = config / "Dockerfile"
recipe.write_text(
    "FROM postgres:17-alpine AS auditpg\nFROM node:22.23.2-bookworm-slim AS auditnode\n" + recipe.read_text()
    + """
COPY --from=auditpg / /opt/thin-pg/
COPY --from=auditnode /usr/local/bin/node /usr/local/bin/node
RUN ln -s /opt/thin-pg/lib/ld-musl-aarch64.so.1 /lib/ld-musl-aarch64.so.1 && echo '/opt/thin-pg/lib:/opt/thin-pg/usr/lib:/opt/thin-pg/usr/local/lib' > /etc/ld-musl-aarch64.path && cp -a /opt/thin-pg/usr/share/icu/. /usr/share/icu/ && /opt/thin-pg/usr/local/bin/postgres --version
"""
)
(config / "entrypoint.sh").write_text('#!/bin/bash\nset -eu\n[[ "$1" == selftest ]]\nexec node /config/sql.mjs\n')
slots = stage / "lab/config/slots.json"
settings = json.loads(slots.read_text())
settings["lanes"]["datomic"]["image"] = "tx2-datomic:dx-wfix1"
slots.write_text(json.dumps(settings, indent=2) + "\n")
assert os.environ["DOCKER_HOST"] == settings["dockerHost"]
env = dict(os.environ, TX2_CONFIG_DIR=str(stage), TX2_SLOTS_FILE=str(slots),
           TX2_ENGINE_DIR=str(out.parent / "engine-state"))
inputs = {str(f.relative_to(stage)): sha(f) for f in stage.rglob("*") if f.is_file() and f != slots}
(out / "inputs.json").write_text(json.dumps({
    "attempt": attempt, "git": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
    "gatewaySource": sha(config / "gateway-source.json"),
    "stage": inputs, "runner": sha(Path(__file__)),
}, indent=2) + "\n")

for action in ("build", "selftest"):
    for number in range(1, 121):
        if shutil.disk_usage(root).free < 5 * 1024**3:
            sys.exit("Below the host disk floor")
        log = out / f"{action}-{number}.log"
        cmd = ["node", "lab/bin/heavy.mjs", "--poll-ms", "100", "--label", f"DX-WFIX1-{action}",
               "--", "node", "lab/bin/engine.mjs", action, "--lane", "datomic", "--holder", "DX-WFIX1"]
        if action == "selftest":
            cmd.extend(["--scratch-gib", "1"])
        with log.open("x") as stream:
            result = subprocess.run(cmd, stdout=stream, stderr=subprocess.STDOUT, env=env)
        if action == "selftest" and result.returncode and any(message in log.read_text(errors="replace") for message in (
            "pool refuses selftest", "selftest already owned/running", "measurement lease", "active measurement"
        )):
            time.sleep(10)
            continue
        assert all(sha(stage / file) == digest for file, digest in inputs.items())
        with (out / f"{action}-terminal.json").open("x") as stream:
            json.dump({"attempt": attempt, "action": action, "exit": result.returncode,
                       "image": json.loads(slots.read_text())["lanes"]["datomic"]["imageId"],
                       "slot": "tx2-datomic-selftest", "holder": "DX-WFIX1", "log": log.name, "sha256": sha(log)}, stream)
        if result.returncode:
            sys.exit(f"{action} failed ({log.name})")
        break
    else:
        sys.exit("Lab admission deadline reached")

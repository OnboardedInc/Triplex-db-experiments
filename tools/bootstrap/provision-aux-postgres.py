#!/usr/bin/env python3
"""Create the explicitly authorized owned PostgreSQL regression auxiliary only."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import secrets
import shutil
import socket
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
DOCKER = [str(ROOT / "tools/bootstrap/with-env.sh"), "docker"]
IMAGE = "postgres@sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193"
OWNER = "triplex-db-portable-13e39903"


def save(path, value):
    with path.open("x") as output:
        json.dump(value, output, indent=2)
        output.write("\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--generation", default="")
    args = parser.parse_args()
    if args.generation and (not args.generation.isalnum() or len(args.generation) > 16):
        raise ValueError("Use a short alphanumeric owned generation")
    subprocess.run(["python3", str(ROOT / "tools/bootstrap/check-storage.py")], check=True, stdout=subprocess.DEVNULL)
    daemon = json.loads(subprocess.check_output([*DOCKER, "info", "--format", "{{json .}}"], text=True))
    if daemon["ID"] != "83f54592-d273-4f4e-9f03-4b0b7c1dd105":
        raise ValueError("Wrong private daemon")
    image = json.loads(subprocess.check_output([*DOCKER, "image", "inspect", IMAGE], text=True))[0]
    if image["Id"] != IMAGE.split("@", 1)[1] or image["Architecture"] != "arm64" or IMAGE not in image["RepoDigests"]:
        raise ValueError("Pinned official PostgreSQL image differs")
    audited = ROOT / ".runtime/engines/aux-postgres-compiler-tests"
    suffix = "-" + args.generation if args.generation else ""
    directory = ROOT / (".runtime/engines/aux-postgres-compiler-tests" + suffix)
    if suffix:
        directory.mkdir(mode=0o700, exist_ok=False)
        for name in ["docker-entrypoint.sh", "image-passwd", "image-audit.json"]:
            shutil.copyfile(audited / name, directory / name)
    # The audited Alpine entrypoint requires getpwuid for --user. Add a private
    # container-only passwd row for the task UID, preserving host bind ownership;
    # no host passwd/group or existing service is changed. Source: this image's
    # docker-entrypoint.sh SHA9c440299..., docker_init_database_dir.
    audit = json.loads((directory / "image-audit.json").read_text())
    if hashlib.sha256((directory / "docker-entrypoint.sh").read_bytes()).hexdigest() != audit["files"]["docker-entrypoint.sh"]:
        raise ValueError("Unaudited image entrypoint")
    # VirtioFS cannot chmod PostgreSQL's Unix sockets. Keep those in the
    # container's /tmp. The official init helper clears PGHOST, so replace that
    # one audited line in an explicit read-only entrypoint adapter, not PG SQL.
    original_entrypoint = (directory / "docker-entrypoint.sh").read_text()
    target_line = 'PGHOST= PGHOSTADDR= "${query_runner[@]}" "$@"'
    if original_entrypoint.count(target_line) != 1:
        raise ValueError("Image entrypoint layout changed; do not patch speculatively")
    adapted_entrypoint = original_entrypoint.replace(target_line, 'PGHOST=/tmp PGHOSTADDR= "${query_runner[@]}" "$@"')
    entrypoint = directory / "triplex-entrypoint.sh"
    entrypoint.write_text(adapted_entrypoint)
    os.chmod(entrypoint, 0o755)
    save(directory / "entrypoint-adaptation.json", {"format": "triplex-auxiliary-entrypoint-adaptation/1", "image": IMAGE, "sourceSha256": audit["files"]["docker-entrypoint.sh"], "adaptedSha256": hashlib.sha256(adapted_entrypoint.encode()).hexdigest(), "onlyChange": "docker_process_sql initial PGHOST is /tmp instead of empty, matching the container-local Unix socket; no PG binary or SQL modification", "rejectedAlternatives": ["v1 environment PGHOST was cleared by official helper", "v2 host-bound Unix socket chmod returns EINVAL on VirtioFS"]})
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 15443))
    data = directory / "data"
    data.mkdir(mode=0o700, exist_ok=False)
    passwd = (directory / "image-passwd").read_text()
    if any(row.split(":")[2] == str(os.getuid()) for row in passwd.splitlines()):
        raise ValueError("Task UID already exists in image passwd; review before changing")
    (directory / "passwd").write_text(passwd + f"triplex-pg-owned:x:{os.getuid()}:{os.getgid()}:Owned regression:/tmp:/bin/false\n")
    password = secrets.token_hex(20)
    password_file = directory / "password"
    with password_file.open("x") as output:
        os.chmod(password_file, 0o600)
        output.write(password)
    url_file = directory / "url"
    with url_file.open("x") as output:
        os.chmod(url_file, 0o600)
        output.write(f"postgresql://triplex:{password}@127.0.0.1:15443/triplex\n")
    command = [*DOCKER, "run", "--detach", "--name", "triplex-db-aux-postgres-compiler-tests" + suffix, "--platform", "linux/arm64", "--restart", "no", "--user", f"{os.getuid()}:{os.getgid()}", "--label", "triplex.owner=" + OWNER, "--label", "triplex.backend=duckdb", "--label", "triplex.engine=postgres", "--label", "triplex.purpose=regression-only", "--memory", "512m", "--memory-swap", "512m", "--cpus", "1", "--pids-limit", "128", "--log-driver", "json-file", "--log-opt", "max-size=4m", "--log-opt", "max-file=2", "--publish", "127.0.0.1:15443:5432", "--entrypoint", "/usr/local/bin/triplex-entrypoint.sh", "--mount", f"type=bind,src={entrypoint},dst=/usr/local/bin/triplex-entrypoint.sh,readonly", "--mount", f"type=bind,src={data},dst=/var/lib/postgresql/data", "--mount", f"type=bind,src={directory / 'passwd'},dst=/etc/passwd,readonly", "--mount", f"type=bind,src={password_file},dst=/run/triplex/postgres-password,readonly", "--env", "POSTGRES_USER=triplex", "--env", "POSTGRES_DB=triplex", "--env", "POSTGRES_PASSWORD_FILE=/run/triplex/postgres-password", "--env", "PGDATA=/var/lib/postgresql/data/pgdata", IMAGE, "postgres", "-c", "unix_socket_directories=/tmp", "-c", "shared_buffers=64MB", "-c", "work_mem=4MB", "-c", "maintenance_work_mem=64MB", "-c", "max_connections=40", "-c", "max_parallel_workers=2", "-c", "max_worker_processes=4"]
    cid = subprocess.check_output(command, text=True).strip()
    save(directory / "owner.json", {"format": "triplex-owned-auxiliary-postgres/1", "containerId": cid, "imageSha256": image["Id"], "imageReference": IMAGE, "owner": OWNER, "dataPath": str(data), "urlFile": str(url_file), "engine": "postgres", "role": "test-auxiliary", "competingBackend": False, "chargedGroup": "duckdb", "memoryBytes": 512 * 1024**2, "cpuUnits": 1, "port": 15443})
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        state = json.loads(subprocess.check_output([*DOCKER, "inspect", "--format", "{{json .State}}", cid], text=True))
        if not state["Running"]:
            logs = subprocess.run([*DOCKER, "logs", "--tail", "100", cid], capture_output=True, text=True)
            (directory / "first-start-failure.log").write_text((logs.stdout + logs.stderr).replace(password, "[REDACTED]"))
            raise RuntimeError("Owned auxiliary stopped during initialization; retained log")
        ready = subprocess.run([*DOCKER, "exec", cid, "pg_isready", "-h", "127.0.0.1", "-U", "triplex", "-d", "triplex"], capture_output=True, text=True)
        if ready.returncode == 0:
            probe = subprocess.run([*DOCKER, "exec", cid, "sh", "-c", 'PGPASSWORD="$(cat /run/triplex/postgres-password)" psql -h 127.0.0.1 -U triplex -d triplex -Atqc "select current_setting(\'server_version\'),1"'], capture_output=True, text=True)
            if probe.returncode == 0:
                save(directory / "readiness.json", {"format": "triplex-owned-auxiliary-readiness/1", "result": "READY_REGRESSION_ONLY", "containerId": cid, "state": state, "probe": probe.stdout.strip(), "memoryBytes": 512 * 1024**2, "cpuUnits": 1, "urlFile": str(url_file), "notACompetingLane": True})
                print(json.dumps({"result": "READY_REGRESSION_ONLY", "containerId": cid, "urlFile": str(url_file)}))
                return
        time.sleep(.2)
    raise TimeoutError("Owned auxiliary readiness exceeded60s; container/data retained")


if __name__ == "__main__":
    main()

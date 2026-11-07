#!/usr/bin/env python3
"""Create fresh owned engines in the private project Docker daemon. Never reset."""
from pathlib import Path
import hashlib
import json
import os
import secrets
import shutil
import socket
import subprocess
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
OWNER = "triplex-db-portable-13e39903"
DOCKER = [str(ROOT / "tools/bootstrap/with-env.sh"), "docker"]
IMAGES = {
    "qlever": "sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec",
    "xtdb": "sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77",
}


def docker(*arguments):
    return subprocess.check_output([*DOCKER, *arguments], text=True)


def available(port):
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", port))


def save(path, value):
    with path.open("x") as output:
        json.dump(value, output, indent=2)
        output.write("\n")
        output.flush()
        os.fsync(output.fileno())


def qget(port, token, parameters):
    url = f"http://127.0.0.1:{port}/?" + urllib.parse.urlencode(parameters)
    request = urllib.request.Request(url, headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(request, timeout=3) as response:
        data = response.read(1024 * 1024 + 1)
        if len(data) > 1024 * 1024:
            raise ValueError("Native readiness response exceeds1MiB")
        return json.loads(data)


def main():
    subprocess.run(["python3", str(ROOT / "tools/bootstrap/check-storage.py")], check=True, stdout=subprocess.DEVNULL)
    info = json.loads(docker("info", "--format", "{{json .}}"))
    if info["ID"] != "83f54592-d273-4f4e-9f03-4b0b7c1dd105" or info["Name"] != "colima-triplex" or info["Architecture"] != "aarch64":
        raise SystemExit("Private owned Docker daemon identity differs")
    if info["MemTotal"] < int(6.25 * 1024 ** 3) or info["NCPU"] != 4:
        raise SystemExit("Guest does not fit engine caps plus OS reserve")
    existing = docker("ps", "-a", "--format", "{{.Names}} {{.Labels}}")
    if existing.strip():
        raise SystemExit("Fresh commission expects no existing containers; inspect instead of recreating")
    for backend, image in IMAGES.items():
        item = json.loads(docker("image", "inspect", image))[0]
        if item["Id"] != image or item["Architecture"] != "arm64":
            raise SystemExit("Pinned image identity differs: " + backend)
    base = ROOT / ".runtime/engines"
    base.mkdir(exist_ok=True)
    qdir, xdir = base / "qlever-main", base / "xtdb-main"
    if qdir.exists() or xdir.exists():
        raise SystemExit("New engine destinations required; nothing reset")
    for directory in [qdir, xdir]:
        directory.mkdir(mode=0o700)
        (directory / "data").mkdir(mode=0o700)
    bootstrap = ROOT / "provenance/archive/qlever-bootstrap"
    manifest = json.loads((bootstrap / "MANIFEST.json").read_text())
    for item in manifest["files"]:
        source = bootstrap / item["path"]
        if source.is_symlink() or hashlib.sha256(source.read_bytes()).hexdigest() != item["sha256"]:
            raise SystemExit("QLever immutable bootstrap mismatch")
        shutil.copyfile(source, qdir / "data" / item["path"])
    token = secrets.token_urlsafe(32)
    token_path = qdir / "access-token"
    with token_path.open("x") as output:
        os.chmod(token_path, 0o600)
        output.write(token)
    shutil.copyfile(ROOT / "xtdb-config.yaml", xdir / "xtdb-config.yaml")
    for port in [17019, 15442, 18080]:
        available(port)
    common = ["run", "--detach", "--platform", "linux/arm64", "--restart", "no", "--user", f"{os.getuid()}:{os.getgid()}", "--label", "triplex.owner=" + OWNER, "--log-driver", "json-file", "--log-opt", "max-size=8m", "--log-opt", "max-file=2"]
    qargs = [*common, "--name", "triplex-db-qlever-main", "--label", "triplex.backend=qlever", "--cpus", "1.5", "--memory", "2g", "--memory-swap", "2g", "--pids-limit", "256", "--publish", "127.0.0.1:17019:7019", "--mount", f"type=bind,src={qdir / 'data'},dst=/data", "--workdir", "/data", "--entrypoint", "qlever-server", IMAGES["qlever"], "-i", "triplex", "-p", "7019", "-j", "4", "-m", "512M", "-c", "64M", "-e", "32M", "--persist-updates", "--no-patterns", "--enable-metrics", "--access-token", token]
    xargs = [*common, "--name", "triplex-db-xtdb-main", "--label", "triplex.backend=xtdb", "--cpus", "2", "--memory", "3g", "--memory-swap", "3g", "--pids-limit", "512", "--publish", "127.0.0.1:15442:5432", "--publish", "127.0.0.1:18080:8080", "--mount", f"type=bind,src={xdir / 'data'},dst=/var/lib/xtdb", "--mount", f"type=bind,src={xdir / 'xtdb-config.yaml'},dst=/etc/xtdb/config.yaml,readonly", "--env", "JDK_JAVA_OPTIONS=-Xmx1536m -XX:MaxDirectMemorySize=512m", IMAGES["xtdb"], "-f", "/etc/xtdb/config.yaml"]
    qid = docker(*qargs).strip()
    xid = docker(*xargs).strip()
    save(base / "owners.json", {"format": "triplex-owned-engine-foundations/1", "owner": OWNER, "profile": "local-commission-v1", "qualification": "FRESH_UNQUALIFIED", "dockerHost": str(ROOT / ".runtime/colima/triplex/docker.sock"), "engines": {"qlever": {"container": "triplex-db-qlever-main", "id": qid, "image": IMAGES["qlever"], "directory": str(qdir), "memoryBytes": 2 * 1024 ** 3, "cpus": 1.5, "url": "http://127.0.0.1:17019", "tokenPath": str(token_path), "history": "Fresh one-triple immutable bootstrap; no old45factfixture"}, "xtdb": {"container": "triplex-db-xtdb-main", "id": xid, "image": IMAGES["xtdb"], "directory": str(xdir), "memoryBytes": 3 * 1024 ** 3, "cpus": 2, "url": "postgresql://xtdb:xtdb@127.0.0.1:15442/xtdb", "healthUrl": "http://127.0.0.1:18080/healthz/ready"}}, "clientPlacement": "Initial TS adapters/generators run on macOS with separately charged supervision; no claim of client cgroup containment.", "nativeTokenLogging": "Pinned QLever logs startup token. Do not publish raw dockerlogs/inspectcommands; redact token. Docker administrators remain trusted."})
    deadline = time.monotonic() + 90
    qready = xready = False
    last = {}
    while time.monotonic() < deadline and not (qready and xready):
        if not qready:
            try:
                qget(17019, token, {"query-planning-budget": "100"})
                settings = qget(17019, token, {"cmd": "get-settings"})
                stats = qget(17019, token, {"cmd": "stats"})
                if settings["query-planning-budget"] != "100" or not stats["git-hash-server"].startswith("6c5861a"):
                    raise ValueError("QLever fresh readiness differs")
                save(qdir / "readiness.json", {"format": "triplex-qlever-fresh-readiness/1", "result": "READY_UNQUALIFIED", "containerId": qid, "settings": settings, "stats": stats, "profile": "local-commission-v1", "createdUnix": time.time()})
                qready = True
            except Exception as error:
                last["qlever"] = type(error).__name__ + ": " + str(error)
        if not xready:
            try:
                with urllib.request.urlopen("http://127.0.0.1:18080/healthz/ready", timeout=3) as response:
                    if response.status != 200:
                        raise ValueError("XTDB health is not ready")
                    save(xdir / "readiness.json", {"format": "triplex-xtdb-fresh-readiness/1", "result": "READY_UNQUALIFIED", "containerId": xid, "response": response.read(1024).decode(), "profile": "local-commission-v1", "createdUnix": time.time()})
                    xready = True
            except Exception as error:
                last["xtdb"] = type(error).__name__ + ": " + str(error)
        if not (qready and xready):
            time.sleep(.2)
    save(base / "commission-result.json", {"format": "triplex-owned-engine-commission/1", "result": "READY_UNQUALIFIED" if qready and xready else "FAIL_READINESS", "qleverReady": qready, "xtdbReady": xready, "lastErrors": last, "atUnix": time.time()})
    print(json.dumps({"result": "READY_UNQUALIFIED" if qready and xready else "FAIL_READINESS", "qleverReady": qready, "xtdbReady": xready, "owners": str(base / "owners.json")}, indent=2))
    raise SystemExit(0 if qready and xready else 1)


if __name__ == "__main__":
    main()

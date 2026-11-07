#!/usr/bin/env python3
"""Prepare privately; execute ONLY in a later exclusive native-fault window.

No Docker operation or native request occurs in prepare mode. Execution refuses
undeclared resource profiles, concurrent owned QLever nodes, unfenced workers,
stale source copies, and a missing inherited qualification lease. Containers,
copies, native temporary files, request evidence and journals are all retained.
"""
from __future__ import annotations

import argparse
import dataclasses
import fcntl
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

from broker import ManagedWriter, canonical, sync_directory
from native_fixture import NS, prepare
from native_worker import OwnedNativeConfiguration, OwnedQleverWorker

ROOT = Path(__file__).resolve().parents[2]
IMAGE = OwnedNativeConfiguration.__dataclass_fields__["image"].default
MAX_RESPONSE = 4 * 1024 * 1024


def write(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        raw = memoryview(canonical(value) + b"\n")
        while raw:
            count = os.write(fd, raw)
            if count <= 0:
                raise OSError("Incomplete packet evidence write")
            raw = raw[count:]
        os.fsync(fd)
    finally:
        os.close(fd)
    sync_directory(path.parent)


def command(*arguments, timeout=30, env=None):
    result = subprocess.run(arguments, text=True, capture_output=True, timeout=timeout, env=env)
    # Never put inspect argv (which contains a native access token) in evidence.
    if result.returncode:
        detail = result.stderr[:2000]
        if env and env.get("TRIPLEX_MANAGED_NATIVE_TOKEN"):
            detail = detail.replace(env["TRIPLEX_MANAGED_NATIVE_TOKEN"], "[REDACTED]")
        raise RuntimeError(f"Command {arguments[0]} failed with exit{result.returncode}: {detail}")
    return result.stdout


def inspect(name):
    return json.loads(command("docker", "inspect", name))[0]


def require_lease():
    lock = (ROOT / ".experiments/backend-leases/qlever.lock").stat()
    for fd in range(3, 1024):
        try:
            item = os.fstat(fd)
            if (item.st_dev, item.st_ino) == (lock.st_dev, lock.st_ino):
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                return
        except OSError:
            pass
    raise RuntimeError("Execute requires an inherited exclusive QLever qualification lease")


def closed_owners():
    names = command("docker", "ps", "-a", "--filter", "label=triplex.owner=triplex-db", "--format", "{{.Names}}").splitlines()
    names += ["triplex-qlever-local"]  # Original server predates owner labels.
    proof = []
    for name in sorted(set(names)):
        if not name.startswith("triplex-qlever-"):
            continue
        item = inspect(name)
        assert not item["State"]["Running"] and item["State"]["Pid"] == 0, "A different QLever owner is active"
        proof.append({"name": name, "containerId": item["Id"], "startedAt": item["State"]["StartedAt"], "pid": 0})
    return proof


def inventory(directory):
    rows = []
    for path in sorted(directory.rglob("*")):
        if path.is_symlink():
            raise RuntimeError("Symlink in owned copy source")
        if path.is_file():
            rows.append({"path": str(path.relative_to(directory)), "bytes": path.stat().st_size,
                         "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    return rows


def native_get(url, parameters, token=None):
    request = urllib.request.Request(url.rstrip("/") + "/?" + urllib.parse.urlencode(parameters))
    if token:
        request.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(request, timeout=3) as response:
        raw = response.read(MAX_RESPONSE + 1)
        if len(raw) > MAX_RESPONSE:
            raise RuntimeError("Native response exceeded4MiB")
        return json.loads(raw)


def configure_epoch(worker):
    deadline = time.monotonic() + 20
    while True:
        try:
            stats = worker.http(None)
            break
        except Exception:
            if time.monotonic() > deadline:
                raise
            time.sleep(.1)
    assert stats["version-server"] == "v0.6.0" and stats["git-hash-server"] == "6c5861a"
    native_get(worker.configuration.url, {"query-planning-budget": "100"}, worker.configuration.access_token)
    settings = native_get(worker.configuration.url, {"cmd": "get-settings"})
    assert settings["query-planning-budget"] == "100"
    assert settings["cache-max-size"] == "64 MB" and settings["cache-max-size-single-entry"] == "32 MB"
    return {"stats": stats, "settings": settings, "fence": worker.assert_fenced()}


def cancel_frame(url, query_id):
    """Send one masked websocket cancellation request; this is NOT stop proof."""
    parsed = urllib.parse.urlparse(url)
    key = __import__("base64").b64encode(secrets.token_bytes(16)).decode()
    with socket.create_connection((parsed.hostname, parsed.port), timeout=2) as stream:
        request = f"GET /watch/{urllib.parse.quote(query_id, safe='')} HTTP/1.1\r\nHost: {parsed.hostname}:{parsed.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        stream.sendall(request.encode())
        header = b""
        while b"\r\n\r\n" not in header:
            part = stream.recv(1024)
            if not part or len(header) > 8192:
                raise RuntimeError("Invalid cancellation handshake")
            header += part
        if not header.startswith(b"HTTP/1.1 101 "):
            raise RuntimeError("Native websocket upgrade rejected")
        payload, mask = b"cancel", secrets.token_bytes(4)
        stream.sendall(bytes([0x81, 0x80 | len(payload)]) + mask + bytes(byte ^ mask[n % 4] for n, byte in enumerate(payload)))
        # The request can race with completion. Observe final HTTP/native state
        # and the closed/reloaded proof independently.


class FaultWorker(OwnedQleverWorker):
    def __init__(self, configuration, directory, *, cancel=False, permission_fault=False):
        super().__init__(configuration)
        self.directory = directory
        self.cancel = cancel
        self.permission_fault = permission_fault
        self.permissions_restricted = False
        self.events = []

    def apply(self, request):
        if not self.cancel:
            try:
                return super().apply(request)
            except urllib.error.HTTPError as error:
                raw = error.read(MAX_RESPONSE + 1)
                write(self.directory / f"native-update-error-{time.time_ns()}.json",
                      {"httpStatus": error.code, "response": raw[:MAX_RESPONSE].decode(errors="replace"),
                       "responseTruncated": len(raw) > MAX_RESPONSE, "operationId": request.operation_id})
                raise
        query_id = "managed-cancel-" + uuid.uuid4().hex
        finished = threading.Event()
        cancellation = {"queryId": query_id, "registered": False, "requestSent": False, "phase": "UNPROVEN"}

        def sender():
            deadline = time.monotonic() + 3
            try:
                while not finished.is_set() and time.monotonic() < deadline:
                    active = native_get(self.configuration.url, {"cmd": "dump-active-queries"}, self.configuration.access_token)
                    if query_id in active:
                        cancellation["registered"] = True
                        cancellation["registeredAtNs"] = time.time_ns()
                        cancel_frame(self.configuration.url, query_id)
                        cancellation["requestSent"] = True
                        cancellation["sentAtNs"] = time.time_ns()
                        return
                    time.sleep(.005)
            except Exception as error:
                cancellation["senderError"] = type(error).__name__ + ":" + str(error)[:1000]

        sender_thread = threading.Thread(target=sender, daemon=True)
        sender_thread.start()
        query = urllib.parse.urlencode({"timeout": "4000ms"})
        headers = {"Content-Type": "application/sparql-update", "Accept": "application/json",
                   "Authorization": "Bearer " + self.configuration.access_token, "Query-Id": query_id}
        native = urllib.request.Request(self.configuration.url + "/?" + query, data=request.native_modify.encode(), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(native, timeout=5) as response:
                raw = response.read(MAX_RESPONSE + 1)
                if len(raw) > MAX_RESPONSE:
                    raise RuntimeError("Cancellation response exceeds4MiB")
                cancellation.update(httpStatus=response.status, response=raw.decode(errors="replace"))
        except urllib.error.HTTPError as error:
            raw = error.read(MAX_RESPONSE + 1)
            cancellation.update(httpStatus=error.code, response=raw[:MAX_RESPONSE].decode(errors="replace"))
            raise
        finally:
            finished.set()
            sender_thread.join(timeout=4)
            cancellation["senderFinished"] = not sender_thread.is_alive()
            write(self.directory / f"cancellation-{time.time_ns()}.json", cancellation)

    def close_epoch(self):
        state = self.inspect()["State"]
        observation = {"stateBeforeClose": state}
        if state["Running"]:
            try:
                observation["cgroupBeforeClose"] = self.command("exec", self.configuration.container, "sh", "-c", "cat /sys/fs/cgroup/memory.current /sys/fs/cgroup/memory.peak", timeout=3).splitlines()
            except Exception as error:
                observation["cgroupUnavailable"] = type(error).__name__
        self.events.append(observation)
        closed = super().close_epoch()
        assert self.inspect()["State"]["Pid"] == 0
        if self.permissions_restricted:
            # Restore ONLY this owned test fixture, after native execution has
            # stopped. Neither a live failed epoch nor original data is touched.
            self.snapshot.parent.chmod(0o777)
            self.permissions_restricted = False
            self.events.append({"permissionRestoredAfterClosedEpoch": closed})
        return closed

    def reload(self, closed, snapshot):
        proof = super().reload(closed, snapshot)
        proof["configuredEpoch"] = configure_epoch(self)
        return proof


def auth_probe(worker, directory):
    body = f'INSERT DATA {{ <{NS}fence-probe> <{NS}must-not-exist> "unauthorized" }}'.encode()
    observations = []
    for token in (None, "deliberately-wrong-native-token"):
        headers = {"Content-Type": "application/sparql-update"}
        if token:
            headers["Authorization"] = "Bearer " + token
        request = urllib.request.Request(worker.configuration.url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=3) as response:
                status = response.status
        except urllib.error.HTTPError as error:
            status = error.code
        observations.append({"credential": "missing" if token is None else "wrong", "httpStatus": status})
        if status not in (401, 403):
            write(directory / "fence-failed.json", observations)
            worker.close_epoch()
            raise RuntimeError("Actual native update fence failed; preserve probe data and stop")
    write(directory / "fence-proof.json", observations)


def prepare_packet(destination: Path):
    allowed = ROOT / ".qlever/managed"
    destination = destination.resolve()
    assert destination.is_relative_to(allowed) and not destination.exists()
    destination.mkdir(parents=True)
    run = uuid.uuid4().hex[:12]
    cases = []
    for case in ("cancel", "persist", "lostack"):
        directory = destination / case
        directory.mkdir()
        operation = "native:" + run + ":" + case
        req = prepare(operation, facts=1 if case == "cancel" else 3, delay_rows=200000 if case == "cancel" else 0)
        old = prepare(operation + ":old")
        next_request = prepare(operation + ":next")
        for filename, value in (("request.json", req), ("old.json", old), ("next.json", next_request)):
            write(directory / filename, dataclasses.asdict(value))
        token = secrets.token_hex(32)
        token_file = directory / "token"
        token_file.write_text(token)
        token_file.chmod(0o600)
        name = f"triplex-qlever-managed-{run}-{case}"
        compose = {"name": name, "services": {"native": {"image": IMAGE, "container_name": name, "platform": "linux/arm64",
                   "cpus": 2, "mem_limit": "2g", "memswap_limit": "2g", "working_dir": "/data", "user": "1000:1000",
                   "entrypoint": ["qlever-server"], "command": ["-i", "triplex", "-p", "7019", "-j", "4", "-m", "512M", "-c", "64M", "-e", "32M", "--persist-updates", "--no-patterns", "--access-token", "${TRIPLEX_MANAGED_NATIVE_TOKEN:?private token required}"],
                   "ports": ["127.0.0.1:7023:7019"], "volumes": [str(directory / "data") + ":/data"],
                   "labels": {"triplex.owner": "triplex-db", "triplex.experiment": "managed-writer", "triplex.profile": "managed-native-fault", "triplex.case": case},
                   "logging": {"driver": "json-file", "options": {"max-size": "8m", "max-file": "2"}}, "restart": "no",
                   "cap_drop": ["ALL"], "security_opt": ["no-new-privileges:true"]}}}
        write(directory / "compose.json", compose)
        cases.append({"case": case, "container": name, "composeProject": name, "dataPath": str((directory / "data").relative_to(ROOT)),
                      "containerDataPath": "/data", "url": "http://127.0.0.1:7023", "operationId": req.operation_id,
                      "expectedRows": req.expected_count, "expectedDigest": req.expected_digest})
    packet = {"format": "qlever-managed-native-fault-packet/1", "status": "PREPARED_NOT_EXECUTED", "run": run,
              "image": IMAGE, "source": ".qlever/data", "cases": cases, "plannedWorstOverlapBytes": 1024**3,
              "profile": {"memoryBytes": 2 * 1024**3, "cpu": 2, "nativeAllocation": "512M", "cache": "64M", "singleEntry": "32M", "threads": 4, "planner": 100},
              "sourceFiles": inventory(ROOT / ".qlever/data"), "sourceHashes": {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(Path(__file__).parent.glob("*.py"))},
              "limitations": ["This packet has not made a native request or provisioned a worker.", "Cancellation request timing does not establish mutation-phase interruption.", "Logical native controls do not qualify the public Triplex callback/CAS mapping or power-loss durability.", "Containers, copied data, snapshots and native temporary files are retained, including failed trials."]}
    write(destination / "packet.json", packet)
    print(json.dumps({"status": packet["status"], "packet": str(destination / "packet.json"), "owners": cases, "plannedWorstOverlapBytes": packet["plannedWorstOverlapBytes"]}))


def execute(packet_path: Path, admission_profile: str):
    require_lease()
    packet_path = packet_path.resolve()
    assert packet_path.is_relative_to(ROOT / ".qlever/managed")
    packet = json.loads(packet_path.read_text())
    assert packet["format"] == "qlever-managed-native-fault-packet/1" and packet["status"] == "PREPARED_NOT_EXECUTED"
    assert admission_profile, "A separately declared resource profile is required"
    for filename, digest in packet["sourceHashes"].items():
        assert hashlib.sha256((ROOT / filename).read_bytes()).hexdigest() == digest, "Frozen fault harness source changed"
    results = []
    for case in packet["cases"]:
        directory = packet_path.parent / case["case"]
        assert not (directory / "data").exists(), "Never overwrite or reset a retained native trial"
        owners = closed_owners()
        admission = ROOT / f"qualification/evidence/qlever-managed-preflight-{packet['run']}-{case['case']}.json"
        command("node", str(ROOT / "scripts/triplex-resources.mjs"), "--backend", "qlever", "--profile", admission_profile,
                "--planned-bytes", str(packet["plannedWorstOverlapBytes"]), "--output", str(admission))
        source = ROOT / packet["source"]
        before = inventory(source)
        assert before == packet["sourceFiles"], "Closed source changed since packet preparation; create a new packet"
        start = time.time_ns()
        shutil.copytree(source, directory / "data")
        assert inventory(source) == before == inventory(directory / "data")
        (directory / "data").chmod(0o777)
        for copied in (directory / "data").rglob("*"):
            if copied.is_file():
                copied.chmod(0o666 if copied.name.startswith("triplex.update-triples") else 0o644)
        write(directory / "closed-copy.json", {"startedAtNs": start, "finishedAtNs": time.time_ns(), "closedOwners": owners, "files": before})
        token = (directory / "token").read_text()
        env = {**os.environ, "TRIPLEX_MANAGED_NATIVE_TOKEN": token}
        command("docker", "compose", "-f", str(directory / "compose.json"), "create", env=env)
        command("docker", "compose", "-f", str(directory / "compose.json"), "start", env=env)
        worker = FaultWorker(OwnedNativeConfiguration(case["container"], case["url"], directory / "data/triplex.update-triples", token), directory,
                             cancel=case["case"] == "cancel", permission_fault=case["case"] == "persist")
        try:
            write(directory / "initial-epoch.json", configure_epoch(worker))
            assert inspect(case["container"])["Config"]["User"] == "1000:1000"
            actual_uid = command("docker", "exec", case["container"], "id", "-u").strip()
            assert actual_uid == "1000", "UID0 cannot create the intended permission failure"
            auth_probe(worker, directory)
            from broker import PreparedModify
            read_request = lambda name: PreparedModify(**json.loads((directory / name).read_text()))
            old, request, next_request = (read_request(name) for name in ("old.json", "request.json", "next.json"))
            # Baseline is acknowledged before introducing faults. Cancellation
            # must not affect this setup commit.
            worker.cancel = False
            broker = ManagedWriter(worker.intent_directory, worker)
            old_outcome = broker.commit(old)
            assert old_outcome.status == "committed"
            write(directory / "old-ack.json", dataclasses.asdict(old_outcome))
            if case["case"] == "persist":
                (directory / "data").chmod(0o555)
                worker.permissions_restricted = True
                probe = subprocess.run(["docker", "exec", "--user", "1000:1000", case["container"], "sh", "-c", f"printf denied > /data/permission-probe-{packet['run']}"], capture_output=True, text=True, timeout=3)
                write(directory / "actual-permission-denial.json", {"uid": actual_uid, "mode": "0555", "exitCode": probe.returncode, "stderr": probe.stderr})
                assert probe.returncode != 0 and "Permission denied" in probe.stderr, "Kernel permission fault was not created"
            if case["case"] == "lostack":
                before_sha = hashlib.sha256(worker.snapshot.read_bytes()).hexdigest()
                pid = os.fork()
                if pid == 0:
                    def die(phase, _request):
                        if phase == "after_apply":
                            now_sha = hashlib.sha256(worker.snapshot.read_bytes()).hexdigest()
                            write(directory / "after-rename-before-ack.json", {"phase": phase, "nativeHttpSuccess": True, "beforeSha256": before_sha, "afterSha256": now_sha, "snapshotChanged": before_sha != now_sha, "exit": 77})
                            os._exit(77)
                    ManagedWriter(worker.intent_directory, worker, fault=die).commit(request)
                    os._exit(78)
                _, status = os.waitpid(pid, 0)
                assert os.waitstatus_to_exitcode(status) == 77
                witness = json.loads((directory / "after-rename-before-ack.json").read_text())
                assert witness["snapshotChanged"]
                outcome = broker.resolve(request.operation_id)
                assert outcome.status == "committed"
            else:
                worker.cancel = case["case"] == "cancel"
                outcome = broker.commit(request)
                if case["case"] == "persist":
                    assert outcome.status == "not_committed_closed", "Actual persistence failure did not resolve absent after reload"
                # Either result can be honest if cancellation raced completion;
                # absence is accepted only after the broker's closed reload.
                if case["case"] == "cancel":
                    traces = sorted(directory.glob("cancellation-*.json"))
                    assert traces and json.loads(traces[-1].read_text())["requestSent"], "No actual cancellation was sent"
            assert worker.check(old).status == "committed", "Previously acknowledged full payload lost"
            worker.cancel = False
            next_outcome = broker.commit(next_request)
            assert next_outcome.status == "committed" and worker.check(next_request).status == "committed"
            result = {"case": case["case"], "status": "OBSERVED", "operation": dataclasses.asdict(outcome),
                      "oldFullProof": dataclasses.asdict(worker.check(old)), "nextFullProof": dataclasses.asdict(worker.check(next_request)),
                      "workerEvents": worker.events, "phaseQualification": "UNPROVEN_MUTATION_PHASE" if case["case"] == "cancel" else "CHECK_NATIVE_TRACE"}
            write(directory / "result.json", result)
            results.append(result)
        finally:
            # Stop is part of explicit trial isolation, not deletion/cleanup.
            # All source/copy/temp files and the container remain retained.
            write(directory / f"retained-closed-epoch-{time.time_ns()}.json", worker.close_epoch())
            logs = command("docker", "logs", "--tail", "1000", case["container"])
            log_path = directory / "native-tail.log"
            with log_path.open("x") as stream:
                stream.write(logs)
    write(packet_path.parent / "native-results.json", {"format": "qlever-managed-native-fault-results/1", "cases": results,
          "limitations": ["No power-loss durability claim.", "Cancellation mutation phase must be independently established from native traces; request/timeout alone is insufficient.", "Private native controls do not qualify public Triplex transaction mapping."]})
    print(json.dumps({"status": "NATIVE_CASES_RECORDED_REVIEW_REQUIRED", "path": str(packet_path.parent / "native-results.json")}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--prepare", type=Path)
    group.add_argument("--execute", type=Path)
    parser.add_argument("--admission-profile")
    arguments = parser.parse_args()
    if arguments.prepare:
        prepare_packet(arguments.prepare)
    else:
        execute(arguments.execute, arguments.admission_profile)

"""Opt-in native adapter for a FUTURE dedicated, token-fenced owned copy.

Importing or constructing this adapter starts/stops nothing. Current candidate
containers and the ordinary development container fail its ownership checks.
"""
from __future__ import annotations

import dataclasses
import hashlib
import hmac
import json
import os
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from broker import BrokerClosed, NativeProof, PreparedModify, RecoveryIntent, proof_digest, sync_directory


@dataclasses.dataclass(frozen=True)
class OwnedNativeConfiguration:
    container: str
    url: str
    snapshot: Path
    access_token: str = dataclasses.field(repr=False)
    image: str = "adfreiburg/qlever:0.6.0@sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec"
    request_timeout_seconds: float = 5
    recovery_timeout_seconds: float = 20


class OwnedQleverWorker:
    def __init__(self, configuration: OwnedNativeConfiguration):
        self.configuration = configuration
        parsed = urllib.parse.urlparse(configuration.url)
        if not configuration.container.startswith("triplex-qlever-managed-"):
            raise ValueError("Only a dedicated managed-writer experiment container is allowed")
        if parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or not parsed.port or parsed.username or parsed.password:
            raise ValueError("The owned test endpoint must be an explicit loopback HTTP port")
        if len(configuration.access_token) < 32:
            raise ValueError("A private native update token of at least32characters is required")
        self.snapshot = configuration.snapshot.resolve()
        # Prevent accidental operations against the protected dev/candidate data.
        repository = Path(__file__).resolve().parents[2]
        allowed = repository / ".qlever" / "managed"
        if not self.snapshot.is_relative_to(allowed) or self.snapshot.name != "triplex.update-triples":
            raise ValueError("A separate .qlever/managed/... native snapshot is required")
        self.intent_directory = self.snapshot.parent.parent / "broker"

    def coordination_path(self) -> Path:
        return self.intent_directory / "writer.lock"

    def command(self, *arguments: str, timeout: float = 5) -> str:
        result = subprocess.run(["docker", *arguments], capture_output=True, text=True, timeout=timeout, check=True)
        return result.stdout

    def inspect(self) -> dict[str, Any]:
        return json.loads(self.command("inspect", self.configuration.container))[0]

    def ownership(self, item: dict[str, Any]) -> None:
        labels = item["Config"].get("Labels") or {}
        if labels.get("triplex.owner") != "triplex-db" or labels.get("triplex.experiment") != "managed-writer":
            raise BrokerClosed("Native container ownership labels do not match")
        if item["Config"]["Image"] != self.configuration.image:
            raise BrokerClosed("Native image is not the declared pinned image")
        if item["Config"].get("WorkingDir") != "/data":
            raise BrokerClosed("Native relative basename must resolve in /data")
        if item["HostConfig"].get("RestartPolicy", {}).get("Name") not in ("", "no"):
            raise BrokerClosed("Automatic native epoch restart is forbidden for closed-epoch proof")
        data_mounts = [mount for mount in item["Mounts"] if mount["Destination"] == "/data"]
        if len(data_mounts) != 1 or Path(data_mounts[0]["Source"]).resolve() != self.snapshot.parent:
            raise BrokerClosed("Native worker is not mounted on the isolated managed dataset")
        memory, cpu = item["HostConfig"]["Memory"], item["HostConfig"]["NanoCpus"]
        if memory <= 0 or memory > 2 * 1024 ** 3 or item["HostConfig"]["MemorySwap"] != memory or cpu <= 0 or cpu > 2 * 10**9:
            raise BrokerClosed("Native managed trial exceeds its provisional2GiB/2CPU profile")
        if item["Config"].get("Entrypoint") != ["qlever-server"]:
            raise BrokerClosed("Native worker must use the declared direct executable, without a wrapper")
        arguments = item["Config"]["Entrypoint"] + (item["Config"].get("Cmd") or [])
        def exact_option(name: str, expected: str) -> None:
            # The dedicated owned profile uses exact two-argument short options.
            # Reject alternate/duplicate forms rather than guessing precedence.
            if arguments.count(name) != 1:
                raise BrokerClosed("Native worker must declare one exact " + name + " option")
            index = arguments.index(name)
            if index + 1 >= len(arguments) or arguments[index + 1] != expected:
                raise BrokerClosed("Native worker " + name + " differs from the declared snapshot/port")
        exact_option("-i", "triplex")
        exact_option("-p", "7019")
        if any(value.startswith(("--index", "--port")) or (value.startswith("-i") and value != "-i") or (value.startswith("-p") and value != "-p") for value in arguments):
            raise BrokerClosed("Alternate native basename/port forms are not qualified")
        if any(value.startswith("--no-access-check") for value in arguments):
            raise BrokerClosed("Unfenced --no-access-check worker cannot accept broker writes")
        if arguments.count("--access-token") != 1 or any(value.startswith("--access-token") and value != "--access-token" for value in arguments):
            raise BrokerClosed("Exactly one unambiguous native access token option is required")
        try:
            token = arguments[arguments.index("--access-token") + 1]
        except (ValueError, IndexError):
            raise BrokerClosed("Native update access token is not configured") from None
        if not hmac.compare_digest(token, self.configuration.access_token):
            raise BrokerClosed("Native update fence uses a different token")
        expected_port = str(urllib.parse.urlparse(self.configuration.url).port)
        bindings = item["HostConfig"].get("PortBindings", {}).get("7019/tcp", [])
        if bindings != [{"HostIp": "127.0.0.1", "HostPort": expected_port}]:
            raise BrokerClosed("Native port is not restricted to the declared loopback endpoint")
        if "--persist-updates" not in arguments:
            raise BrokerClosed("Native snapshot persistence is disabled")

    def assert_fenced(self) -> dict[str, Any]:
        item = self.inspect()
        self.ownership(item)
        if not item["State"]["Running"]:
            raise BrokerClosed("Managed native worker is not running")
        return {"worker_id": item["Id"], "epoch": item["State"]["StartedAt"], "token_fenced": True, "global_lock_path": str(self.intent_directory / "writer.lock")}

    def http(self, text: str | None, *, update: bool = False) -> dict[str, Any]:
        query = {"timeout": f"{int(self.configuration.request_timeout_seconds * 1000)}ms"}
        if text is None:
            query["cmd"] = "stats"
        url = self.configuration.url.rstrip("/") + "/?" + urllib.parse.urlencode(query)
        headers = {"Accept": "application/json" if update or text is None else "application/sparql-results+json"}
        if text is not None:
            headers["Content-Type"] = "application/sparql-update" if update else "application/sparql-query"
        if update:
            headers["Authorization"] = "Bearer " + self.configuration.access_token
        request = urllib.request.Request(url, data=None if text is None else text.encode(), headers=headers, method="GET" if text is None else "POST")
        with urllib.request.urlopen(request, timeout=self.configuration.request_timeout_seconds) as response:
            body = response.read(4 * 1024 * 1024 + 1)
            if len(body) > 4 * 1024 * 1024:
                raise RuntimeError("Native managed-worker response exceeds4MiB")
            return json.loads(body)

    def apply(self, request: PreparedModify) -> None:
        # Only trusted adapter-generated single-MODIFY requests are admitted.
        # This adapter does not introduce a second SPARQL parser or query language.
        self.http(request.native_modify, update=True)

    def check(self, request: PreparedModify | RecoveryIntent) -> NativeProof:
        def select(text: str) -> list[dict[str, Any]]:
            rows = self.http(text).get("results", {}).get("bindings")
            if not isinstance(rows, list):
                raise RuntimeError("Native proof did not return SPARQL SELECT bindings")
            return rows
        markers = select(request.native_marker)
        if not markers:
            # A complete-proof join returning no row is NOT marker absence.
            # Separately reject orphan attempted facts/claims/metadata as partial.
            footprint = select(request.native_footprint)
            return NativeProof("inconsistent" if footprint else "absent", {"orphan_footprint": bool(footprint)})
        if len(markers) != 1:
            return NativeProof("inconsistent", {"marker_rows": len(markers)})
        rows = select(request.native_proof)
        normalized = [{key: term["value"] for key, term in row.items()} for row in rows]
        if not normalized:
            return NativeProof("inconsistent", {"marker_present": True, "complete_proof_rows": 0})
        if len(normalized) > 10000:
            raise RuntimeError("Native operation proof exceeds10000commandrows")
        digest = proof_digest(normalized)
        complete = len(normalized) == request.expected_count and digest == request.expected_digest
        return NativeProof("committed" if complete else "inconsistent", {"row_count": len(normalized), "row_digest": digest})

    def close_epoch(self) -> dict[str, Any]:
        before = self.inspect()
        self.ownership(before)
        if before["State"]["Running"]:
            try:
                self.command("stop", "--time", "2", self.configuration.container, timeout=5)
            except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
                # Only the explicitly owned, isolated experiment worker is eligible.
                self.command("kill", self.configuration.container, timeout=5)
        after = self.inspect()
        self.ownership(after)
        if after["State"]["Running"]:
            raise RuntimeError("Owned native worker still running; epoch not closed")
        return {"worker_id": before["Id"], "epoch": before["State"]["StartedAt"], "closed": True, "exit_code": after["State"]["ExitCode"]}

    def sync_snapshot(self) -> dict[str, Any]:
        fd = os.open(self.snapshot, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            before = os.fstat(fd)
            os.fsync(fd)
            digest = hashlib.sha256()
            while chunk := os.read(fd, 1024 * 1024):
                digest.update(chunk)
            after = os.fstat(fd)
            path_stat = self.snapshot.stat()
            if (before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_ino, after.st_size, after.st_mtime_ns) or path_stat.st_ino != after.st_ino:
                raise RuntimeError("Native snapshot changed during fsync/proof")
        finally:
            os.close(fd)
        sync_directory(self.snapshot.parent)
        return {"path": str(self.snapshot), "bytes": after.st_size, "sha256": digest.hexdigest(), "file_and_directory_fsynced": True}

    def reload(self, closed: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any]:
        if self.inspect()["State"]["Running"]:
            raise RuntimeError("Reload requires an already closed worker epoch")
        self.command("start", self.configuration.container, timeout=5)
        deadline = time.monotonic() + self.configuration.recovery_timeout_seconds
        while time.monotonic() < deadline:
            try:
                self.http(None)
                proof = self.assert_fenced()
                if proof["epoch"] == closed["epoch"]:
                    raise RuntimeError("Native worker did not enter a new epoch")
                actual = self.sync_snapshot()
                if actual["sha256"] != snapshot["sha256"]:
                    raise RuntimeError("Native startup changed the declared reload snapshot")
                return {**proof, "reloaded_epoch": True, "snapshot_sha256": actual["sha256"]}
            except Exception:
                time.sleep(0.05)
        raise RuntimeError("Native worker did not become ready in the recovery deadline")

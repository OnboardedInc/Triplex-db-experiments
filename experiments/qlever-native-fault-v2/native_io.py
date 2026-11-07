"""Finite native interfaces used only after executor authorization/admission.

No connection, Docker command or engine action runs at import time. The private
Docker API puts the native token in an in-memory request body, never a CLI argv,
compose file or retained raw inspection. The pinned image still needs its token
in the container's configuration; that inherent native surface is not logged.
"""
from __future__ import annotations
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request

from bounded_io import LIMITS, canonical, read_response
from policy import IMAGE, OWNER, MAIN_CID, require, redact_bounded_log

DAEMON_ID = "83f54592-d273-4f4e-9f03-4b0b7c1dd105"


class NativeFailure(RuntimeError):
    def __init__(self, status: int, body: bytes):
        self.status = status
        self.body_sha256 = hashlib.sha256(body).hexdigest()
        self.body_bytes = len(body)
        self.redacted_body = None
        super().__init__("Native HTTP failure status=" + str(status) + ", bodySha256=" + self.body_sha256)


class UnixConnection(http.client.HTTPConnection):
    def __init__(self, path: Path):
        super().__init__("localhost", timeout=LIMITS.request_seconds)
        self.path = path

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(LIMITS.request_seconds)
        self.sock.connect(str(self.path))


class PrivateDocker:
    def __init__(self, root: Path, authorize):
        self.root, self.authorize = root, authorize
        expected = root / ".runtime/colima/triplex/docker.sock"
        require(os.environ.get("DOCKER_HOST") == "unix://" + str(expected), "A different Docker endpoint is not admitted")
        self.socket = expected.resolve(strict=True)
        require(self.socket.is_relative_to(root) and self.socket.stat().st_dev == root.stat().st_dev, "Private Docker socket target escaped the quota mount")

    def _call(self, method: str, path: str, body=None, *, maximum: int = LIMITS.response):
        raw = None if body is None else canonical(body)
        require(raw is None or len(raw) <= LIMITS.request, "Unbounded Docker request")
        connection = UnixConnection(self.socket)
        try:
            connection.request(method, "/v1.47" + path, body=raw, headers={} if raw is None else {"Content-Type": "application/json"})
            response = connection.getresponse()
            length = response.getheader("Content-Length")
            require(length is None or length.isdigit() and int(length) <= maximum, "Oversized declared Docker response")
            result = read_response(response, maximum=maximum, deadline=time.monotonic() + LIMITS.request_seconds)
            if response.status >= 400:
                raise NativeFailure(response.status, result)
            return json.loads(result) if result else None
        finally:
            connection.close()

    def identity(self) -> dict:
        value = self._call("GET", "/info")
        require(value.get("ID") == DAEMON_ID, "Private daemon identity changed")
        return {"daemonId": value["ID"], "memoryBytes": value.get("MemTotal"), "cpus": value.get("NCPU")}

    def inspect(self, cid: str) -> dict:
        require(re.fullmatch(r"[a-f0-9]{64}", cid) is not None, "An exact container id is required")
        self.identity()
        return self._call("GET", "/containers/" + cid + "/json")

    def owned(self) -> list[dict]:
        self.identity()
        filters = urllib.parse.urlencode({"all": "1", "filters": json.dumps({"label": ["triplex.owner=" + OWNER, "triplex.backend=qlever"]})})
        values = self._call("GET", "/containers/json?" + filters)
        require(isinstance(values, list) and len(values) <= 32, "Owned container inventory exceeds its bound")
        return [self.inspect(item["Id"]) for item in values]

    def create(self, config: dict, name: str) -> str:
        self.authorize("create-stopped-case")
        self.identity()
        require(config.get("Image") == IMAGE, "A different native image is not admitted")
        result = self._call("POST", "/containers/create?" + urllib.parse.urlencode({"name": name}), config)
        cid = result.get("Id")
        require(isinstance(cid, str) and re.fullmatch(r"[a-f0-9]{64}", cid) and cid != MAIN_CID, "Docker did not create a distinct exact case id")
        return cid

    def start(self, cid: str) -> None:
        self.authorize("start-main" if cid == MAIN_CID else "start-case")
        self.identity()
        self._call("POST", "/containers/" + cid + "/start")

    def kill(self, cid: str) -> None:
        self.authorize("controlled-stop-main" if cid == MAIN_CID else "controlled-stop-case")
        self.identity()
        self._call("POST", "/containers/" + cid + "/kill?signal=SIGKILL")
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            value = self.inspect(cid)
            if value["State"]["Running"] is False and value["State"]["Pid"] == 0:
                return
            time.sleep(0.05)
        raise RuntimeError("Exact native container did not stop in the declared deadline")


class NativeHTTP:
    def __init__(self, port: int, token: bytes):
        require(port in {17019, 17129}, "Unexpected native loopback port")
        require(32 <= len(token) <= 256 and token.isascii(), "Invalid private token carrier")
        self.url = "http://127.0.0.1:" + str(port)
        self.token = token

    def request(self, parameters: dict, text: str | None = None, *, update: bool = False,
                query_id: str | None = None, maximum: int = LIMITS.response):
        body = None if text is None else text.encode()
        require(body is None or len(body) <= LIMITS.request, "Native input exceeds8MiB")
        headers = {"Accept": "application/json", "Authorization": "Bearer " + self.token.decode()}
        if text is not None:
            headers["Content-Type"] = "application/sparql-update" if update else "application/sparql-query"
        if query_id is not None:
            require(re.fullmatch(r"[a-z0-9-]{1,100}", query_id) is not None, "Unsafe native query id")
            headers["Query-Id"] = query_id
        request = urllib.request.Request(self.url + "/?" + urllib.parse.urlencode(parameters), data=body, headers=headers, method="POST" if text is not None else "GET")
        deadline = time.monotonic() + LIMITS.request_seconds
        try:
            with urllib.request.urlopen(request, timeout=LIMITS.request_seconds) as response:
                declared = response.headers.get("Content-Length")
                require(declared is None or declared.isdigit() and int(declared) <= maximum, "Oversized declared native response")
                raw = read_response(response, maximum=maximum, deadline=deadline)
                return json.loads(raw)
        except urllib.error.HTTPError as error:
            raw = read_response(error, maximum=min(maximum, LIMITS.command_stderr), deadline=deadline)
            failure = NativeFailure(error.code, raw)
            failure.redacted_body = redact_bounded_log(raw, [self.token], maximum=LIMITS.command_stderr)
            raise failure from None

    def select(self, query: str) -> list[dict]:
        value = self.request({"timeout": "5000ms"}, query)
        rows = value.get("results", {}).get("bindings")
        require(isinstance(rows, list), "Native SELECT did not return bindings")
        return rows

    def settings(self) -> dict:
        result = self.request({"cmd": "get-settings"}, maximum=LIMITS.control_response)
        require(result.get("query-planning-budget") == "100", "Planner budget is not100")
        require(result.get("cache-max-size") == "64 MB" and result.get("cache-max-size-single-entry") == "32 MB", "Native cache profile changed")
        # Allowlisted values only, never arbitrary native diagnostic text.
        return {key: result[key] for key in ["query-planning-budget", "cache-max-size", "cache-max-size-single-entry"]}

    def active(self):
        value = self.request({"cmd": "dump-active-queries"}, maximum=LIMITS.control_response)
        require(isinstance(value, (dict, list)), "Malformed native activity response")
        return value

    def ready(self):
        stats = self.request({"cmd": "stats"}, maximum=LIMITS.control_response)
        require(stats.get("version-server") == "v0.6.0" and stats.get("git-hash-server") == "6c5861a", "Wrong pinned native runtime")
        return {"version": stats["version-server"], "gitHash": stats["git-hash-server"], "settings": self.settings()}


def native_config(case: dict, token: bytes) -> dict:
    return {
        "Image": IMAGE, "User": "501:20", "WorkingDir": "/data", "Entrypoint": ["qlever-server"],
        "Cmd": ["-i", "triplex", "-p", "7019", "-j", "4", "-m", "512M", "-c", "64M", "-e", "32M", "--persist-updates", "--no-patterns", "--enable-metrics", "--access-token", token.decode()],
        "Labels": {"triplex.owner": OWNER, "triplex.backend": "qlever", "triplex.role": "qlever-native-fault-v2", "triplex.packet": case["packet"], "triplex.case": case["case"]},
        "ExposedPorts": {"7019/tcp": {}},
        "HostConfig": {"Memory": 2 * 1024 ** 3, "MemorySwap": 2 * 1024 ** 3, "NanoCpus": 1500000000, "PidsLimit": 256,
            "ReadonlyRootfs": True, "Init": True, "RestartPolicy": {"Name": "no"},
            "Binds": [case["data"] + ":/data:rw"], "Tmpfs": {"/tmp": "rw,nosuid,nodev,size=67108864,uid=501,gid=20,mode=1777"},
            "LogConfig": {"Type": "none", "Config": {}},
            "PortBindings": {"7019/tcp": [{"HostIp": "127.0.0.1", "HostPort": "17129"}]},
            "CapDrop": ["ALL"], "SecurityOpt": ["no-new-privileges:true"]},
    }

#!/usr/bin/env python3
"""Read-only loopback registry over verified public tarballs in the supplied ZIP.

Source: tools/archive/offline_registry.py, portable-export SHA256
b58bae4429e5d97c3092b82a7e0e1e4daf2e71a80cca37a6ef3dcc9e7e191898.
This task implementation uses Python3.14.6 stdlib ZipFile/ThreadingHTTPServer.
The captured registry tool is the source of this routing approach. This variant
streams ZIP members rather than extracting2GB of unused platform tarballs.
Only captured versions are served; no remote proxy or installation is performed.
"""
from __future__ import annotations

import argparse
import hashlib
import http.server
import json
from pathlib import Path
import tarfile
import threading
import time
import urllib.parse
import zipfile


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=48731)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("Use an unprivileged loopback port")
    root = Path(__file__).resolve().parents[2]
    baseline = json.loads((root / "provenance/portable-export-baseline.json").read_text())
    archive = Path(baseline["sourceArchive"]["path"])
    manifest = json.loads((root / "provenance/archive/offline/npm/manifest.json").read_text())
    if manifest.get("status") != "VERIFIED":
        raise ValueError("Unverified public dependency manifest")
    rows = {row["identity"]: row for row in manifest["artifacts"]}
    routes = {}
    packages = {}
    for row in rows.values():
        if row.get("status") != "VERIFIED":
            raise ValueError("Unverified dependency")
        path = urllib.parse.unquote(urllib.parse.urlsplit(row["artifact"]["url"]).path)
        routes[path] = row
        packages.setdefault(row["package"], {})[row["version"]] = row
    verified = set()
    metadata = {}
    verification_lock = threading.Lock()
    request_lock = threading.Lock()
    # The source ZIP is immutable for this task. Reuse its parsed central
    # directory rather than reopening/parsing 78k members for every metadata
    # request. ZipExtFile readers coordinate seeks through ZipFile's own lock.
    bundle = zipfile.ZipFile(archive)
    request_log = root / ".runtime/bootstrap/zip-registry-requests.jsonl"

    def member(row):
        return "temporal-store-handoff/offline/" + row["artifact"]["path"]

    def verify(row):
        identity = row["identity"]
        with verification_lock:
            if identity in verified:
                return
            digest = hashlib.sha256()
            size = 0
            with bundle.open(member(row)) as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(chunk)
                    size += len(chunk)
            artifact = row["artifact"]
            if size != artifact["bytes"] or digest.hexdigest() != artifact["sha256"]:
                raise ValueError("Dependency artifact hash mismatch: " + identity)
            verified.add(identity)

    def package_metadata(row):
        identity = row["identity"]
        verify(row)
        if identity not in metadata:
            with bundle.open(member(row)) as source:
                with tarfile.open(fileobj=source, mode="r|gz") as tar:
                    found = None
                    for entry in tar:
                        if entry.isfile() and (entry.name == "package.json" or (entry.name.count("/") == 1 and entry.name.endswith("/package.json"))):
                            if entry.size > 8 * 1024 * 1024:
                                raise ValueError("Oversized package manifest")
                            found = json.load(tar.extractfile(entry))
                            break
                    if found is None or found.get("name") != row["package"] or found.get("version") != row["version"]:
                        raise ValueError("Dependency manifest identity mismatch")
            path = urllib.parse.unquote(urllib.parse.urlsplit(row["artifact"]["url"]).path)
            found["dist"] = {
                "tarball": f"http://127.0.0.1:{args.port}{path}",
                "integrity": row["artifact"]["sriVerified"][0],
            }
            metadata[identity] = found
        return metadata[identity]

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def log_request(self, code="-", size="-"):
            with request_lock, request_log.open("a") as output:
                output.write(json.dumps({"unix": time.time(), "path": self.path, "status": code}) + "\n")

        def do_GET(self):
            self.respond(False)

        def do_HEAD(self):
            self.respond(True)

        def respond(self, head):
            path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
            try:
                if path in routes:
                    row = routes[path]
                    verify(row)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/octet-stream")
                    self.send_header("Content-Length", str(row["artifact"]["bytes"]))
                    self.end_headers()
                    if not head:
                        with bundle.open(member(row)) as source:
                            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                                self.wfile.write(chunk)
                    return
                name, version = path.lstrip("/"), None
                if name not in packages:
                    name, _, version = name.rpartition("/")
                if name not in packages or (version and version not in packages[name]):
                    self.send_error(404, "Not captured; no network fallback")
                    return
                if version:
                    value = package_metadata(packages[name][version])
                else:
                    versions = {v: package_metadata(row) for v, row in packages[name].items()}
                    value = {"name": name, "versions": versions, "dist-tags": {"latest": next(reversed(versions))}}
                data = json.dumps(value).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                if not head:
                    self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError):
                return
            except Exception as error:
                self.send_error(500, type(error).__name__)

    with http.server.ThreadingHTTPServer(("127.0.0.1", args.port), Handler) as server:
        print(json.dumps({"format": "triplex-owned-zip-registry/1", "registry": f"http://127.0.0.1:{args.port}", "packages": len(packages), "versions": len(routes), "source": str(archive), "remoteProxy": False}), flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            bundle.close()


if __name__ == "__main__":
    main()

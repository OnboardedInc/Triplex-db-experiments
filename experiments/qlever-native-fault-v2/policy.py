"""Pure checks for the review-only modern fault packet. No Docker/HTTP/file mutation.

Inspiration: archived native_worker.py ownership checks. Adaptation: today's exact
private owner/CID/mount/caps, stopped-main replacement and bounded redaction.
These helpers do not make the operational executor implemented or authorized.
"""
from __future__ import annotations
import hashlib
import hmac
import uuid
from pathlib import Path

MAIN_CID = "e225d359e2a8211de8c5b3551e1aff8952b92b41922c4f90505ca4c6afc30b3f"
IMAGE = "sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec"
OWNER = "triplex-db-portable-13e39903"
GIB = 1024 ** 3
CASE_VOLUME_BYTES = 3 * GIB // 2
INPUT_MAXIMUM_BYTES = 224 * 1024 ** 2
TRIAL_DISK_BYTES = 2 * GIB

class FenceError(RuntimeError):
    pass

def require(condition: bool, message: str) -> None:
    if not condition:
        raise FenceError(message)

def within(root: Path, candidate: Path) -> Path:
    root = root.resolve(strict=True)
    candidate = candidate.absolute()
    require(not any(p.is_symlink() for p in [candidate, *candidate.parents]), "Symlink in owned path")
    resolved = candidate.resolve(strict=True)
    require(resolved != root and resolved.is_relative_to(root), "Path outside owned root")
    return resolved

def main_stopped(item: dict, canonical_owner: dict, root: Path) -> dict:
    """Call only with freshly obtained private-daemon metadata, never cached ACTIVE."""
    require(item["Id"] == MAIN_CID and item["Image"] == IMAGE, "Main CID/image changed")
    require(item["Config"]["Labels"].get("triplex.owner") == OWNER, "Main owner changed")
    require(item["Config"]["Labels"].get("triplex.backend") == "qlever", "Main backend changed")
    require(not item["State"]["Running"] and item["State"]["Pid"] == 0, "Main is not stopped")
    require(canonical_owner["id"] == "foundation-qlever" and canonical_owner["containerId"] == MAIN_CID,
            "Wrong canonical foundation")
    require(canonical_owner["status"] == "unknown", "Main reservation must remain canonically UNKNOWN/held")
    expected = str(root.resolve() / ".runtime/engines/qlever-main/data")
    writable = [m for m in item["Mounts"] if m.get("RW")]
    require(len(writable) == 1 and writable[0]["Source"] == expected and
            writable[0]["Destination"] == "/data", "Main data mount changed")
    host = item["HostConfig"]
    require(host.get("Memory") == 2 * GIB and host.get("MemorySwap") == 2 * GIB and
            host.get("NanoCpus") == 1500000000 and host.get("PidsLimit") == 256,
            "Main native caps changed")
    require(canonical_owner.get("imageSha256") == IMAGE and
            canonical_owner.get("resources", {}).get("memoryBytes") == 2 * GIB and
            canonical_owner.get("resources", {}).get("cpuUnits") == 1.5,
            "Main held reservation identity/caps changed")
    return {"containerId": MAIN_CID, "image": IMAGE, "running": False,
            "canonicalReservation": "unknown-retained", "mainData": expected,
            "hostProcessIdentity": "Guest PID is not used as a Mac process identity"}

def fault_fence(item: dict, *, cid: str, case_directory: Path, token: bytes,
                packet_id: str, case: str, host_port: int, must_run: bool) -> dict:
    uuid.UUID(packet_id)
    require(case in {"cancel", "permission", "ack-loss"}, "Unknown fault case")
    expected_directory = Path(__file__).resolve().parents[2] / ".runtime/qlever-native-fault-v2" / packet_id / "volume" / case
    require(case_directory.absolute() == expected_directory, "Fault path outside exact packet/case")
    require(not any(p.is_symlink() for p in [case_directory, *case_directory.parents]), "Symlink in fault path")
    require(cid != MAIN_CID and item["Id"] == cid and item["Image"] == IMAGE, "Fault CID/image changed")
    labels = item["Config"].get("Labels", {})
    for key, value in {"triplex.owner": OWNER, "triplex.backend": "qlever",
                       "triplex.role": "qlever-native-fault-v2", "triplex.packet": packet_id,
                       "triplex.case": case}.items():
        require(labels.get(key) == value, "Fault ownership label changed")
    config, host = item["Config"], item["HostConfig"]
    require(config.get("User") == "501:20" and config.get("WorkingDir") == "/data", "Wrong native user/cwd")
    require(host.get("Memory") == 2 * GIB and host.get("MemorySwap") == 2 * GIB and
            host.get("NanoCpus") == 1500000000 and host.get("PidsLimit") == 256, "Wrong native caps")
    require(host.get("ReadonlyRootfs") is True and host.get("RestartPolicy", {}).get("Name") in ["", "no"],
            "Writable root or automatic restart")
    require(host.get("PortBindings", {}).get("7019/tcp") ==
            [{"HostIp": "127.0.0.1", "HostPort": str(host_port)}], "Wrong loopback port")
    writable = [m for m in item["Mounts"] if m.get("RW") and m.get("Type") == "bind"]
    require(len(writable) == 1 and Path(writable[0]["Source"]).resolve() == case_directory.resolve()
            and writable[0]["Destination"] == "/data", "Wrong writable fault mount")
    require(all(not mount.get("RW") or mount.get("Type") == "bind" or
                mount.get("Type") == "tmpfs" and mount.get("Destination") == "/tmp"
                for mount in item["Mounts"]), "An unbounded writable nonbind mount is not admitted")
    require(config.get("Entrypoint") == ["qlever-server"], "Wrong native executable")
    require(host.get("Init") is True, "Fault server must have the declared init/signal profile")
    require(host.get("Tmpfs") == {"/tmp": "rw,nosuid,nodev,size=67108864,uid=501,gid=20,mode=1777"},
            "Wrong bounded native tmpfs")
    require(host.get("LogConfig", {}).get("Type") == "none", "Unredacted daemon log retention is disabled")
    arguments = config.get("Cmd", [])
    fixed = ["-i", "triplex", "-p", "7019", "-j", "4", "-m", "512M", "-c", "64M",
             "-e", "32M", "--persist-updates", "--no-patterns", "--enable-metrics", "--access-token"]
    require(arguments[:-1] == fixed, "Only the exact reviewed native argv is admitted")
    for option, expected in {"-i": "triplex", "-p": "7019", "-j": "4", "-m": "512M",
                             "-c": "64M", "-e": "32M"}.items():
        require(arguments.count(option) == 1, "Missing/duplicate native option")
        index = arguments.index(option)
        require(index + 1 < len(arguments) and arguments[index + 1] == expected, "Native option changed")
    require(arguments.count("--persist-updates") == 1 and "--no-patterns" in arguments,
            "Persistence/profile changed")
    require(not any(x.startswith("--no-access-check") for x in arguments), "Unfenced native updates")
    require(arguments.count("--access-token") == 1 and len(token) >= 32, "Missing native token")
    index = arguments.index("--access-token")
    require(index + 1 < len(arguments) and hmac.compare_digest(arguments[index + 1].encode(), token),
            "Native token changed")
    require(item["State"]["Running"] is must_run, "Wrong running state")
    return {"containerId": cid, "image": IMAGE, "running": must_run, "tokenFenced": True,
            "memoryBytes": 2 * GIB, "cpuUnits": 1.5, "data": str(case_directory.resolve()),
            "rawCommandAndEnvironment": "EXCLUDED_FROM_EVIDENCE"}

def reject_other_live_q(items: list[dict], permitted_cid: str | None) -> None:
    for item in items:
        labels = item["Config"].get("Labels", {})
        if labels.get("triplex.owner") == OWNER and labels.get("triplex.backend") == "qlever":
            require(not item["State"]["Running"] or item["Id"] == permitted_cid,
                    "Another owned Q is live (all owner labels checked, not historical name prefixes)")

def redact_bounded_log(raw: bytes, secrets: list[bytes], *, maximum: int = 8 * 1024 ** 2) -> bytes:
    """Redact before retention, including a secret cut at the capture boundary.

    The future reader must bound acquisition to maximum+max(secret lengths),
    never capture unbounded docker logs first. Diagnostics may over-redact a
    matching trailing byte; secret material takes priority over log completeness.
    """
    require(len(raw) <= maximum + max([len(s) for s in secrets] or [0]), "Unbounded log acquisition")
    data = raw[:maximum]
    for secret in secrets:
        if not secret:
            continue
        data = data.replace(secret, b"[REDACTED]")
        for length in range(len(secret) - 1, 0, -1):
            if data.endswith(secret[:length]):
                data = data[:-length] + b"[REDACTED_PARTIAL_TAIL]"
                break
    return data[:maximum]

def safe_error(error: BaseException) -> dict:
    message = str(error).encode(errors="replace")
    return {"class": type(error).__name__ if type(error).__name__ in
            {"ValueError", "RuntimeError", "TimeoutError", "PermissionError", "OSError", "FenceError"}
            else "OtherError", "messageSha256": hashlib.sha256(message).hexdigest(),
            "messageBytes": len(message)}

"""Read local retained reports only. No engine query, copy, pause or fault action.

This catalog distinguishes explicit ACK records from scope-only/unknown evidence.
It is not a live native snapshot, a retrospective receipt anchor or an execution
permit. A later reviewed preflight must enumerate actual scoped state as well.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import stat
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAX_REPORT_BYTES = 8 * 1024 ** 2
MAX_EVENTS_BYTES = 16 * 1024 ** 2
MAX_EVENT_LINE_BYTES = 1024 ** 2

def bounded_bytes(path: Path, maximum: int) -> bytes:
    """Read at most maximum+1 bytes, refuse links/nonregular or growing input.

    This local evidence reader is separate from the later live preflight, whose
    HTTP result/stream bounds must also be checked before any native operation.
    """
    before = path.lstat()
    if not stat.S_ISREG(before.st_mode) or before.st_size > maximum:
        raise ValueError("Nonregular or oversized local evidence input")
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(descriptor, "rb") as stream:
        raw = stream.read(maximum + 1)
        after = os.fstat(stream.fileno())
    if len(raw) > maximum or len(raw) != before.st_size or (before.st_dev, before.st_ino, before.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_mtime_ns):
        raise ValueError("Local evidence changed during bounded read")
    return raw

def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def inventory(root: Path = ROOT) -> dict:
    state = json.loads(bounded_bytes(root / ".devloop/state.json", 2 * 1024 ** 2))
    scopes: dict[str, dict] = {}
    inspected = 0
    skipped = []
    def scope_record(scope: str) -> dict:
        return scopes.setdefault(scope, {"scope": scope, "explicitAckReferences": [], "scopeOnlyReferences": []})
    for job_id, job in state["jobs"].items():
        if job["manifest"]["backend"] != "qlever":
            continue
        for attempt in job["attempts"]:
            relative = Path(attempt["directory"])
            if relative.is_absolute() or ".." in relative.parts:
                raise ValueError("Escaped local attempt path")
            directory = root / relative
            if not directory.absolute().is_relative_to(root.absolute()) or any(path.is_symlink() for path in [directory, *directory.parents]):
                raise ValueError("Local attempt path is not an owned regular directory")
            report_file = directory / "artifacts/report.json"
            if not report_file.is_file():
                continue
            if report_file.lstat().st_size > MAX_REPORT_BYTES:
                skipped.append({"run": f"{job_id}/{attempt['id']}", "reason": "Report exceeds bounded local-reader budget"})
                continue
            raw = bounded_bytes(report_file, MAX_REPORT_BYTES)
            report = json.loads(raw)
            terminal_file = directory / "terminal.json"
            terminal_raw = bounded_bytes(terminal_file, 2 * 1024 ** 2) if terminal_file.is_file() else b"{}"
            terminal = json.loads(terminal_raw)
            anchored = bool(attempt.get("terminalSha256"))
            output = None
            if anchored:
                if digest(terminal_raw) != attempt["terminalSha256"]:
                    raise ValueError("Anchored terminal bytes changed")
                output = next((entry for entry in terminal["outputs"] if entry["path"] == "artifacts/report.json"), None)
                if output and output["sha256"] != digest(raw):
                    raise ValueError("Retained report bytes changed for " + job_id + "/" + attempt["id"])
            authority = ("ANCHORED_RAW_RECEIPT_RECORDS" if output else "LEGACY_TERMINAL_OMITS_REPORT_INDEX_PARTIAL_AUTHORITY") if anchored else "UNANCHORED_RAW_RECORDS_NOT_QUALIFICATION"
            reference = {"run": f"{job_id}/{attempt['id']}", "reportSha256": digest(raw), "terminalStatus": terminal.get("status"), "authority": authority}
            inspected += 1
            if isinstance(report.get("scope"), str):
                scope_record(report["scope"])["scopeOnlyReferences"].append(reference)
            for workload in report.get("workloads", []):
                scope = workload.get("scope")
                if not isinstance(scope, str):
                    continue
                target = scope_record(scope)
                for group in workload.get("groups", []):
                    if isinstance(group.get("actualPosition"), int) and group.get("commandId") and isinstance(group.get("acknowledgedMs"), (int, float)):
                        target["explicitAckReferences"].append({**reference, "commandId": group["commandId"], "position": group["actualPosition"], "recordedAt": group.get("actualRecordedAt"), "recordedAtAuthority": "Only a retained explicit field; never infer from monotonic ACK latency"})
            receipts = report.get("receipts")
            by_instance = {}
            if isinstance(receipts, list):
                for receipt in receipts:
                    if isinstance(receipt.get("scope"), str):
                        by_instance[receipt["index"]] = receipt["scope"]
                        scope_record(receipt["scope"])["explicitAckReferences"].append({**reference, "position": receipt["baselinePosition"], "recordedAt": receipt["recordedAt"], "meaning": "Seed bundle final acknowledged frontier; individual command IDs are in generator/observations"})
            events_file = directory / "artifacts/events.jsonl"
            if events_file.is_file():
                events_raw = bounded_bytes(events_file, MAX_EVENTS_BYTES)
                event_hash = digest(events_raw)
                event_output = next((entry for entry in terminal.get("outputs", []) if entry["path"] == "artifacts/events.jsonl"), None)
                if anchored and event_output and event_output["sha256"] != event_hash:
                    raise ValueError("Retained event bytes changed for " + job_id + "/" + attempt["id"])
                event_authority = ("ANCHORED_RAW_EVENT_RECORDS" if event_output else "LEGACY_TERMINAL_OMITS_EVENTS_INDEX_PARTIAL_AUTHORITY") if anchored else "UNANCHORED_RAW_EVENTS_NOT_QUALIFICATION"
                for line in events_raw.splitlines():
                    if len(line) > MAX_EVENT_LINE_BYTES:
                        raise ValueError("Local event line exceeds bounded parser budget")
                    if not line.strip():
                        continue
                    event = json.loads(line)
                    if event.get("type") != "write" or event.get("reconciled") is not True:
                        continue
                    basis = event.get("visibleBasis", {})
                    scope = basis.get("scope")
                    if isinstance(scope, str):
                        scope_record(scope)["explicitAckReferences"].append({**reference, "authority": event_authority, "eventsSha256": event_hash, "eventsSha256Authority": "Exact event file bytes separately verified against the scheduler-anchored terminal index when present; otherwise explicitly partial/unanchored", "commandId": event["commandId"], "position": int(event["knownPosition"]), "recordedAt": None, "meaning": "ACK plus public visibility observed; R was not retained and must not be manufactured"})
    result = {"format": "triplex-qlever-local-ack-evidence-inventory/2", "status": "LOCAL_REPORT_AUTHORITY_INDEX_ONLY_NOT_LIVE_STATE_OR_EXECUTION_PERMIT", "reportsInspected": inspected, "scopes": sorted(scopes.values(), key=lambda item: item["scope"]), "skipped": skipped, "gaps": ["Scope-only foundation/entry reports do not become individual ACK ledgers.", "Historical/manual scopes outside canonical report files may exist; later live scope enumeration is mandatory.", "Unanchored controller-publication-failed records can locate possible writes but never become qualified results.", "Event ACK records have a separate file hash/authority check; report authority alone does not anchor event bytes.", "R is null where not explicitly retained; the later main preflight must read current receipts/state before stop.", "Intentionally damaged admission-test scopes remain unchanged input state; this index grants no repair or deletion.", "Full unchanged stopped-source bytes plus a fresh bounded live continuity baseline are separate required proof."]}
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.absolute()
    if ".." in output.parts or not output.parent.resolve(strict=True).is_relative_to(ROOT / "qualification/evidence") or any(path.is_symlink() for path in [output, *output.parents]):
        raise ValueError("Write only a new local evidence index")
    result = inventory()
    encoded = (json.dumps(result, indent=2) + "\n").encode()
    if len(encoded) > 20 * 1024 ** 2:
        raise ValueError("Local evidence index exceeds20MiB budget")
    with output.open("xb") as stream:
        stream.write(encoded)
    print(json.dumps({"output": str(output.relative_to(ROOT)), "reports": result["reportsInspected"], "scopes": len(result["scopes"]), "bytes": len(encoded), "nativeActions": 0}))

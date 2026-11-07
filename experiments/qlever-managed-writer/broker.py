"""Private managed-writer lifecycle model. No worker is started on import.

The journal stores write intent/outcomes, never serves application fact reads.
Every native modifying route must be fenced behind this one global broker.
"""
from __future__ import annotations

import contextlib
import dataclasses
import fcntl
import hashlib
import json
import os
import re
import time
from pathlib import Path
from typing import Any, Callable, Iterator, Protocol


def canonical(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def proof_digest(rows: list[dict[str, str]]) -> str:
    """Order-independent digest retaining duplicate row contributions."""
    digest = hashlib.sha256()
    for row in sorted(canonical(row) for row in rows):
        digest.update(len(row).to_bytes(8, "big"))
        digest.update(row)
    return digest.hexdigest()


def sync_directory(path: Path) -> None:
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


@dataclasses.dataclass(frozen=True)
class PreparedModify:
    operation_id: str
    attempt_id: str
    logical_digest: str
    native_modify: str
    native_marker: str
    native_footprint: str
    native_proof: str
    expected_proof: list[dict[str, str]]

    def validate(self) -> None:
        for name in (self.operation_id, self.attempt_id):
            if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9:._-]{0,255}", name):
                raise ValueError("Invalid operation/attempt identity")
        if not re.fullmatch(r"[0-9a-f]{64}", self.logical_digest):
            raise ValueError("A SHA256 logical payload digest is required")
        if not self.native_modify or not self.native_marker or not self.native_footprint or not self.native_proof or not self.expected_proof:
            raise ValueError("A trusted single MODIFY and complete nonempty proof are required")
        if len(self.native_modify.encode()) > 32 * 1024 * 1024:
            raise ValueError("Prepared native MODIFY exceeds provisional32MiB input limit")
        if len(canonical(self.expected_proof)) > 1024 * 1024 or len(self.expected_proof) > 10000:
            raise ValueError("Expected command-row proof exceeds provisional1MiB/10000row limit")
        self.to_intent().validate()

    @property
    def digest(self) -> str:
        return hashlib.sha256(canonical(dataclasses.asdict(self))).hexdigest()

    @property
    def expected_count(self) -> int:
        return len(self.expected_proof)

    @property
    def expected_digest(self) -> str:
        return proof_digest(self.expected_proof)

    def to_intent(self) -> RecoveryIntent:
        return RecoveryIntent(self.operation_id, self.attempt_id, self.logical_digest, self.native_marker, self.native_footprint, self.native_proof, self.expected_count, self.expected_digest, self.digest)


@dataclasses.dataclass(frozen=True)
class RecoveryIntent:
    """Bounded coordinator metadata: no MODIFY body and no expected fact rows."""
    operation_id: str
    attempt_id: str
    logical_digest: str
    native_marker: str
    native_footprint: str
    native_proof: str
    expected_count: int
    expected_digest: str
    request_digest: str

    @property
    def digest(self) -> str:
        return self.request_digest

    def validate(self) -> None:
        if any(not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9:._-]{0,255}", value) for value in (self.operation_id, self.attempt_id)):
            raise ValueError("Invalid recovery intent identity")
        if any(not re.fullmatch(r"[0-9a-f]{64}", value) for value in (self.logical_digest, self.expected_digest, self.request_digest)):
            raise ValueError("Invalid recovery intent digest")
        selectors = (self.native_marker, self.native_footprint, self.native_proof)
        if not all(selectors) or sum(len(value.encode()) for value in selectors) > 8192:
            raise ValueError("Operation-scoped recovery selectors exceed8192bytes")
        if not 1 <= self.expected_count <= 10000:
            raise ValueError("Invalid expected command-row count")


@dataclasses.dataclass(frozen=True)
class NativeProof:
    status: str  # committed, absent, inconsistent
    detail: dict[str, Any]


@dataclasses.dataclass(frozen=True)
class Outcome:
    status: str  # committed, not_committed_closed
    operation_id: str
    attempt_id: str
    evidence: dict[str, Any]


class OutcomeUnknown(RuntimeError):
    def __init__(self, operation_id: str, attempt_id: str | None, reason: str):
        self.operation_id, self.attempt_id, self.reason = operation_id, attempt_id, reason
        super().__init__(f"Outcome unknown for {operation_id}/{attempt_id}: {reason}")


class IdentityConflict(RuntimeError):
    pass


class BrokerClosed(RuntimeError):
    pass


class NativeWorker(Protocol):
    def coordination_path(self) -> Path: ...
    def assert_fenced(self) -> dict[str, Any]: ...
    def apply(self, request: PreparedModify) -> None: ...
    def check(self, request: PreparedModify | RecoveryIntent) -> NativeProof: ...
    def close_epoch(self) -> dict[str, Any]: ...
    def sync_snapshot(self) -> dict[str, Any]: ...
    def reload(self, closed: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any]: ...


@dataclasses.dataclass
class Attempt:
    request: RecoveryIntent
    outcome: Outcome | None = None


class ManagedWriter:
    def __init__(self, directory: Path, worker: NativeWorker, *, fault: Callable[[str, PreparedModify], None] | None = None, max_journal_bytes: int = 16 * 1024 * 1024):
        self.directory, self.worker, self.fault = Path(directory), worker, fault or (lambda *_: None)
        self.max_journal_bytes = max_journal_bytes
        self.journal = self.directory / "intents.jsonl"
        self.lockfile = self.directory / "writer.lock"
        if self.lockfile.resolve() != worker.coordination_path().resolve():
            raise BrokerClosed("Worker coordination path cannot be changed by a broker process")
        self.directory.mkdir(parents=True, exist_ok=True)
        sync_directory(self.directory.parent)

    @contextlib.contextmanager
    def locked(self) -> Iterator[None]:
        fd = os.open(self.lockfile, os.O_RDWR | os.O_CREAT, 0o600)
        try:
            # The file is persistent: unlinking it would create competing lock inodes.
            fcntl.flock(fd, fcntl.LOCK_EX)
            os.fsync(fd)
            sync_directory(self.directory)
            yield
        finally:
            fcntl.flock(fd, fcntl.LOCK_UN)
            os.close(fd)

    def load(self) -> tuple[list[dict[str, Any]], dict[tuple[str, str], Attempt]]:
        if not self.journal.exists():
            return [], {}
        raw = self.journal.read_bytes()
        if len(raw) > self.max_journal_bytes or (raw and not raw.endswith(b"\n")):
            raise BrokerClosed("Oversized or torn intent journal; no mutation admitted")
        records: list[dict[str, Any]] = []
        attempts: dict[tuple[str, str], Attempt] = {}
        previous = "0" * 64
        for line in raw.splitlines():
            try:
                record = json.loads(line)
                digest = record.pop("hash")
                if record["format"] != 2 or record["sequence"] != len(records) + 1 or record["previous"] != previous or hashlib.sha256(canonical(record)).hexdigest() != digest:
                    raise ValueError("Journal hash/sequence mismatch")
                record["hash"] = digest
                previous = digest
                event = record["event"]
                key = (event["operation_id"], event["attempt_id"])
                if event["kind"] == "intent":
                    request = RecoveryIntent(**event["intent"])
                    request.validate()
                    if key in attempts or (request.operation_id, request.attempt_id) != key:
                        raise ValueError("Duplicate or corrupt intent")
                    attempts[key] = Attempt(request)
                elif event["kind"] == "resolution":
                    attempt = attempts[key]
                    if attempt.outcome is not None or event["status"] not in ("committed", "not_committed_closed"):
                        raise ValueError("Contradictory operation resolution")
                    if event["status"] == "not_committed_closed" and not event["evidence"].get("reloaded_epoch"):
                        raise ValueError("Absent marker without a closed/reloaded epoch")
                    attempt.outcome = Outcome(event["status"], *key, event["evidence"])
                elif event["kind"] not in ("quarantine", "epoch_reloaded") or key not in attempts:
                    raise ValueError("Invalid operation lifecycle event")
                records.append(record)
            except Exception as error:
                raise BrokerClosed("Invalid intent journal; preserve it for inspection") from error
        if sum(attempt.outcome is None for attempt in attempts.values()) > 1:
            raise BrokerClosed("More than one native operation was in flight")
        return records, attempts

    def append(self, records: list[dict[str, Any]], event: dict[str, Any]) -> None:
        record = {"format": 2, "sequence": len(records) + 1, "previous": records[-1]["hash"] if records else "0" * 64, "at_ns": time.time_ns(), "event": event}
        record["hash"] = hashlib.sha256(canonical(record)).hexdigest()
        raw = canonical(record) + b"\n"
        if (self.journal.stat().st_size if self.journal.exists() else 0) + len(raw) > self.max_journal_bytes:
            raise BrokerClosed("Intent journal budget exhausted; no automatic truncation")
        fd = os.open(self.journal, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600)
        try:
            remaining = memoryview(raw)
            while remaining:
                written = os.write(fd, remaining)
                if not written:
                    raise OSError("Incomplete journal write")
                remaining = remaining[written:]
            os.fsync(fd)
        finally:
            os.close(fd)
        sync_directory(self.directory)
        records.append(record)

    def event(self, prepared: PreparedModify | RecoveryIntent, kind: str, **values: Any) -> dict[str, Any]:
        return {"kind": kind, "operation_id": prepared.operation_id, "attempt_id": prepared.attempt_id, **values}

    def assert_fenced(self) -> dict[str, Any]:
        proof = self.worker.assert_fenced()
        if proof.get("global_lock_path") != str(self.lockfile.resolve()):
            raise BrokerClosed("All broker processes must share the worker's canonical global lock path")
        return proof

    def recover(self, records: list[dict[str, Any]], attempt: Attempt) -> Outcome:
        request = attempt.request
        try:
            # Never resolve from the potentially poisoned mutable worker. The
            # next modify is forbidden until the old epoch is physically closed.
            closed = self.worker.close_epoch()
            if not closed.get("closed"):
                raise RuntimeError("Worker epoch was not closed")
            snapshot = self.worker.sync_snapshot()
            if snapshot.get("file_and_directory_fsynced") is not True:
                raise RuntimeError("Native snapshot file/directory sync was not proved")
            reloaded = self.worker.reload(closed, snapshot)
            if not reloaded.get("reloaded_epoch") or reloaded.get("epoch") == closed.get("epoch") or reloaded.get("worker_id") != closed.get("worker_id"):
                raise RuntimeError("No distinct reloaded native epoch proof")
            self.assert_fenced()
            self.append(records, self.event(request, "epoch_reloaded", closed_epoch=closed, snapshot=snapshot, reloaded_epoch=reloaded))
            proof = self.worker.check(request)
            if proof.status not in ("committed", "absent"):
                raise RuntimeError("Reloaded operation marker/payload is inconsistent")
            evidence = {"closed_epoch": closed, "snapshot": snapshot, "reloaded_epoch": reloaded, "native_proof": dataclasses.asdict(proof)}
            outcome = Outcome("committed" if proof.status == "committed" else "not_committed_closed", request.operation_id, request.attempt_id, evidence)
            self.append(records, self.event(request, "resolution", status=outcome.status, evidence=evidence))
            attempt.outcome = outcome
            return outcome
        except Exception as error:
            raise OutcomeUnknown(request.operation_id, request.attempt_id, "quarantine recovery failed; all further native modifications remain blocked") from error

    def _load_or_close(self) -> tuple[list[dict[str, Any]], dict[tuple[str, str], Attempt]]:
        try:
            return self.load()
        except Exception:
            # A corrupt journal cannot prove whether a previous process submitted.
            # Stop the owned worker, retain the journal, and require inspection.
            self.worker.close_epoch()
            raise

    def commit(self, request: PreparedModify) -> Outcome:
        request.validate()
        with self.locked():
            records, attempts = self._load_or_close()
            key = (request.operation_id, request.attempt_id)
            previous = [attempt for attempt in attempts.values() if attempt.request.operation_id == request.operation_id]
            if any(attempt.request.logical_digest != request.logical_digest for attempt in previous):
                raise IdentityConflict("Operation logical payload changed")
            if key in attempts and attempts[key].request.digest != request.digest:
                raise IdentityConflict("Attempt bytes changed")
            for attempt in attempts.values():
                if attempt.outcome is None:
                    self.recover(records, attempt)
            if key in attempts:
                assert attempts[key].outcome is not None
                return attempts[key].outcome
            for attempt in previous:
                if attempt.outcome and attempt.outcome.status == "committed":
                    return attempt.outcome
            self.assert_fenced()
            intent = request.to_intent()
            self.append(records, self.event(request, "intent", intent=dataclasses.asdict(intent)))
            attempt = Attempt(intent)
            self.fault("after_intent", request)
            try:
                self.worker.apply(request)
                self.fault("after_apply", request)
                proof = self.worker.check(request)
                if proof.status != "committed":
                    raise RuntimeError("Native success did not prove a complete commit")
                snapshot = self.worker.sync_snapshot()
                if snapshot.get("file_and_directory_fsynced") is not True:
                    raise RuntimeError("Native snapshot file/directory sync was not proved")
                self.fault("after_fsync", request)
                evidence = {"snapshot": snapshot, "native_proof": dataclasses.asdict(proof)}
                outcome = Outcome("committed", request.operation_id, request.attempt_id, evidence)
                self.append(records, self.event(request, "resolution", status=outcome.status, evidence=evidence))
            except Exception as error:
                try:
                    self.append(records, self.event(request, "quarantine", reason=type(error).__name__))
                except Exception:
                    self.worker.close_epoch()
                    raise OutcomeUnknown(request.operation_id, request.attempt_id, "intent journal failed after submit; native epoch closed if possible") from error
                outcome = self.recover(records, attempt)
            self.fault("before_ack", request)
            return outcome

    def resolve(self, operation_id: str) -> Outcome:
        with self.locked():
            records, attempts = self._load_or_close()
            matching: list[Attempt] = []
            for attempt in attempts.values():
                if attempt.outcome is None:
                    self.recover(records, attempt)
                if attempt.request.operation_id == operation_id:
                    matching.append(attempt)
            if not matching:
                # No broker intent is not a closed native epoch proof.
                raise OutcomeUnknown(operation_id, None, "no durable intent; native marker absence cannot authorize replay")
            committed = next((attempt.outcome for attempt in matching if attempt.outcome and attempt.outcome.status == "committed"), None)
            outcome = committed or matching[-1].outcome
            assert outcome is not None
            return outcome

"""Offline fault model; retains every generated fixture under .qlever/managed-model.

This models mutable/published/durable worker states. It never contacts Docker,
QLever, the application backend or any real native snapshot.
"""
from __future__ import annotations

import dataclasses
import hashlib
import json
import multiprocessing
import os
import tempfile
import time
import unittest
from pathlib import Path

from broker import BrokerClosed, IdentityConflict, ManagedWriter, NativeProof, OutcomeUnknown, PreparedModify, RecoveryIntent, canonical, proof_digest, sync_directory


class ProcessDeath(BaseException):
    pass


def replace_json(path: Path, value: object) -> None:
    temporary = path.with_suffix(path.suffix + ".pending")
    temporary.write_bytes(canonical(value))
    os.replace(temporary, path)


def request(name: str, attempt: str = "attempt1", facts: tuple[str, ...] = ("a", "b", "c", "d")) -> PreparedModify:
    payload = {"operation": name, "facts": list(facts)}
    # The worker MODEL consumes JSON. NativeWorker receives real trusted SPARQL.
    expected = [{"marker": name}] + [{"assertion": str(index), "value": value} for index, value in enumerate(facts)]
    return PreparedModify(name, attempt, hashlib.sha256(canonical(payload)).hexdigest(), canonical(payload).decode(), "MODEL marker only", "MODEL any attempted footprint", "MODEL complete marker/payload proof", expected)


class ModelWorker:
    def __init__(self, directory: Path, *, fault: str | None = None, death: bool = False, delay: float = 0):
        self.directory, self.fault, self.death, self.delay = directory, fault, death, delay
        self.snapshot, self.state, self.events = directory / "native.snapshot", directory / "worker-state.json", directory / "worker-events.jsonl"
        self.fenced, self.stop_fails, self.sync_fails, self.reload_fails = True, False, False, False
        self.lock_path = self.directory.parent / "broker" / "writer.lock"
        directory.mkdir(parents=True, exist_ok=True)
        if not self.snapshot.exists():
            replace_json(self.snapshot, {})
            replace_json(self.state, {"epoch": 1, "running": True, "mutable": {}, "published": {}})

    def record(self, kind: str, **values: object) -> None:
        fd = os.open(self.events, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
        try:
            os.write(fd, canonical({"kind": kind, "pid": os.getpid(), "at_ns": time.time_ns(), **values}) + b"\n")
            os.fsync(fd)
        finally:
            os.close(fd)

    def coordination_path(self) -> Path:
        return self.lock_path

    def read_state(self) -> dict:
        return json.loads(self.state.read_bytes())

    def trigger(self, stage: str) -> None:
        if self.fault != stage:
            return
        self.fault = None
        if self.death:
            os._exit(73)
        raise RuntimeError("Injected model failure: " + stage)

    def assert_fenced(self) -> dict:
        if not self.fenced:
            raise BrokerClosed("Raw update route is not token fenced")
        state = self.read_state()
        if not state["running"]:
            raise BrokerClosed("Owned worker is not running")
        return {"worker_id": "model", "epoch": state["epoch"], "token_fenced": True, "global_lock_path": str(self.lock_path.resolve())}

    def apply(self, prepared: PreparedModify) -> None:
        self.assert_fenced()
        self.record("apply_enter", operation=prepared.operation_id)
        self.trigger("before_apply")
        if self.delay:
            time.sleep(self.delay)
        payload, state = json.loads(prepared.native_modify), self.read_state()
        # Deliberately place the marker before facts in mutable state. Resolving
        # this mutable worker after failure would therefore be unsound.
        state["mutable"][payload["operation"]] = {"facts": payload["facts"][:2]}
        replace_json(self.state, state)
        self.trigger("during_apply")
        state["mutable"][payload["operation"]] = {"facts": payload["facts"]}
        replace_json(self.state, state)
        self.trigger("writeback")
        if self.fault == "partial_persist":
            state["mutable"][payload["operation"]] = {"facts": payload["facts"][:1]}
        if self.fault == "corrupt_value":
            state["mutable"][payload["operation"]] = {"facts": ["WRONG-VALUE", *payload["facts"][1:]]}
        replace_json(self.snapshot, state["mutable"])
        self.trigger("partial_persist")
        self.trigger("corrupt_value")
        self.trigger("after_rename")
        state["published"] = json.loads(self.snapshot.read_bytes())
        replace_json(self.state, state)
        self.record("apply_exit", operation=prepared.operation_id)

    def check(self, prepared: PreparedModify | RecoveryIntent) -> NativeProof:
        state = self.read_state()
        if not state["running"]:
            raise RuntimeError("Cannot query a closed epoch")
        self.record("proof", operation=prepared.operation_id, epoch=state["epoch"])
        item = state["published"].get(prepared.operation_id)
        if item is None:
            return NativeProof("absent", {"epoch": state["epoch"]})
        actual = [{"marker": prepared.operation_id}] + [{"assertion": str(index), "value": value} for index, value in enumerate(item["facts"])]
        digest = proof_digest(actual)
        return NativeProof("committed" if len(actual) == prepared.expected_count and digest == prepared.expected_digest else "inconsistent", {"epoch": state["epoch"], "row_count": len(actual), "row_digest": digest})

    def close_epoch(self) -> dict:
        if self.stop_fails:
            raise RuntimeError("Injected failed worker stop")
        state = self.read_state()
        self.record("close", epoch=state["epoch"])
        state["running"] = False
        replace_json(self.state, state)
        return {"worker_id": "model", "epoch": state["epoch"], "closed": True}

    def sync_snapshot(self) -> dict:
        if self.sync_fails:
            raise OSError("Injected snapshot fsync failure")
        fd = os.open(self.snapshot, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
        sync_directory(self.directory)
        self.record("snapshot_fsynced")
        raw = self.snapshot.read_bytes()
        return {"path": str(self.snapshot), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(), "file_and_directory_fsynced": True}

    def reload(self, closed: dict, snapshot: dict) -> dict:
        if self.reload_fails:
            raise RuntimeError("Injected worker restart failure")
        state = self.read_state()
        if state["running"] or state["epoch"] != closed["epoch"]:
            raise RuntimeError("No matching closed epoch")
        restored = json.loads(self.snapshot.read_bytes())
        state.update(epoch=state["epoch"] + 1, running=True, mutable=restored, published=restored)
        replace_json(self.state, state)
        self.record("reload", epoch=state["epoch"])
        return {"worker_id": "model", "epoch": state["epoch"], "reloaded_epoch": True, "snapshot_sha256": snapshot["sha256"]}


def dying_broker(directory: str, point: str) -> None:
    path = Path(directory)
    worker = ModelWorker(path / "worker", fault=point if point in ("during_apply", "after_rename") else None, death=True)
    def die(stage: str, _: PreparedModify) -> None:
        if stage == point:
            os._exit(73)
    ManagedWriter(path / "broker", worker, fault=die).commit(request("crashed"))
    os._exit(74)


def parallel_broker(directory: str, name: str, ready: multiprocessing.synchronize.Event) -> None:
    path = Path(directory)
    worker = ModelWorker(path / "worker", delay=0.08)
    ready.wait(5)
    result = ManagedWriter(path / "broker", worker).commit(request(name))
    if result.status != "committed":
        raise RuntimeError("Parallel model operation did not commit")


class ManagedWriterModelTests(unittest.TestCase):
    def setUp(self) -> None:
        root = Path(__file__).resolve().parents[2] / ".qlever" / "managed-model"
        root.mkdir(parents=True, exist_ok=True)
        self.directory = Path(tempfile.mkdtemp(prefix=self._testMethodName + "-", dir=root))
        self.worker = ModelWorker(self.directory / "worker")
        self.broker = ManagedWriter(self.directory / "broker", self.worker)

    def test_ack_follows_snapshot_and_journal_fsync(self) -> None:
        outcome = self.broker.commit(request("first"))
        self.assertEqual(outcome.status, "committed")
        records, _ = self.broker.load()
        self.assertEqual([record["event"]["kind"] for record in records], ["intent", "resolution"])
        self.assertEqual(records[-1]["event"]["evidence"]["snapshot"]["sha256"], hashlib.sha256(self.worker.snapshot.read_bytes()).hexdigest())
        self.assertEqual(self.broker.resolve("first"), outcome)

    def test_failures_before_persist_require_closed_reload_before_next_modify(self) -> None:
        for point in ("before_apply", "during_apply", "writeback"):
            with self.subTest(point=point):
                self.worker.fault = point
                outcome = self.broker.commit(request(point))
                self.assertEqual(outcome.status, "not_committed_closed")
                self.assertTrue(outcome.evidence["closed_epoch"]["closed"])
                self.assertTrue(outcome.evidence["reloaded_epoch"]["reloaded_epoch"])
                self.assertNotIn(point, self.worker.read_state()["published"])
                self.assertEqual(self.broker.commit(request("next-" + point)).status, "committed")

    def test_lost_ack_after_native_rename_resolves_full_commit(self) -> None:
        self.worker.fault = "after_rename"
        outcome = self.broker.commit(request("renamed"))
        self.assertEqual(outcome.status, "committed")
        self.assertTrue(outcome.evidence["reloaded_epoch"]["reloaded_epoch"])
        self.assertEqual(self.worker.read_state()["published"]["renamed"]["facts"], ["a", "b", "c", "d"])

    def test_prior_acknowledged_state_survives_each_following_write_fault(self) -> None:
        prior = request("prior", facts=("exact-int64:9223372036854775807", "binary64:1.0000000000000002", "receipt:complete"))
        self.assertEqual(self.broker.commit(prior).status, "committed")
        for point in ("before_apply", "during_apply", "writeback", "after_rename"):
            self.worker.fault = point
            self.broker.commit(request("following-" + point))
            self.assertEqual(self.worker.check(prior).status, "committed")
            self.assertEqual(self.broker.resolve("prior").status, "committed")

    def test_inconsistent_marker_holds_every_following_modify_closed(self) -> None:
        self.worker.fault = "partial_persist"
        with self.assertRaises(OutcomeUnknown):
            self.broker.commit(request("partial"))
        with self.assertRaises(OutcomeUnknown):
            self.broker.commit(request("following"))
        events = [json.loads(line) for line in self.worker.events.read_text().splitlines()]
        self.assertNotIn("following", [event.get("operation") for event in events if event["kind"] == "apply_enter"])

    def test_same_row_count_with_wrong_value_is_not_a_complete_commit(self) -> None:
        self.worker.fault = "corrupt_value"
        with self.assertRaises(OutcomeUnknown):
            self.broker.commit(request("same-count-wrong-value"))
        self.assertEqual(len(self.worker.read_state()["published"]["same-count-wrong-value"]["facts"]), 4)
        with self.assertRaises(OutcomeUnknown):
            self.broker.commit(request("must-remain-blocked"))

    def test_cannot_resolve_unknown_operation_from_absence(self) -> None:
        with self.assertRaises(OutcomeUnknown):
            self.broker.resolve("unregistered")
        self.assertFalse(self.worker.events.exists())

    def test_failed_stop_fsync_or_reload_never_admits_next_modify(self) -> None:
        for failure in ("stop_fails", "sync_fails", "reload_fails"):
            with self.subTest(failure=failure):
                worker = ModelWorker(self.directory / failure)
                worker.lock_path = self.directory / (failure + "-broker") / "writer.lock"
                broker = ManagedWriter(self.directory / (failure + "-broker"), worker)
                worker.fault = "writeback"
                setattr(worker, failure, True)
                with self.assertRaises(OutcomeUnknown):
                    broker.commit(request("blocked"))
                with self.assertRaises(OutcomeUnknown):
                    broker.commit(request("never-submitted"))
                events = [json.loads(line) for line in worker.events.read_text().splitlines()]
                self.assertNotIn("never-submitted", [event.get("operation") for event in events if event["kind"] == "apply_enter"])

    def test_two_processes_hold_one_kernel_lock_across_apply_and_ack(self) -> None:
        context = multiprocessing.get_context("spawn")
        ready = context.Event()
        processes = [context.Process(target=parallel_broker, args=(str(self.directory), name, ready)) for name in ("one", "two")]
        for process in processes:
            process.start()
        ready.set()
        for process in processes:
            process.join(10)
            self.assertEqual(process.exitcode, 0)
        events = [json.loads(line) for line in self.worker.events.read_text().splitlines()]
        apply = [event["kind"] for event in events if event["kind"] in ("apply_enter", "apply_exit")]
        self.assertEqual(apply, ["apply_enter", "apply_exit", "apply_enter", "apply_exit"])
        self.assertEqual(set(self.worker.read_state()["published"]), {"one", "two"})

    def test_actual_broker_process_death_is_reconciled_before_next_modify(self) -> None:
        context = multiprocessing.get_context("spawn")
        for point, expected in (("after_intent", "not_committed_closed"), ("during_apply", "not_committed_closed"), ("after_rename", "committed"), ("after_apply", "committed"), ("after_fsync", "committed"), ("before_ack", "committed")):
            with self.subTest(point=point):
                directory = self.directory / point
                ModelWorker(directory / "worker")
                process = context.Process(target=dying_broker, args=(str(directory), point))
                process.start()
                process.join(10)
                self.assertEqual(process.exitcode, 73)
                worker = ModelWorker(directory / "worker")
                broker = ManagedWriter(directory / "broker", worker)
                self.assertEqual(broker.resolve("crashed").status, expected)
                self.assertEqual(broker.commit(request("following")).status, "committed")

    def test_identity_and_token_fence_are_checked(self) -> None:
        prepared = request("identity")
        self.broker.commit(prepared)
        with self.assertRaises(IdentityConflict):
            self.broker.commit(dataclasses.replace(prepared, native_modify=prepared.native_modify + " "))
        with self.assertRaises(IdentityConflict):
            self.broker.commit(request("identity", "attempt2", ("different",)))
        self.worker.fenced = False
        with self.assertRaises(BrokerClosed):
            self.broker.commit(request("bypass"))

    def test_explicit_retry_requires_same_logical_payload_and_closed_resolution(self) -> None:
        self.worker.fault = "during_apply"
        first = self.broker.commit(request("retry"))
        self.assertEqual(first.status, "not_committed_closed")
        self.assertEqual(self.broker.commit(request("retry")).status, "not_committed_closed")
        self.assertEqual(self.broker.commit(request("retry", "attempt2")).status, "committed")
        self.assertEqual(self.broker.resolve("retry").status, "committed")

    def test_torn_journal_is_preserved_and_worker_is_closed(self) -> None:
        self.broker.commit(request("safe"))
        with self.broker.journal.open("ab") as journal:
            journal.write(b'{"torn":')
            journal.flush()
            os.fsync(journal.fileno())
        before = self.broker.journal.read_bytes()
        with self.assertRaises(BrokerClosed):
            self.broker.commit(request("blocked"))
        self.assertEqual(self.broker.journal.read_bytes(), before)
        self.assertFalse(self.worker.read_state()["running"])

    def test_different_broker_directory_cannot_create_an_independent_lock(self) -> None:
        with self.assertRaises(BrokerClosed):
            ManagedWriter(self.directory / "incorrect-broker", self.worker)
        self.assertFalse(self.worker.events.exists())

    def test_compact_journal_contains_no_fact_payload_or_modify_body(self) -> None:
        facts = tuple(f"synthetic-user-payload-{index}:" + "x" * 512 for index in range(500))
        prepared = request("large-command", facts=facts)
        self.assertGreater(len(prepared.native_modify), 250000)
        self.assertEqual(self.broker.commit(prepared).status, "committed")
        raw = self.broker.journal.read_bytes()
        self.assertLess(len(raw), 8192)
        self.assertNotIn(b"synthetic-user-payload", raw)
        self.assertNotIn(b"native_modify", raw)
        self.assertNotIn(b"expected_proof", raw)
        _, attempts = self.broker.load()
        stored = next(iter(attempts.values())).request
        self.assertIsInstance(stored, RecoveryIntent)
        self.assertFalse(hasattr(stored, "native_modify"))
        self.assertFalse(hasattr(stored, "expected_proof"))
        self.assertEqual(stored.expected_digest, prepared.expected_digest)

    def test_compact_intent_reconciles_without_retained_modify(self) -> None:
        def die(stage: str, _: PreparedModify) -> None:
            if stage == "after_apply":
                raise ProcessDeath("Injected broker death after native publication")
        broker = ManagedWriter(self.directory / "broker", self.worker, fault=die)
        with self.assertRaises(ProcessDeath):
            broker.commit(request("no-body-recovery"))
        self.assertNotIn(b"native_modify", broker.journal.read_bytes())
        recovered = ManagedWriter(self.directory / "broker", self.worker).resolve("no-body-recovery")
        self.assertEqual(recovered.status, "committed")

    def test_row_digest_preserves_multiplicity_and_ignores_result_order(self) -> None:
        a, b = {"id": "one", "value": "x"}, {"id": "two", "value": "y"}
        self.assertEqual(proof_digest([a,b]), proof_digest([b,a]))
        self.assertNotEqual(proof_digest([a]), proof_digest([a,a]))


if __name__ == "__main__":
    unittest.main(verbosity=2)

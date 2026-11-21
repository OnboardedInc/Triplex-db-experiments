import collections
from importlib import import_module
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

tail = import_module("tail-report")
MS = tail.MS


class TailJoin(unittest.TestCase):
    def setUp(self):
        self.indexes = {kind: collections.defaultdict(lambda: tail.Intervals([])) for kind in ("C", "F", "W")}
        self.detail = {"start": 60*MS, "end": 110*MS, "sql": [
            {"op": "insert", "pid": 24, "start": 61*MS, "end": 108*MS}]}
        self.meta = {"members": [{"t": 42, "applied-at": 30*MS}]}
        self.prior = tail.Intervals([(24*MS, 50*MS), (60*MS, 110*MS)])
        self.pauses = {"tx": tail.Intervals([]), "gw-w": tail.Intervals([]), "gw-r": tail.Intervals([])}
        self.indexes["C"][420] = tail.Intervals([(62*MS, 107*MS, 4)])
        self.indexes["F"][420] = tail.Intervals([(63*MS, 106*MS, 4)])
        self.indexes["W"][420] = tail.Intervals([(66*MS, 104*MS, 0)])
        self.indexes["W"][999] = tail.Intervals([(60*MS, 110*MS, 0)])

    def event(self, backends, writebacks=()):
        return tail.append_record(self.detail, self.meta, "r235-loaded", self.indexes, backends,
                                  (0, 200*MS), self.pauses, tail.Intervals(writebacks), self.prior)

    def test_assigns_backend_matched_wal_and_separates_handoff(self):
        event = self.event({24: {420}}, [(67*MS, 102*MS, 23)])
        self.assertEqual(event["longAppend"], "wal-sync")
        self.assertEqual(event["pgCommitNs"], 45*MS)
        self.assertEqual(event["overlapNs"]["wal-sync"], 38*MS)
        self.assertEqual(event["overlapNs"]["checkpoint-writeback-overlap"], 35*MS)
        self.assertEqual(event["longHandoff"], {"readyNs": 30*MS, "waitNs": 30*MS,
                         "priorAppendNs": 20*MS, "outsidePriorAppendNs": 10*MS})

    def test_unrelated_backend_is_not_assigned_by_time(self):
        event = self.event({24: {999}})
        self.assertEqual(event["longAppend"], "unresolved")
        self.assertEqual(event["pgCommitNs"], 0)
        self.assertEqual(event["overlapNs"]["wal-sync"], 0)

    def test_ambiguous_commit_is_not_assigned(self):
        self.indexes["C"][999] = tail.Intervals([(72*MS, 90*MS, 5)])
        event = self.event({24: {420, 999}})
        self.assertEqual(event["sql"][0]["candidateCommits"], 2)
        self.assertEqual(event["longAppend"], "unresolved")

    def test_uses_transactor_safepoint_instead_of_other_roles(self):
        self.pauses["gw-w"] = tail.Intervals([(65*MS, 100*MS, "GC")])
        self.assertEqual(self.event({})["longAppend"], "unresolved")
        self.pauses["tx"] = tail.Intervals([(65*MS, 100*MS, "GC")])
        self.assertEqual(self.event({})["longAppend"], "transactor-safepoint-overlap")

    def test_checkpoint_requires_actual_io_overlap(self):
        self.assertEqual(self.event({}, [(65*MS, 100*MS, 23)])["longAppend"], "checkpoint-writeback-overlap")

    def test_clock_is_bracketed_and_an_offset_step_withholds_attribution(self):
        good = tail.ClockBridge([{"wall": 400*MS, "lo": 40*MS, "hi": 40*MS+1000},
                                 {"wall": 600*MS, "lo": 240*MS-1000, "hi": 240*MS}])
        self.assertEqual(good.monotonic(500*MS), (139*MS-1000, 141*MS+1000))
        stepped = tail.ClockBridge([{"wall": 400*MS, "lo": 40*MS, "hi": 40*MS+1000},
                                    {"wall": 600*MS, "lo": 245*MS, "hi": 245*MS+1000}])
        self.assertIsNone(stepped.monotonic(500*MS))

    def test_live_probe_witness_requires_backend_lsn_and_sync(self):
        with TemporaryDirectory() as root:
            directory = Path(root)
            (directory / "clock.ndjson").write_text('{"backendPids":{"420":24}}\n')
            spans = directory / "postgres-spans.tsv"
            spans.write_text("START\t12\nC\t420\t20\t40\t50\nF\t420\t22\t37\t51\nW\t420\t25\t35\t0\n")
            with self.assertRaises(ValueError):
                tail.observer.sentinel(directory, 24)
            spans.write_text("START\t12\nC\t420\t20\t40\t50\nF\t420\t22\t37\t50\nW\t420\t25\t35\t0\n")
            with self.assertRaises(ValueError):
                tail.observer.sentinel(directory, 25)
            self.assertEqual(tail.observer.sentinel(directory, 24),
                             {"hostPid": 420, "sqlPid": 24, "start": 20, "end": 40, "lsn": 50})

    def test_collect_binds_wal_arm_to_receipt_clock_restore_and_readback(self):
        with TemporaryDirectory() as root:
            parent = Path(root)
            arm = parent / "1-tail-wal-S"
            engine = parent / "engines" / "tx2-dxprep1-22222222-1-tail-wal-s"
            trace = engine / "trace" / "raw"
            trace.mkdir(parents=True)
            arm.mkdir()
            (engine / "config").mkdir()
            write = tail.observer.write
            sha = tail.observer.sha
            attempt = {"source": "a"*40, "slot": engine.name, "nonce": "b"*36}
            write(arm/"header.json", {**attempt, "commit": attempt["source"], "arm": {"tail": "wal"}, "db": "seed"})
            write(arm/"complete.json", {"cut": 5})
            write(parent/"plan.json", {"cells": ["r235-loaded"]})
            write(parent/"wal-mount.json", {"filesystems": [{"source": "/dev/nvme1n1",
                "target": str((parent/"wal-mount").resolve()), "fstype": "ext4"}]})
            write(arm/"r235-loaded.json", {"phaseStartNs": 17*MS, "rows": [{"receipt": {"t": "42"}}]})
            roles = dict(zip(("pg", "tx", "gw-w", "gw-r"), ("1", "0", "2-5", "6"), strict=True))
            ids = [f"container-{role}" for role in roles]
            write(engine/"stack.json", {"prefix": engine.name, "containers": [
                {"id": cid, "name": f"{engine.name}-{role}", "imageId": "image", "cpuset": cpuset}
                for cid, (role, cpuset) in zip(ids, roles.items(), strict=True)]})
            (engine/"config"/"java-image.txt").write_text("image|21|base|hash\n")
            (engine/"restore.sha256").write_text("dump\n")
            logs = [trace/f"prep1-gc-{role}.log" for role in ("tx", "gw-w", "gw-r")]
            for log in logs:
                log.write_text('[2026-01-01T00:00:00.000+0000][info][gc] Using G1\n')
            native = trace/"prep1-native.ndjson"
            common = {"db": "seed", "attempt": attempt["nonce"], "start": 60*MS, "end": 110*MS}
            native.write_text("".join(json.dumps(row)+"\n" for row in (
                {**common, **self.detail, "tailAppend": True}, {**common, **self.meta},
                {"attempt": attempt["nonce"], "dropped": 0, "end": True})))
            (arm/"boot-id").write_text("boot\n")
            (arm/"postgres.bt").write_text("fixture\n")
            (arm/"postgres.log").write_text("checkpoint starting\n")
            (arm/"postgres-bpf.log").write_text("fixture\n")
            write(arm/"observer.json", {**attempt, "boot": "boot", "containers": ids,
                "stackSha256": sha(engine/"stack.json"), "bpfScriptSha256": sha(arm/"postgres.bt")})
            (arm/"clock.ndjson").write_text("".join(json.dumps({"wall": i*MS, "lo": i*MS,
                "hi": i*MS+200, "backendPids": {"420": 24}})+"\n" for i in (1, 250)))
            (arm/"postgres-spans.tsv").write_text("\n".join([
                "START\t1", f"C\t420\t{62*MS}\t{107*MS}\t4", f"F\t420\t{63*MS}\t{106*MS}\t4",
                f"W\t420\t{66*MS}\t{104*MS}\t0", f"STOP\t{120*MS}", "@emitted: 3", ""]))
            write(arm/"observer-end.json", {**attempt, "boot": "boot", "files": {name: sha(arm/name)
                for name in ("postgres-spans.tsv", "postgres-bpf.log", "clock.ndjson", "postgres.bt", "observer.json")}})
            write(arm/"sentinel.json", tail.observer.sentinel(arm, 24))
            write(arm/"pg-settings.json", {"version": "170001", "layout": ["/data", "/wal", "1", "2"],
                "settings": {"fsync": "on", "synchronous_commit": "on", "full_page_writes": "on",
                    "wal_sync_method": "fdatasync", "track_wal_io_timing": "on", "checkpoint_timeout": "5min",
                    "checkpoint_completion_target": "0.9", "checkpoint_flush_after": "256kB", "min_wal_size": "80MB",
                    "max_wal_size": "1GB", "log_checkpoints": "on", "log_timezone": "UTC", "shared_buffers": "2GB"}})
            for at, label in enumerate(("before", "after"), start=1):
                write(arm/f"pg-{label}.json", {"at": at, "synchronous_commit": "on", "wal": {
                    "stats_reset": "reset", "wal_sync": at, "wal_sync_time": at, "wal_write": at, "wal_write_time": at}})
            summary = arm/"summary.json"
            write(summary, {**attempt, "fixture": False, "orderedIds": True, "numericOwner": True, "seedSha": "seed",
                "dumpSha": "dump", "planSha": sha(parent/"plan.json"), "cells": [{"cell": "r235-loaded",
                    "appends": 1, "orderedPrepared": 1}], "rawSha256": {p.name: sha(p) for p in (
                        native, *logs, *(arm/name for name in ("header.json", "complete.json", "r235-loaded.json")))}})
            tail.collect(arm, trace, summary)
            cell, = tail.read(arm/"tail-summary.tmp")["cells"]
            self.assertEqual(cell["appendTailCounts"], {"wal-sync": 1})
            self.assertEqual(cell["sqlSpanLinks"], {"matched-backend": 1})
            (engine/"restore.sha256").write_text("other dump\n")
            with self.assertRaises(AssertionError):
                tail.collect(arm, trace, summary)


if __name__ == "__main__":
    unittest.main()

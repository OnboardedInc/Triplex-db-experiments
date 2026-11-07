"""Offline packet checks. No native failure-atomicity claim follows from them."""
import dataclasses
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import uuid

from broker import proof_digest
from native_fixture import prepare
from native_faults import ROOT, prepare_packet


class NativePacketTests(unittest.TestCase):
    def test_complete_operation_proof_retains_payload_and_assertion_identity(self):
        request = prepare("offline:complete", facts=3)
        request.validate()
        self.assertEqual(request.expected_count, 41)
        self.assertEqual(request.expected_digest, proof_digest(request.expected_proof))
        self.assertEqual(len({row["s"] for row in request.expected_proof}), 6)
        self.assertTrue(any(row["o"] == "9223372036854775807" for row in request.expected_proof))
        self.assertNotIn("native_modify", dataclasses.asdict(request.to_intent()))
        self.assertNotIn("expected_proof", dataclasses.asdict(request.to_intent()))
        self.assertIn("LIMIT 10001", request.native_proof)
        self.assertIn("LIMIT 1", request.native_footprint)

    def test_bounded_single_modify_cancel_condition(self):
        request = prepare("offline:cancel", facts=1, delay_rows=200000)
        self.assertTrue(request.native_modify.startswith("INSERT { GRAPH"))
        self.assertEqual(request.native_modify.count("INSERT"), 1)
        self.assertIn("SHA256", request.native_modify)
        self.assertLess(len(request.native_modify.encode()), 4 * 1024 * 1024)
        request.validate()
        with self.assertRaises(ValueError):
            prepare("offline:too-large", facts=101)
        with self.assertRaises(ValueError):
            prepare("offline:too-slow", delay_rows=200001)

    def test_prepare_never_calls_native_or_docker_and_does_not_print_token(self):
        destination = ROOT / ".qlever/managed" / ("offline-packet-" + uuid.uuid4().hex)
        # Explicitly retained: no TemporaryDirectory/finalizer removes fixtures.
        with patch("native_faults.command", side_effect=AssertionError("No Docker in prepare")), patch("builtins.print") as output:
            prepare_packet(destination)
        packet = json.loads((destination / "packet.json").read_text())
        self.assertEqual(packet["status"], "PREPARED_NOT_EXECUTED")
        self.assertEqual([item["case"] for item in packet["cases"]], ["cancel", "persist", "lostack"])
        self.assertEqual(packet["profile"]["memoryBytes"], 2 * 1024**3)
        self.assertEqual(packet["plannedWorstOverlapBytes"], 1024**3)
        for case in packet["cases"]:
            directory = destination / case["case"]
            secret = (directory / "token").read_text()
            self.assertEqual((directory / "token").stat().st_mode & 0o777, 0o600)
            self.assertNotIn(secret, str(output.call_args_list))
            compose = json.loads((directory / "compose.json").read_text())
            native = compose["services"]["native"]
            self.assertEqual(native["user"], "1000:1000")
            self.assertEqual(native["working_dir"], "/data")
            self.assertEqual(native["mem_limit"], native["memswap_limit"])
            self.assertNotIn("--no-access-check", native["command"])
            self.assertIn("--access-token", native["command"])
            self.assertFalse((directory / "data").exists())
        with self.assertRaises(AssertionError):
            prepare_packet(destination)


if __name__ == "__main__":
    unittest.main()

"""Pure boundary checks only: all native HTTP/Docker interactions are mocked."""
from __future__ import annotations

import unittest
from pathlib import Path
from unittest.mock import Mock

from broker import BrokerClosed
from native_worker import OwnedNativeConfiguration, OwnedQleverWorker
from test_broker import request


class NativeBoundaryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.snapshot = Path(__file__).resolve().parents[2] / ".qlever" / "managed" / "future-trial" / "data" / "triplex.update-triples"
        self.configuration = OwnedNativeConfiguration("triplex-qlever-managed-future", "http://127.0.0.1:7023", self.snapshot, "x" * 48)
        self.worker = OwnedQleverWorker(self.configuration)

    def valid_inspection(self) -> dict:
        return {
            "Id": "owned-model-id",
            "State": {"Running": True, "StartedAt": "epoch-one"},
            "Config": {"Image": self.configuration.image, "WorkingDir": "/data", "Labels": {"triplex.owner": "triplex-db", "triplex.experiment": "managed-writer"}, "Entrypoint": ["qlever-server"], "Cmd": ["-i", "triplex", "-p", "7019", "--persist-updates", "--access-token", self.configuration.access_token]},
            "Mounts": [{"Destination": "/data", "Source": str(self.snapshot.parent)}],
            "HostConfig": {"Memory": 2 * 1024**3, "MemorySwap": 2 * 1024**3, "NanoCpus": 2 * 10**9, "RestartPolicy": {"Name": "no"}, "PortBindings": {"7019/tcp": [{"HostIp": "127.0.0.1", "HostPort": "7023"}]}},
        }

    def test_current_development_and_candidate_containers_are_ineligible(self) -> None:
        for name in ("triplex-qlever-local", "triplex-qlever-candidate-a", "triplex-qlever-candidate-b"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                OwnedQleverWorker(OwnedNativeConfiguration(name, self.configuration.url, self.snapshot, "x" * 48))

    def test_current_native_datasets_are_ineligible(self) -> None:
        for directory in ("data", "experiments/oom-wave-20261106T145730/a"):
            path = self.snapshot.parents[3] / directory / "triplex.update-triples"
            with self.subTest(path=str(path)), self.assertRaises(ValueError):
                OwnedQleverWorker(OwnedNativeConfiguration(self.configuration.container, self.configuration.url, path, "x" * 48))

    def test_no_complete_proof_row_does_not_mean_marker_absence(self) -> None:
        self.worker.http = Mock(side_effect=[{"results": {"bindings": [{"marker": {"value": "one"}}]}}, {"results": {"bindings": []}}])
        self.assertEqual(self.worker.check(request("one")).status, "inconsistent")

    def test_orphan_footprint_prevents_absence_resolution(self) -> None:
        self.worker.http = Mock(side_effect=[{"results": {"bindings": []}}, {"results": {"bindings": [{"orphan": {"value": "fact"}}]}}])
        self.assertEqual(self.worker.check(request("one")).status, "inconsistent")

    def test_marker_and_every_expected_payload_channel_are_required(self) -> None:
        prepared = request("one")
        expected = [{key: {"value": value} for key, value in row.items()} for row in prepared.expected_proof]
        self.worker.http = Mock(side_effect=[{"results": {"bindings": [{"marker": {"value": "one"}}]}}, {"results": {"bindings": expected}}])
        self.assertEqual(self.worker.check(prepared).status, "committed")

    def test_absence_checks_a_separate_footprint_selector(self) -> None:
        self.worker.http = Mock(side_effect=[{"results": {"bindings": []}}, {"results": {"bindings": []}}])
        prepared = request("one")
        self.assertEqual(self.worker.check(prepared).status, "absent")
        self.assertEqual([call.args[0] for call in self.worker.http.call_args_list], [prepared.native_marker, prepared.native_footprint])

    def test_unfenced_native_command_is_rejected_before_network_submission(self) -> None:
        item = self.valid_inspection()
        item["Config"]["Cmd"].append("--no-access-check")
        with self.assertRaisesRegex(BrokerClosed, "Unfenced"):
            self.worker.ownership(item)

    def test_exact_native_basename_port_and_direct_executable_are_enforced(self) -> None:
        self.worker.ownership(self.valid_inspection())
        variants = []
        for option, value in (("-i", "other"), ("-p", "7020")):
            item = self.valid_inspection()
            arguments = item["Config"]["Cmd"]
            arguments[arguments.index(option) + 1] = value
            variants.append(item)
        for suffix in (["-i", "other"], ["-p", "7020"], ["--index-basename=other"], ["--port", "7020"], ["-itriplex"], ["-p7019"]):
            item = self.valid_inspection()
            item["Config"]["Cmd"].extend(suffix)
            variants.append(item)
        wrapper = self.valid_inspection()
        wrapper["Config"]["Entrypoint"] = ["/bin/bash", "/unknown-wrapper.sh"]
        variants.append(wrapper)
        for item in variants:
            with self.subTest(command=item["Config"]), self.assertRaises(BrokerClosed):
                self.worker.ownership(item)

    def test_working_directory_and_manual_epoch_lifecycle_are_required(self) -> None:
        for working_directory in ("", "/", "/tmp"):
            item = self.valid_inspection()
            item["Config"]["WorkingDir"] = working_directory
            with self.subTest(directory=working_directory), self.assertRaisesRegex(BrokerClosed, "/data"):
                self.worker.ownership(item)
        for policy in ("always", "unless-stopped", "on-failure"):
            item = self.valid_inspection()
            item["HostConfig"]["RestartPolicy"]["Name"] = policy
            with self.subTest(policy=policy), self.assertRaisesRegex(BrokerClosed, "Automatic"):
                self.worker.ownership(item)
        item = self.valid_inspection()
        item["HostConfig"]["RestartPolicy"]["Name"] = ""
        self.worker.ownership(item)

    def test_token_duplicates_and_no_access_check_variants_are_rejected(self) -> None:
        for suffix in (["--access-token", "different-token"], ["--access-token=alternate"], ["--access-token-file", "/private/token"], ["--no-access-check=true"], ["--no-access-check=false"]):
            item = self.valid_inspection()
            item["Config"]["Cmd"].extend(suffix)
            with self.subTest(suffix=suffix), self.assertRaises(BrokerClosed):
                self.worker.ownership(item)


if __name__ == "__main__":
    unittest.main(verbosity=2)

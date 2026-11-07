"""Retained local-evidence component fixtures; no Docker, HTTP or native action."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from ack_inventory import ROOT, bounded_bytes, inventory


def encoded(value):
    return (json.dumps(value, sort_keys=True) + "\n").encode()


def fixture(*, anchor=True, index_events=True):
    parent = ROOT / ".artifacts/ack-authority-components"
    parent.mkdir(parents=True, exist_ok=True)
    root = Path(tempfile.mkdtemp(prefix="case-", dir=parent))
    relative = ".devloop/jobs/component/attempts/0001"
    directory = root / relative
    artifacts = directory / "artifacts"
    artifacts.mkdir(parents=True)
    report = encoded({"scope": "component-scope"})
    events = encoded({"type": "write", "reconciled": True, "commandId": "component-command", "knownPosition": 2, "visibleBasis": {"scope": "component-scope"}})
    (artifacts / "report.json").write_bytes(report)
    (artifacts / "events.jsonl").write_bytes(events)
    outputs = [{"path": "artifacts/report.json", "sha256": hashlib.sha256(report).hexdigest()}]
    if index_events:
        outputs.append({"path": "artifacts/events.jsonl", "sha256": hashlib.sha256(events).hexdigest()})
    terminal = encoded({"status": "component-record-only", "outputs": outputs})
    (directory / "terminal.json").write_bytes(terminal)
    attempt = {"id": "0001", "directory": relative}
    if anchor:
        attempt["terminalSha256"] = hashlib.sha256(terminal).hexdigest()
    (root / ".devloop/state.json").write_bytes(encoded({"jobs": {"component": {"manifest": {"backend": "qlever"}, "attempts": [attempt]}}}))
    return root, artifacts, events


class AuthorityTests(unittest.TestCase):
    def test_event_hash_has_its_own_anchor(self):
        root, _, events = fixture()
        references = inventory(root)["scopes"][0]["explicitAckReferences"]
        self.assertEqual(len(references), 1)
        self.assertEqual(references[0]["authority"], "ANCHORED_RAW_EVENT_RECORDS")
        self.assertEqual(references[0]["eventsSha256"], hashlib.sha256(events).hexdigest())

    def test_tampered_event_refuses_even_when_report_anchor_is_unchanged(self):
        root, artifacts, events = fixture()
        (artifacts / "events.jsonl").write_bytes(events.replace(b"component-command", b"different-command"))
        with self.assertRaisesRegex(ValueError, "event bytes changed"):
            inventory(root)

    def test_missing_event_index_is_partial_despite_anchored_report(self):
        root, _, _ = fixture(index_events=False)
        reference = inventory(root)["scopes"][0]["explicitAckReferences"][0]
        self.assertEqual(reference["authority"], "LEGACY_TERMINAL_OMITS_EVENTS_INDEX_PARTIAL_AUTHORITY")

    def test_unanchored_terminal_cannot_qualify_events(self):
        root, _, _ = fixture(anchor=False)
        reference = inventory(root)["scopes"][0]["explicitAckReferences"][0]
        self.assertEqual(reference["authority"], "UNANCHORED_RAW_EVENTS_NOT_QUALIFICATION")

    def test_bounded_read_refuses_oversize_and_links(self):
        root, artifacts, _ = fixture()
        path = artifacts / "small"
        path.write_bytes(b"four")
        with self.assertRaises(ValueError):
            bounded_bytes(path, 3)
        link = artifacts / "linked"
        link.symlink_to(path)
        with self.assertRaises(ValueError):
            bounded_bytes(link, 8)

    def test_attempt_path_escape_refuses(self):
        root, _, _ = fixture()
        path = root / ".devloop/state.json"
        state = json.loads(path.read_bytes())
        state["jobs"]["component"]["attempts"][0]["directory"] = "../foreign"
        path.write_bytes(encoded(state))
        with self.assertRaisesRegex(ValueError, "Escaped"):
            inventory(root)


if __name__ == "__main__":
    unittest.main()

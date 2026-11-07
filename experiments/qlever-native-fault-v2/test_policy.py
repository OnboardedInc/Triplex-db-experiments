"""Component-only metadata/redaction tests: no server, snapshot copy or native fault."""
import copy
import json
from pathlib import Path
import unittest
from policy import MAIN_CID, IMAGE, OWNER, GIB, FenceError, main_stopped, fault_fence, reject_other_live_q, redact_bounded_log, safe_error

ROOT = Path(__file__).resolve().parents[2]
PACKET = "00000000-0000-4000-8000-000000000001"
TOKEN = b"synthetic-private-token-01234567890123456789"
CASE = ROOT / ".runtime/qlever-native-fault-v2" / PACKET / "volume/cancel"

def fixture():
    return {"Id": "f" * 64, "Image": IMAGE, "State": {"Running": True, "Pid": 42},
            "Config": {"Labels": {"triplex.owner": OWNER, "triplex.backend": "qlever", "triplex.role": "qlever-native-fault-v2", "triplex.packet": PACKET, "triplex.case": "cancel"}, "User": "501:20", "WorkingDir": "/data", "Entrypoint": ["qlever-server"], "Cmd": ["-i", "triplex", "-p", "7019", "-j", "4", "-m", "512M", "-c", "64M", "-e", "32M", "--persist-updates", "--no-patterns", "--enable-metrics", "--access-token", TOKEN.decode()]},
            "HostConfig": {"Memory": 2 * GIB, "MemorySwap": 2 * GIB, "NanoCpus": 1500000000, "PidsLimit": 256, "ReadonlyRootfs": True, "RestartPolicy": {"Name": "no"}, "Init": True, "Tmpfs": {"/tmp": "rw,nosuid,nodev,size=67108864,uid=501,gid=20,mode=1777"}, "LogConfig": {"Type": "none"}, "PortBindings": {"7019/tcp": [{"HostIp": "127.0.0.1", "HostPort": "17129"}]}},
            "Mounts": [{"RW": True, "Type": "bind", "Source": str(CASE), "Destination": "/data"}]}

def check(item):
    return fault_fence(item, cid="f" * 64, case_directory=CASE, token=TOKEN, packet_id=PACKET, case="cancel", host_port=17129, must_run=True)

class PolicyTests(unittest.TestCase):
    def test_exact_fault_profile_does_not_disclose_argv_token(self):
        proof = check(fixture())
        self.assertNotIn(TOKEN.decode(), json.dumps(proof))
        self.assertTrue(proof["tokenFenced"])

    def test_main_running_or_paused_cannot_release_memory_for_replacement(self):
        item = fixture(); item["Id"] = MAIN_CID
        item["Mounts"][0]["Source"] = str(ROOT / ".runtime/engines/qlever-main/data")
        owner = {"id": "foundation-qlever", "containerId": MAIN_CID, "imageSha256": IMAGE, "status": "unknown", "resources": {"memoryBytes": 2 * GIB, "cpuUnits": 1.5}}
        with self.assertRaises(FenceError): main_stopped(item, owner, ROOT)
        item["State"] = {"Running": False, "Pid": 0}
        self.assertFalse(main_stopped(item, owner, ROOT)["running"])
        owner["status"] = "released"
        with self.assertRaises(FenceError): main_stopped(item, owner, ROOT)

    def test_main_caps_and_hidden_writable_volume_are_refused(self):
        item = fixture()
        item["Mounts"].append({"Type": "volume", "Source": "unbounded", "Destination": "/other", "RW": True})
        with self.assertRaises(FenceError): check(item)
        item = fixture(); item["Id"] = MAIN_CID; item["State"] = {"Running": False, "Pid": 0}
        item["Mounts"][0]["Source"] = str(ROOT / ".runtime/engines/qlever-main/data")
        owner = {"id": "foundation-qlever", "containerId": MAIN_CID, "imageSha256": IMAGE, "status": "unknown", "resources": {"memoryBytes": 2 * GIB, "cpuUnits": 1.5}}
        item["HostConfig"]["Memory"] = 3 * GIB
        with self.assertRaises(FenceError): main_stopped(item, owner, ROOT)

    def test_changed_caps_path_and_owner_are_refused(self):
        for section, key, value in [("HostConfig", "Memory", 3 * GIB), ("HostConfig", "MemorySwap", -1), ("HostConfig", "NanoCpus", 2000000000), ("HostConfig", "ReadonlyRootfs", False), ("Config", "User", "0")]:
            item = fixture(); item[section][key] = value
            with self.assertRaises(FenceError): check(item)
        item = fixture(); item["Mounts"][0]["Source"] = str(ROOT / ".runtime/engines/qlever-main/data")
        with self.assertRaises(FenceError): check(item)
        item = fixture(); item["Config"]["Labels"]["triplex.packet"] = "different"
        with self.assertRaises(FenceError): check(item)

    def test_alternate_native_argv_and_raw_daemon_logs_refused(self):
        for extra in [["--no-access-check"], ["--access-token", TOKEN.decode()], ["--memory-max-size", "1T"]]:
            item = fixture(); item["Config"]["Cmd"] += extra
            with self.assertRaises(FenceError): check(item)
        item = fixture(); item["HostConfig"]["LogConfig"] = {"Type": "json-file"}
        with self.assertRaises(FenceError): check(item)

    def test_current_main_name_does_not_escape_other_live_owner_check(self):
        item = fixture(); item["Id"] = MAIN_CID; item["Name"] = "/triplex-db-qlever-main"
        with self.assertRaises(FenceError): reject_other_live_q([item], "f" * 64)
        item["State"]["Running"] = False
        reject_other_live_q([item], "f" * 64)

    def test_full_and_truncated_secret_redaction_and_safe_error(self):
        self.assertNotIn(TOKEN, redact_bounded_log(b"startup " + TOKEN + b" done", [TOKEN]))
        raw = b"prefix " + TOKEN
        output = redact_bounded_log(raw, [TOKEN], maximum=14)
        self.assertNotIn(TOKEN[:7], output)
        self.assertLessEqual(len(output), 14)
        self.assertNotIn(TOKEN.decode(), json.dumps(safe_error(RuntimeError(TOKEN.decode()))))
        with self.assertRaises(FenceError): redact_bounded_log(b"x" * 100, [TOKEN], maximum=1)

if __name__ == "__main__": unittest.main()

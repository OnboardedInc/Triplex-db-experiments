"""Exercise the actual S5 cleanup against concurrent poll writes and a large UTF-8 record."""
import os
import signal
import sys
import json
import pathlib
import subprocess
import tempfile
import unittest
import uuid


class ClosedDriverLog(unittest.TestCase):
    def test_success_and_failure_preserve_every_driver_byte(self):
        # [DX-S5] Why: H's shell poll split a megabyte JSON record; run the real cleanup, not a reimplemented merger.
        # Rejected: checking only an exit code or a small record that fits in one pipe write.
        source = pathlib.Path("lab/experiments/EXP-DX1/r2/window.sh").read_text()
        cleanup = source[source.index("cleanup() {"):source.index("\ntrap cleanup EXIT")]
        for rc in (0, 137):
            with self.subTest(rc=rc), tempfile.TemporaryDirectory(prefix="dxs5-logging-") as root:
                payload = {"kind": "driver-body", "attempt": str(uuid.uuid4()), "payload": "α" * 600000}
                data = (json.dumps(payload, ensure_ascii=False) + "\n").encode()
                pathlib.Path(root, "driver.log").write_bytes(data)
                script = ('set -euo pipefail\ns5=true; held=false; resources=false; '
                          f'completed={"true" if rc == 0 else "false"}; out=$1; timer=; watcher=; diskguard=; sampler=\n'
                          + cleanup + '\ntrap cleanup EXIT\n'
                          + '(while sleep .001; do echo "evaluation-disk macFreeKiB=20000000 vmFreeKiB=40000000"; done) &\n'
                          + f'diskguard=$!\nsleep .01\nexit {rc}\n')
                result = subprocess.run(["bash", "-c", script, "logging-test", root], capture_output=True, timeout=10)
                self.assertEqual(result.returncode, rc, result.stderr.decode())
                records = [json.loads(line) for line in result.stdout.decode().splitlines() if line.startswith("{")]
                self.assertEqual(records, [{"kind": "driver-raw-begin", "bytes": len(data)}, payload,
                                           {"kind": "driver-raw-end"}])
                self.assertFalse(pathlib.Path(root).exists())

    def test_supervisor_captures_final_peak_after_child_kill(self):
        with tempfile.TemporaryDirectory(prefix="dxs5-supervisor-") as root:
            for name, contents in (("memory.peak", "123456789"), ("memory.current", "1234"), ("memory.events", "oom 1\noom_kill 1")):
                pathlib.Path(root, name).write_text(contents)
            target = pathlib.Path(root, "observed.ndjson")
            result = subprocess.run([sys.executable, "lab/experiments/EXP-DX1/s5/supervise.py", sys.executable,
                                     "-c", "import os,signal; os.kill(os.getpid(),signal.SIGKILL)"],
                                    env={**os.environ, "S5_CGROUP_ROOT": root, "S5_DRIVER_MEMORY_LOG": str(target)},
                                    capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 137)
            records = [json.loads(line) for line in target.read_text().splitlines()]
            self.assertEqual(records[-1]["kind"], "driver-cgroup-final")
            self.assertEqual(records[-1]["values"]["memory.peak"], "123456789")
            self.assertEqual(records[-1]["values"]["memory.events"], "oom 1\noom_kill 1")
            self.assertEqual(result.stdout, b"")


if __name__ == "__main__":
    unittest.main()

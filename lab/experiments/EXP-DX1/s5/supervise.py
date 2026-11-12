#!/usr/bin/env python3
# [DX-S5] Why: keep a small container PID 1 alive long enough to read the child's final cgroup peak and OOM counters.
# Rejected: inspecting memory.peak after Docker has already removed the exited container's cgroup.
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

root = Path(os.environ.get("S5_CGROUP_ROOT", "/sys/fs/cgroup"))
log = open(os.environ["S5_DRIVER_MEMORY_LOG"], "x") if "S5_DRIVER_MEMORY_LOG" in os.environ else sys.stdout
child = subprocess.Popen(sys.argv[1:])
for signum in (signal.SIGTERM, signal.SIGINT):
    signal.signal(signum, lambda number, _frame: child.send_signal(number))

def memory(final=False):
    values = {}
    for name in ("memory.peak", "memory.current", "memory.events"):
        try:
            values[name] = (root / name).read_text().strip()
        except OSError as error:
            values[name] = str(error)
    print(json.dumps({"kind": "driver-cgroup-final" if final else "driver-cgroup-sample",
                      "time": time.time(), "childPid": child.pid, "values": values}), file=log, flush=True)

while child.poll() is None:
    memory()
    try:
        child.wait(timeout=2)
    except subprocess.TimeoutExpired:
        pass
memory(True)
code = child.returncode
sys.exit(128 - code if code < 0 else code)

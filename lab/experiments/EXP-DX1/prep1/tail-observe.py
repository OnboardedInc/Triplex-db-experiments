"""Record the owned PostgreSQL process group and an arm-local monotonic clock bridge."""

import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time


def sha(path):
    with path.open("rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def write(path, value):
    with path.open("x") as f:
        json.dump(value, f, indent=2)
        f.write("\n")


def cgroup(pid):
    line, = Path(f"/proc/{pid}/cgroup").read_text().splitlines()
    assert re.fullmatch(r"0::/[a-zA-Z0-9._/-]+", line)
    return Path("/sys/fs/cgroup" + line[3:])


def sample(group):
    # [DX-PREP1] Why: store the clock bracket and exact PID translation from this container.
    # Rejected: comparing JDBC's namespace PID with bpftrace's host PID directly.
    lo = time.monotonic_ns()
    wall = time.time_ns()
    hi = time.monotonic_ns()
    backends = {}
    for pid in (group / "cgroup.procs").read_text().split():
        try:
            row, = re.findall(r"^NSpid:\s+([\d\t ]+)$", Path(f"/proc/{pid}/status").read_text(), re.M)
            numbers = list(map(int, row.split()))
            assert numbers[0] == int(pid)
            if cgroup(pid) == group:
                backends[pid] = numbers[-1]
        except (FileNotFoundError, ProcessLookupError):
            # A backend can retire between the cgroup snapshot and the proc read.
            continue
    return {"lo": lo, "hi": hi, "wall": wall, "backendPids": backends}


def record(directory, stack_path, source, attempt, pids):
    assert sys.platform == "linux" and os.geteuid() == 0 and __debug__
    stack = json.loads(stack_path.read_text())
    slot = stack["prefix"]
    assert re.fullmatch(r"tx2-dxprep1-[a-f0-9]{8}-1-tail-(control|wal|zgc|fair)-s", slot)
    assert re.fullmatch(r"[a-f0-9]{40}", source) and re.fullmatch(r"[a-f0-9-]{36}", attempt)
    assert len(pids) == 4 and all(pid > 1 for pid in pids)
    boot = Path("/proc/sys/kernel/random/boot_id").read_text().strip()
    assert all(os.stat(f"/proc/{pid}/ns/time").st_ino == os.stat("/proc/self/ns/time").st_ino for pid in pids)
    pg, *_ = pids
    group = cgroup(pg)
    postgres = Path(f"/proc/{pg}/root/usr/local/bin/postgres")
    assert os.path.samefile(postgres, f"/proc/{pg}/exe"), "Profiler must target the running PG image inode"
    script = directory / "postgres.bt"
    script.write_text(Path(__file__).with_name("tail-postgres.bt").read_text()
                      .replace("@PG@", str(postgres)).replace("@CG@", str(group)))
    # The stack provides the exact container IDs. The host observes their PIDs anew.
    roles = ["pg", "tx", "gw-w", "gw-r"]
    observed = [next(c["id"] for c in stack["containers"] if c["name"] == f"{slot}-{role}") for role in roles]
    for cid, pg_pid in zip(observed, pids, strict=True):
        assert subprocess.check_output(["docker", "inspect", "--format", "{{.State.Pid}}", cid],
                                       text=True).strip() == str(pg_pid)
    write(directory / "observer.json", {"source": source, "slot": slot, "nonce": attempt, "boot": boot,
          "stackSha256": sha(stack_path), "pids": pids, "containers": observed, "pgExecutableSha256": sha(postgres),
          "bpfScriptSha256": sha(script), "bpftrace": subprocess.check_output(["bpftrace", "--version"], text=True).strip()})
    stopping = False

    def stop(*_):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    events, errors, clock = (directory / name for name in ("postgres-spans.tsv", "postgres-bpf.log", "clock.ndjson"))
    with events.open("x") as out, errors.open("x") as err, clock.open("x", buffering=1) as clocks:
        proc = subprocess.Popen(["bpftrace", "-B", "line", str(script)], stdout=out, stderr=err)
        try:
            while not stopping and proc.poll() is None:
                print(json.dumps(sample(group)), file=clocks)
                time.sleep(.25)
        finally:
            if proc.poll() is None:
                proc.send_signal(signal.SIGINT)
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait()
    assert stopping and proc.returncode == 0, f"PostgreSQL tracer exit {proc.returncode}"
    write(directory / "observer-end.json", {"source": source, "slot": slot, "nonce": attempt, "boot": boot,
          "files": {p.name: sha(p) for p in (events, errors, clock, script, directory / "observer.json")}})


def read_events(path):
    events, marks = [], {}
    count = None
    for line in path.read_text().splitlines():
        parts = line.split("\t")
        if len(parts) == 5 and parts[0] in {"C", "F", "W", "B", "K", "I"}:
            name, pid, start, end, detail = parts
            events.append((name, int(pid), int(start), int(end), int(detail)))
        elif len(parts) == 2 and parts[0] in {"START", "STOP"}:
            assert parts[0] not in marks
            marks[parts[0]] = int(parts[1])
        elif line.startswith("@emitted: "):
            count = int(line.removeprefix("@emitted: "))
    return events, marks, count


def sentinel(directory, pid):
    # [DX-PREP1] Why: prove that the live probes see a real synchronous SQL commit before offering any tape.
    # Rejected: a successful bpftrace attach or cluster counters as a per-commit gate.
    events, marks, _ = read_events(directory / "postgres-spans.tsv")
    samples = [json.loads(row) for row in (directory / "clock.ndjson").read_text().splitlines()]
    host = {int(h) for row in samples for h, p in row["backendPids"].items() if p == pid}
    if len(host) == 1:
        h, = host
        commits = [(s, e, lsn) for kind, proc, s, e, lsn in events if kind == "C" and proc == h]
        for a, b, lsn in commits:
            flush = [(s, e) for kind, proc, s, e, f in events
                     if kind == "F" and proc == h and a <= s < e <= b and f == lsn]
            if any(a <= s <= w1 < w2 <= e <= b for s, e in flush for kind, proc, w1, w2, _ in events
                   if kind == "W" and proc == h):
                assert marks["START"] <= a < b
                return {"hostPid": h, "sqlPid": pid, "start": a, "end": b, "lsn": lsn}
    raise ValueError("No witnessed synchronous commit from the probe backend")


if __name__ == "__main__":
    action, directory, *args = sys.argv[1:]
    path = Path(directory)
    if action == "record":
        stack_path, source, attempt, *pids = args
        record(path, Path(stack_path), source, attempt, list(map(int, pids)))
    elif action == "sentinel":
        write(path / "sentinel.json", sentinel(path, int(args[0])))
    else:
        raise ValueError(action)

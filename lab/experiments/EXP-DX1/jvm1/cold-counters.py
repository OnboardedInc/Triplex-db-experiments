"""Sample the cold-start trial on its Linux monotonic clock, based on the rolling-credit sampler."""

import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time


ROLE_MASKS = {"tx": {0, 7, 8}, "pg": {1}, "gw-w": {2, 3, 4, 5}, "gw-r": {6}}
SQL = """
SELECT jsonb_build_object(
  'wallNs', (extract(epoch FROM clock_timestamp()) * 1000000000)::bigint::text,
  'wal', (SELECT to_jsonb(w) FROM pg_stat_wal w),
  'checkpointer', (SELECT to_jsonb(c) FROM pg_stat_checkpointer c),
  'io', (SELECT jsonb_agg(to_jsonb(i)) FROM pg_stat_io i),
  'durable', current_setting('synchronous_commit'),
  'backend', pg_backend_pid());
"""


def proc_stat(pid):
    # [DX-PREP1] Why: bind recurring samples to one process incarnation even if Linux recycles the PID.
    # Rejected: matching a filename under /proc by PID alone.
    fields = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
    return int(fields[19]), (int(fields[11]) + int(fields[12]))


def cpu_file(container):
    pid = container["State"]["Pid"]
    assert pid > 1 and container["State"]["Running"]
    paths = Path(f"/proc/{pid}/cgroup").read_text().splitlines()
    path, = [p.removeprefix("0::") for p in paths if p.startswith("0::/")]
    assert container["Id"] in path
    return (Path("/sys/fs/cgroup") / path.lstrip("/") / "cpu.stat", pid, proc_stat(pid)[0])


def sample_roles(roles):
    out = {}
    for role, (path, pid, incarnation) in roles.items():
        assert proc_stat(pid)[0] == incarnation and os.sched_getaffinity(pid) == ROLE_MASKS[role]
        cpu = {line.split()[0]: int(line.split()[1]) for line in path.read_text().splitlines()}
        assert {"usage_usec", "nr_throttled", "throttled_usec"} <= cpu.keys()
        # [DX-JVM1] Why: keep device I/O separate from PostgreSQL's shared-buffer miss counters.
        # Rejected: treating all PostgreSQL read() calls as NVMe reads.
        cpu["deviceIo"] = (path.parent / "io.stat").read_text().splitlines()
        cpu["cpuPressure"] = (path.parent / "cpu.pressure").read_text().splitlines()
        out[role] = cpu
    return out


def run(out, containers, slot, source, attempt, sender):
    assert sys.platform == "linux" and __debug__
    assert re.fullmatch(r"tx2-dxscale1-v01-cold-[a-f0-9]{12}", slot)
    for _ in range(20):
        if os.sched_getaffinity(sender) == {9}:
            break
        time.sleep(.025)
    assert os.sched_getaffinity(sender) == {9}
    born, _ = proc_stat(sender)
    live = {c["Name"].removeprefix("/" + slot + "-"): c for c in json.loads(containers.read_bytes())}
    assert live.keys() == ROLE_MASKS.keys()
    roles = {role: cpu_file(container) for role, container in live.items()}
    bound = dict(slot=slot, source=source, attempt=attempt,
                 boot=Path("/proc/sys/kernel/random/boot_id").read_text().strip(),
                 ticks=os.sysconf("SC_CLK_TCK"), sender=sender, senderStartTicks=born,
                 roles={r: {"id": live[r]["Id"], "pid": p, "startTicks": start}
                        for r, (_, p, start) in roles.items()})
    argv = ["docker", "exec", "-i", "-e", "PGOPTIONS=-c statement_timeout=3000",
            slot + "-pg", "psql", "-XqAt", "-U", "postgres", "-d", "datomic",
            "-v", "ON_ERROR_STOP=1"]
    # [DX-PREP1] Why: reuse one read-only observer connection with one sample per second.
    # Rejected: launching a new connection for each counter or querying user rows.
    with subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True) as pg, \
            (out / "counters.ndjson").open("x", buffering=1) as sink:
        try:
            goal = time.monotonic_ns()
            started = False
            while True:
                left = time.monotonic_ns()
                done = (out / "sampling-stop.json").is_file()
                if not done:
                    assert proc_stat(sender)[0] == born and os.sched_getaffinity(sender) == {9}
                    sender_ticks = proc_stat(sender)[1]
                role_cpu = sample_roles(roles)
                pg.stdin.write(SQL)
                pg.stdin.flush()
                row = json.loads(pg.stdout.readline())
                right = time.monotonic_ns()
                wall = time.time_ns()
                assert row["durable"] == "on" and row["wal"] and row["checkpointer"] and row["io"]
                assert abs(int(row["wallNs"]) - wall) <= right - left + 100_000_000
                print(json.dumps(dict(monoNs=str(left), endMonoNs=str(right), wallNs=str(wall),
                                      senderTicks=sender_ticks, cpu=role_cpu, pg=row)), file=sink)
                if not started:
                    with (out / ".counters-ready.tmp").open("x") as ready:
                        json.dump(bound, ready)
                    (out / ".counters-ready.tmp").rename(out / "counters-ready.json")
                    started = True
                if done:
                    finished = json.loads((out / "sampling-stop.json").read_bytes())
                    assert (finished["slot"], finished["commit"], finished["nonce"]) == (slot, source, attempt)
                    break
                goal += 1_000_000_000
                time.sleep(max(0, (goal - time.monotonic_ns()) / 1e9))
        finally:
            pg.stdin.close()
            if pg.wait(timeout=10) != 0:
                raise RuntimeError("PostgreSQL counter observer failed")


if __name__ == "__main__":
    directory, containers, slot, source, attempt, sender = sys.argv[1:]
    run(Path(directory), Path(containers), slot, source, attempt, int(sender))
